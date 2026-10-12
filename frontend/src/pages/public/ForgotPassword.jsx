import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MailQuestion } from 'lucide-react';
import { post } from '../../lib/api.js';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Form.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { errMsg, toast } from '../../components/ui/Feedback.jsx';

const schema = z.object({ email: z.string().trim().email('Enter a valid email') });

export default function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });
  const submit = async (v) => {
    setBusy(true);
    try {
      await post('/auth/forgot-password', v);
      setSent(true);
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
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600"><MailQuestion className="h-6 w-6" /></span>
          <h1 className="font-display text-2xl font-extrabold text-ink-900">Forgot password?</h1>
          <p className="mt-1 text-sm text-ink-500">We will email you a link to choose a new one</p>
        </div>
        {sent ? (
          <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">If that email has an account, a reset link is on its way. It stays valid for a short time and works once.</p>
        ) : (
          <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
            <Input label="Email" type="email" autoComplete="username" inputMode="email" error={errors.email?.message} {...register('email')} />
            <Button type="submit" size="lg" className="w-full" loading={busy}>Send reset link</Button>
          </form>
        )}
        <p className="mt-6 text-center text-sm text-ink-500"><Link to="/login" className="font-semibold text-brand-700">Back to log in</Link></p>
      </Card>
    </div>
  );
}
