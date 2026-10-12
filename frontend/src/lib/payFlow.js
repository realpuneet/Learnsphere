import { post } from './api.js';
import { payWithRazorpay } from './razorpay.js';

/** Open checkout for a server payment object and verify it. Resolves true on success, false if the user dismissed it. */
export async function runPayment(payment, { description, prefill } = {}) {
  try {
    const result = await payWithRazorpay({ payment, description, prefill });
    await post('/payments/verify', result);
    return true;
  } catch (e) {
    if (e.message === 'cancelled') return false;
    throw e;
  }
}
