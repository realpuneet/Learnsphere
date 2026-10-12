import crypto from 'crypto';
import { Payment } from '../models/Payment.js';
import { getRazorpay } from '../config/razorpay.js';
import { env, features } from '../config/env.js';
import { ApiError } from '../utils/ApiError.js';
import { logger } from '../utils/logger.js';

/** purpose -> { onPaid(payment), onFailed(payment) } so payment stays decoupled from domains */
const handlers = new Map();
export const registerPaymentHandler = (purpose, h) => handlers.set(purpose, h);

/** Create a gateway order (or a dry-run order when Razorpay keys are not configured). */
export async function createPaymentOrder({ user, purpose, refId, amount, receipt, meta }) {
  const userId = user._id || user;
  // refId (a course) is shared by many users, so reuse only this user's open order for the same amount
  const existing = await Payment.findOne({ user: userId, purpose, refId, amount, status: 'created' });
  if (existing) return toClient(existing);

  const rzp = getRazorpay();
  let providerOrderId;
  let dryRun = false;
  if (rzp) {
    const o = await rzp.orders.create({ amount: Math.round(amount * 100), currency: 'INR', receipt: String(receipt).slice(0, 40), notes: { purpose, refId: String(refId) } });
    providerOrderId = o.id;
  } else {
    dryRun = true;
    providerOrderId = `dry_${crypto.randomBytes(8).toString('hex')}`;
  }
  const p = await Payment.create({ user: userId, purpose, refId, amount, providerOrderId, dryRun, meta });
  return toClient(p);
}

const toClient = (p) => ({
  paymentId: p._id,
  providerOrderId: p.providerOrderId,
  amount: p.amount,
  currency: p.currency,
  keyId: env.RAZORPAY_KEY_ID || null,
  dryRun: p.dryRun,
});

const safeEqual = (a, b) => {
  const x = Buffer.from(String(a));
  const y = Buffer.from(String(b));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

/** Settle a payment exactly once (compare-and-set), then run the domain handler. */
async function settle(filter, providerPaymentId, signature) {
  const p = await Payment.findOneAndUpdate(
    { ...filter, status: { $ne: 'paid' } },
    { status: 'paid', providerPaymentId, signature, paidAt: new Date() },
    { new: true },
  );
  if (!p) return Payment.findOne(filter); // already paid -> idempotent
  await handlers.get(p.purpose)?.onPaid?.(p);
  return p;
}

/** Client-side verification after Razorpay checkout (HMAC of order_id|payment_id). */
export async function verifyCheckout({ userId, providerOrderId, providerPaymentId, signature }) {
  const p = await Payment.findOne({ providerOrderId, user: userId });
  if (!p) throw ApiError.notFound('Payment not found');
  if (p.dryRun) {
    if (features.razorpay) throw ApiError.badRequest('Dry-run payment not allowed');
  } else {
    const expected = crypto.createHmac('sha256', env.RAZORPAY_KEY_SECRET).update(`${providerOrderId}|${providerPaymentId}`).digest('hex');
    if (!safeEqual(expected, signature)) {
      await Payment.updateOne({ _id: p._id, status: 'created' }, { status: 'failed' });
      await handlers.get(p.purpose)?.onFailed?.(p);
      throw ApiError.badRequest('Payment signature mismatch', 'PAYMENT_SIGNATURE');
    }
  }
  return settle({ _id: p._id }, providerPaymentId || `dry_pay_${Date.now()}`, signature);
}

/** Webhook (raw body HMAC) – source of truth if the browser closes before verify. */
export async function handleWebhook(rawBody, signature) {
  if (!env.RAZORPAY_WEBHOOK_SECRET) throw ApiError.badRequest('Webhook not configured');
  const expected = crypto.createHmac('sha256', env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
  if (!signature || !safeEqual(expected, signature)) throw ApiError.unauthorized('Bad webhook signature', 'WEBHOOK_SIGNATURE');
  const evt = JSON.parse(rawBody.toString('utf8'));
  const ent = evt.payload?.payment?.entity;
  if (!ent) return { ignored: true };
  if (evt.event === 'payment.captured' || evt.event === 'order.paid') {
    await settle({ providerOrderId: ent.order_id }, ent.id, 'webhook');
  } else if (evt.event === 'payment.failed') {
    const p = await Payment.findOneAndUpdate({ providerOrderId: ent.order_id, status: 'created' }, { status: 'failed' });
    if (p) await handlers.get(p.purpose)?.onFailed?.(p);
  }
  return { ok: true };
}

/** Refund a paid payment (full by default). Dry-run payments are marked refunded locally. */
export async function refundPayment(paymentId, { amount, reason } = {}) {
  const p = await Payment.findById(paymentId);
  if (!p || p.status !== 'paid') return null;
  const refundAmount = Math.min(amount ?? p.amount, p.amount);
  let refundId = `dry_rf_${Date.now()}`;
  if (!p.dryRun) {
    try {
      const r = await getRazorpay().payments.refund(p.providerPaymentId, { amount: Math.round(refundAmount * 100), notes: { reason: reason || 'cancelled' } });
      refundId = r.id;
    } catch (e) {
      logger.error({ err: e.message, paymentId }, 'refund failed');
      throw ApiError.conflict('Refund could not be processed, please contact support', 'REFUND_FAILED');
    }
  }
  p.status = 'refunded';
  p.refund = { id: refundId, amount: refundAmount, at: new Date(), reason };
  await p.save();
  return p;
}
