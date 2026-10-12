import { z } from 'zod';

const password = z.string().min(8, 'At least 8 characters').max(72).regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number');

export const register = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password,
  asInstructor: z.boolean().optional(),
});
export const login = z.object({ email: z.string().trim().toLowerCase().email(), password: z.string().min(1) });
export const changePassword = z.object({ currentPassword: z.string().optional(), newPassword: password });
export const forgotPassword = z.object({ email: z.string().trim().toLowerCase().email() });
export const resetPassword = z.object({ token: z.string().min(20).max(200), password });
export const googleLogin = z.object({ credential: z.string().min(20).max(4000) });
export { password };
