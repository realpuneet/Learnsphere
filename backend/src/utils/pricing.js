import { round2 } from './helpers.js';

/**
 * Checkout maths (rupees). Prices are GST-inclusive display prices; we back out the GST component for the invoice.
 * coupon: { type: 'percent'|'flat', value, maxDiscount? } or null.
 */
export function computeCheckout({ price, coupon, gstPercent = 18 }) {
  const base = Math.max(0, round2(price));
  let discount = 0;
  if (coupon && base > 0) {
    discount = coupon.type === 'percent' ? (base * coupon.value) / 100 : coupon.value;
    if (coupon.maxDiscount) discount = Math.min(discount, coupon.maxDiscount);
    discount = Math.min(round2(discount), base);
  }
  const total = round2(base - discount);
  const gst = round2(total - total / (1 + gstPercent / 100));
  return { price: base, discount, total, gst, net: round2(total - gst) };
}

/** Instructor earnings for a paid enrollment after GST and platform fee. */
export function splitRevenue({ total, gstPercent = 18, feePercent = 20 }) {
  const net = round2(total - (total - total / (1 + gstPercent / 100)));
  const platform = round2((net * feePercent) / 100);
  return { net, platform, instructor: round2(net - platform) };
}
