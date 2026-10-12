import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { UserPlus } from 'lucide-react';
import { post } from '../../lib/api.js';
import { useAuth, homeFor } from '../../lib/authStore.js';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Switch } from '../../components/ui/Form.jsx';
import { Card } from '../../components/ui/Card.jsx';
import { SocialAuth } from '../../components/common/SocialAuth.jsx';
import { errMsg, toast } from '../../components/ui/Feedback.jsx';

const schema = z.object({
  name: z.string().trim().min(2, 'Enter your full name'),
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(8, 'At least 8 characters').regex(/[A-Za-z]/, 'Include a letter').regex(/\d/, 'Include a number'),
});

export default function Register() {
  const nav = useNavigate();
  const [sp] = useSearchParams();
  const setSession = useAuth((s) => s.setSession);
  const [busy, setBusy] = useState(false);
  const [teach, setTeach] = useState(sp.get('teach') === '1');
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const submit = async (v) => {
    setBusy(true);
    try {
      const { data } = await post('/auth/register', { ...v, asInstructor: teach || undefined });
      setSession(data);
      toast.success(teach ? 'Account created – you can start drafting courses' : 'Account created');
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
          <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600"><UserPlus className="h-6 w-6" /></span>
          <h1 className="font-display text-2xl font-extrabold text-ink-900">{teach ? 'Become an instructor' : 'Create your account'}</h1>
          <p className="mt-1 text-sm text-ink-500">{teach ? 'Draft courses right away – an admin approves you before you publish' : 'Learn new skills at your own pace'}</p>
        </div>
        <form onSubmit={handleSubmit(submit)} className="space-y-4" noValidate>
          <Input label="Full name" autoComplete="name" required error={errors.name?.message} {...register('name')} />
          <Input label="Email" type="email" autoComplete="email" required error={errors.email?.message} {...register('email')} />
          <Input label="Password" type="password" autoComplete="new-password" required error={errors.password?.message} {...register('password')} />
          <Switch checked={teach} onChange={setTeach} label="I want to teach on LearnSphere" />
          <Button type="submit" size="lg" className="w-full" loading={busy}>Create account</Button>
        </form>
        <SocialAuth />
        <p className="mt-6 text-center text-sm text-ink-500">Already registered? <Link to="/login" className="font-semibold text-brand-700">Log in</Link></p>
      </Card>
    </div>
  );
}
