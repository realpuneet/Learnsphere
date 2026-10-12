let loading;
function loadScript() {
  if (window.Razorpay) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://checkout.razorpay.com/v1/checkout.js';
      s.onload = resolve;
      s.onerror = () => reject(new Error('Could not load the payment window. Check your connection.'));
      document.body.appendChild(s);
    });
  }
  return loading;
}

/**
 * Open Razorpay checkout for a server-created order.
 * Resolves with { providerOrderId, providerPaymentId, signature } or rejects with Error('cancelled').
 * Dry-run orders (no gateway keys on the server) resolve immediately for local development.
 */
export async function payWithRazorpay({ payment, name = 'LearnSphere', description, prefill }) {
  if (payment.dryRun) return { providerOrderId: payment.providerOrderId };
  await loadScript();
  return new Promise((resolve, reject) => {
    const rz = new window.Razorpay({
      key: payment.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
      order_id: payment.providerOrderId,
      amount: Math.round(payment.amount * 100),
      currency: payment.currency || 'INR',
      name,
      description,
      prefill,
      theme: { color: '#5b3df5' },
      handler: (r) => resolve({ providerOrderId: r.razorpay_order_id, providerPaymentId: r.razorpay_payment_id, signature: r.razorpay_signature }),
      modal: { ondismiss: () => reject(new Error('cancelled')) },
    });
    rz.on('payment.failed', (e) => reject(new Error(e.error?.description || 'Payment failed')));
    rz.open();
  });
}
