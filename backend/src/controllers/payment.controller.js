import { asyncHandler } from '../utils/asyncHandler.js';
import { ok } from '../utils/ApiResponse.js';
import * as payments from '../services/payment.service.js';
import '../services/enrollment.service.js'; // registers the course payment handler

export const verifyPayment = asyncHandler(async (req, res) => {
  const p = await payments.verifyCheckout({ userId: req.user._id, ...req.body });
  return ok(res, { status: p.status, refId: p.refId }, 'Payment verified');
});
export const webhook = asyncHandler(async (req, res) => {
  await payments.handleWebhook(req.body, req.headers['x-razorpay-signature']);
  res.json({ received: true });
});
