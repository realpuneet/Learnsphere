import { z } from 'zod';

export const verify = z.object({ providerOrderId: z.string().min(5).max(100), providerPaymentId: z.string().max(100).optional(), signature: z.string().max(200).optional() });
