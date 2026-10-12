import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { LockKeyhole } from 'lucide-react';
import { post } from '../../lib/api.js';
import { useAuth, homeFor } from '../../lib/authStore.js';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Form.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { errMsg, toast } from '../../components/ui/Feedback.jsx';

const schema = z
  .object({
    password: z.string().min(8, 'At least 8 characters').regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });

export default function ResetPassword() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const token = sp.get('token');
  const setSession = useAuth((s) => s.setSession);
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const submit = async (v) => {
    setBusy(true);
    try {
      const { data } = await post('/auth/reset-password', { token, password: v.password });
      setSession(data);
      toast.success('Password updated');
      nav(homeFor(data.user.role), { replace: true });
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="container flex min-h-[calc(100vh-8rem)] items-center justify-center py-8">
      <Card className="w-full max-w-md p-6 sm:p-8">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600"><LockKeyhole className="h-6 w-6" /></span>
          <h1 className="font-display text-2xl font-extrabold text-ink-900">Choose a new password</h1>
        </div>
        {token ? (
          <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
            <Input label="New password" type="password" autoComplete="new-password" hint="At least 8 characters with a letter and a number" error={errors.password?.message} {...register('password')} />
            <Input label="Confirm password" type="password" autoComplete="new-password" error={errors.confirm?.message} {...register('confirm')} />
            <Button type="submit" size="lg" className="w-full" loading={busy}>Update password</Button>
          </form>
        ) : (
          <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">This reset link is incomplete. <Link to="/forgot-password" className="font-semibold underline">Request a new one</Link>.</p>
        )}
      </Card>
    </div>
  );
}
