import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { LogOut } from 'lucide-react';
import { patch, post, put } from '../../lib/api.js';
import { useAuth } from '../../lib/authStore.js';
import { disconnectSocket } from '../../lib/socket.js';
import { queryClient } from '../../lib/queryClient.js';
import { Button } from '../../components/ui/Button.jsx';
import { Card, SectionTitle } from '../../components/ui/Card.jsx';
import { Input, Switch, Textarea } from '../../components/ui/Form.jsx';
import { ImageUpload } from '../../components/ui/ImageUpload.jsx';
import { errMsg, toast } from '../../components/ui/Feedback.jsx';

const LINKS = ['website', 'linkedin', 'github', 'twitter'];

function ProfileForm({ user }) {
  const setUser = useAuth((s) => s.setUser);
  const teacher = user.role !== 'student';
  const [f, setF] = useState({ name: user.name || '', phone: user.phone || '', avatar: user.avatar || null, headline: user.headline || '', bio: user.bio || '', links: { website: '', linkedin: '', github: '', twitter: '', ...(user.links || {}) } });
  const save = useMutation({
    mutationFn: () => patch('/me', { name: f.name.trim(), phone: f.phone.trim() || undefined, avatar: f.avatar || null, headline: f.headline.trim(), bio: f.bio.trim(), links: Object.fromEntries(LINKS.map((k) => [k, f.links[k].trim()])) }),
    onSuccess: (r) => { setUser(r.data); toast.success('Profile saved'); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  return (
    <Card className="space-y-4 p-5">
      <SectionTitle title="Profile" />
      <ImageUpload label="Photo" shape="round" value={f.avatar} onChange={(v) => setF((s) => ({ ...s, avatar: v }))} />
      <Input label="Full name" required value={f.name} onChange={set('name')} />
      <Input label="Email" value={user.email} disabled hint="Email can't be changed" />
      <Input label="Phone" type="tel" value={f.phone} onChange={set('phone')} />
      {teacher && (
        <>
          <Input label="Headline" placeholder="e.g. Senior engineer at Acme" maxLength={120} value={f.headline} onChange={set('headline')} />
          <Textarea label="About you" rows={5} maxLength={2000} hint="Shown on your public instructor page. Markdown supported." value={f.bio} onChange={set('bio')} />
          <div className="grid gap-3 sm:grid-cols-2">
            {LINKS.map((k) => <Input key={k} label={k[0].toUpperCase() + k.slice(1)} placeholder="https://" value={f.links[k]} onChange={(e) => setF((s) => ({ ...s, links: { ...s.links, [k]: e.target.value } }))} />)}
          </div>
        </>
      )}
      <Button loading={save.isPending} disabled={f.name.trim().length < 2} onClick={() => save.mutate()}>Save changes</Button>
    </Card>
  );
}

function Prefs({ user }) {
  const setUser = useAuth((s) => s.setUser);
  const prefs = { emailUpdates: true, emailNudges: true, emailQa: true, ...(user.prefs || {}) };
  const save = useMutation({
    mutationFn: (patchBody) => put('/me/prefs', patchBody),
    onSuccess: (r) => setUser(r.data),
    onError: (e) => toast.error(errMsg(e)),
  });
  const row = (k, label, description) => <Switch checked={prefs[k]} disabled={save.isPending} onChange={(v) => save.mutate({ [k]: v })} label={label} description={description} />;
  return (
    <Card className="space-y-4 p-5">
      <SectionTitle title="Email notifications" subtitle="Optional. You always see everything inside the app." />
      {row('emailUpdates', 'Enrolments & certificates', 'Receipts, course approvals and certificate emails')}
      {row('emailNudges', 'Learning reminders', 'A nudge if you pause a course for a while')}
      {row('emailQa', 'Q&A replies', 'When someone answers your question')}
    </Card>
  );
}

function Password({ onChanged }) {
  const [f, setF] = useState({ currentPassword: '', newPassword: '' });
  const save = useMutation({
    mutationFn: () => post('/me/password', { ...f, currentPassword: f.currentPassword || undefined }),
    onSuccess: () => { toast.success('Password changed – please log in again'); setF({ currentPassword: '', newPassword: '' }); onChanged(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const ok = f.newPassword.length >= 8 && /[A-Za-z]/.test(f.newPassword) && /\d/.test(f.newPassword);
  return (
    <Card className="space-y-4 p-5">
      <SectionTitle title="Change password" />
      <Input label="Current password" hint="Leave blank if you signed up with Google or LinkedIn and never set a password" type="password" autoComplete="current-password" value={f.currentPassword} onChange={(e) => setF((s) => ({ ...s, currentPassword: e.target.value }))} />
      <Input label="New password" type="password" autoComplete="new-password" hint="At least 8 characters with a letter and a number" value={f.newPassword} onChange={(e) => setF((s) => ({ ...s, newPassword: e.target.value }))} />
      <Button variant="secondary" disabled={!ok} loading={save.isPending} onClick={() => save.mutate()}>Update password</Button>
    </Card>
  );
}

export default function Profile() {
  const user = useAuth((s) => s.user);
  const clear = useAuth((s) => s.clear);
  const nav = useNavigate();
  const logout = async () => {
    await post('/auth/logout').catch(() => {});
    disconnectSocket();
    clear();
    queryClient.clear();
    nav('/login');
  };
  return (
    <div className="container max-w-2xl space-y-5 py-6 sm:py-10">
      <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">Profile & settings</h1>
      {user.role === 'instructor' && !user.instructor?.approved && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Your instructor account is awaiting approval. You can draft courses now and submit them for review once approved.</p>}
      <ProfileForm user={user} />
      <Prefs user={user} />
      <Password onChanged={logout} />
      <Button variant="secondary" className="w-full sm:hidden" onClick={logout}><LogOut className="h-4 w-4" /> Log out</Button>
    </div>
  );
}
