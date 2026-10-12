import test from 'node:test';
import assert from 'node:assert/strict';
import { computeCheckout, splitRevenue } from '../../src/utils/pricing.js';

test('no coupon: GST is backed out of the inclusive price', () => {
  const r = computeCheckout({ price: 1180, gstPercent: 18 });
  assert.equal(r.total, 1180);
  assert.equal(r.gst, 180);
  assert.equal(r.net, 1000);
});
test('percent coupon with a cap', () => {
  const r = computeCheckout({ price: 2000, coupon: { type: 'percent', value: 50, maxDiscount: 500 } });
  assert.equal(r.discount, 500);
  assert.equal(r.total, 1500);
});
test('flat coupon cannot make the price negative; 100% off is free', () => {
  assert.equal(computeCheckout({ price: 300, coupon: { type: 'flat', value: 999 } }).total, 0);
  assert.equal(computeCheckout({ price: 300, coupon: { type: 'percent', value: 100 } }).total, 0);
});
test('free course stays free and ignores coupons', () => {
  const r = computeCheckout({ price: 0, coupon: { type: 'flat', value: 100 } });
  assert.deepEqual([r.price, r.discount, r.total, r.gst], [0, 0, 0, 0]);
});
test('revenue split: instructor share = net of GST minus platform fee', () => {
  const s = splitRevenue({ total: 1180, gstPercent: 18, feePercent: 20 });
  assert.equal(s.net, 1000);
  assert.equal(s.platform, 200);
  assert.equal(s.instructor, 800);
});
test('revenue split is linear (summing first gives the same answer)', () => {
  const a = splitRevenue({ total: 590, gstPercent: 18, feePercent: 20 });
  const b = splitRevenue({ total: 590, gstPercent: 18, feePercent: 20 });
  const sum = splitRevenue({ total: 1180, gstPercent: 18, feePercent: 20 });
  assert.ok(Math.abs(a.instructor + b.instructor - sum.instructor) < 0.02);
});
