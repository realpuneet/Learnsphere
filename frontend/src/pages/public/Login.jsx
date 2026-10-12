import { useState } from 'react';
import { useEffect } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { KeyRound } from 'lucide-react';
import { post } from '../../lib/api.js';
import { useAuth, homeFor } from '../../lib/authStore.js';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Form.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { SocialAuth } from '../../components/common/SocialAuth.jsx';
import { errMsg, toast } from '../../components/ui/Feedback.jsx';

const schema = z.object({ email: z.string().trim().email('Enter a valid email'), password: z.string().min(1, 'Enter your password') });

export default function Login() {
  const nav = useNavigate();
  const { state } = useLocation();
  const [sp] = useSearchParams();
  useEffect(() => {
    const e = sp.get('error');
    if (e) toast.error(({ social_cancelled: 'Sign-in was cancelled', account_inactive: 'Account is disabled' })[e] || 'Social sign-in failed, please try again');
  }, [sp]);
  const setSession = useAuth((s) => s.setSession);
  const [busy, setBusy] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const submit = async (v) => {
    setBusy(true);
    try {
      const { data } = await post('/auth/login', v);
      setSession(data);
      // only students are sent back to where they came from; staff land in their workspace
      const from = typeof state?.from === 'string' && state.from.startsWith('/') ? state.from : null;
      nav(from && data.user.role === 'student' ? from : homeFor(data.user.role), { replace: true });
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
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600"><KeyRound className="h-6 w-6" /></span>
          <h1 className="font-display text-2xl font-extrabold text-ink-900">Welcome back</h1>
          <p className="mt-1 text-sm text-ink-500">Log in to continue learning</p>
        </div>
        <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
          <Input label="Email" type="email" autoComplete="username" inputMode="email" error={errors.email?.message} {...register('email')} />
          <Input label="Password" type="password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
          <div className="-mt-2 text-right text-sm"><Link to="/forgot-password" className="font-semibold text-brand-700">Forgot password?</Link></div>
          <Button type="submit" size="lg" className="w-full" loading={busy}>Log in</Button>
        </form>
        <SocialAuth from={state?.from} />
        <p className="mt-6 text-center text-sm text-ink-500">New here? <Link to="/register" className="font-semibold text-brand-700">Create an account</Link></p>
      </Card>
    </div>
  );
}
