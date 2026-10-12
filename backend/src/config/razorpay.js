import Razorpay from 'razorpay';
import { env, features } from './env.js';

let instance;
export function getRazorpay() {
  if (!features.razorpay) return null;
  if (!instance) instance = new Razorpay({ key_id: env.RAZORPAY_KEY_ID, key_secret: env.RAZORPAY_KEY_SECRET });
  return instance;
}
