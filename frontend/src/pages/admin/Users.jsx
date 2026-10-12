import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { BadgeCheck, UserPlus } from 'lucide-react';
import { get, patch, post } from '../../lib/api.js';
import { useDebounce } from '../../hooks/useDebounce.js';
import { useAuth } from '../../lib/authStore.js';
import { Avatar, Badge, Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Select, Switch } from '../../components/ui/Form.jsx';
import { Tabs } from '../../components/ui/Tabs.jsx';
import { Modal } from '../../components/ui/Overlay.jsx';
import { CardSkeletons, Empty, ErrorState, errMsg, toast } from '../../components/ui/Feedback.jsx';
import { Pager } from '../../components/common/Pager.jsx';
import { dateShort } from '../../lib/format.js';

const TABS = [{ value: '', label: 'All' }, { value: 'student', label: 'Students' }, { value: 'instructor', label: 'Instructors' }, { value: 'pending', label: 'Pending approval' }, { value: 'admin', label: 'Admins' }];
const blank = { name: '', email: '', password: '', role: 'instructor' };

export default function AdminUsers() {
  const qc = useQueryClient();
  const me = useAuth((s) => s.user);
  const [sp] = useSearchParams();
  const [tab, setTab] = useState(sp.get('pending') ? 'pending' : '');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [form, setForm] = useState(null);
  const dq = useDebounce(search);
  const params = { page, limit: 20, q: dq || undefined, ...(tab === 'pending' ? { pending: 'true' } : tab ? { role: tab } : {}) };
  const q = useQuery({ queryKey: ['admin-users', params], queryFn: () => get('/admin/users', params), placeholderData: keepPreviousData });
  const refresh = () => qc.invalidateQueries({ queryKey: ['admin-users'] });

  const toggle = useMutation({ mutationFn: ({ id, isActive }) => patch(`/admin/users/${id}/active`, { isActive }), onSuccess: refresh, onError: (e) => toast.error(errMsg(e)) });
  const approve = useMutation({ mutationFn: ({ id, approved }) => patch(`/admin/users/${id}/instructor`, { approved }), onSuccess: () => { refresh(); qc.invalidateQueries({ queryKey: ['admin-dashboard'] }); }, onError: (e) => toast.error(errMsg(e)) });
  const create = useMutation({
    mutationFn: () => post('/admin/users', { ...form, name: form.name.trim() }),
    onSuccess: () => { toast.success('Account created'); setForm(null); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const rows = q.data?.data || [];
  const valid = form && form.name.trim().length >= 2 && /^\S+@\S+\.\S+$/.test(form.email) && form.password.length >= 8 && /[A-Za-z]/.test(form.password) && /\d/.test(form.password);
  const f = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));
  const myId = String(me?.id || me?._id);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">Users</h1>
        <Button onClick={() => setForm({ ...blank })}><UserPlus className="h-4 w-4" /> Add user</Button>
      </div>
      <Tabs tabs={TABS} value={tab} onChange={(v) => { setTab(v); setPage(1); }} />
      <Input aria-label="Search users" placeholder="Search name or email…" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
      {q.isLoading && <CardSkeletons count={5} className="h-16" />}
      {q.isError && <ErrorState error={q.error} onRetry={q.refetch} />}
      {!q.isLoading && !q.isError && rows.length === 0 && <Empty title="No users found" />}
      <div className="space-y-2">
        {rows.map((u) => (
          <Card key={u._id} className="flex flex-wrap items-center gap-3 p-3.5">
            <Avatar name={u.name} src={u.avatar} size={42} />
            <div className="min-w-0 flex-1">
              <p className="flex flex-wrap items-center gap-2 truncate font-semibold text-ink-900">{u.name}<Badge tone={u.role === 'admin' ? 'coral' : u.role === 'instructor' ? 'brand' : 'gray'}>{u.role}</Badge>{u.role === 'instructor' && !u.instructor?.approved && <Badge tone="amber">Pending</Badge>}</p>
              <p className="truncate text-sm text-ink-500">{u.email} · joined {dateShort(u.createdAt)}</p>
            </div>
            {u.role === 'instructor' && (
              <Button size="sm" variant={u.instructor?.approved ? 'secondary' : 'primary'} loading={approve.isPending && approve.variables?.id === u._id} onClick={() => approve.mutate({ id: u._id, approved: !u.instructor?.approved })}>
                <BadgeCheck className="h-4 w-4" /> {u.instructor?.approved ? 'Revoke' : 'Approve'}
              </Button>
            )}
            <Switch checked={u.isActive !== false} disabled={String(u._id) === myId || toggle.isPending} onChange={(v) => toggle.mutate({ id: u._id, isActive: v })} label={<span className="sr-only">Active</span>} />
          </Card>
        ))}
      </div>
      <Pager meta={q.data?.meta} onPage={setPage} />

      <Modal open={!!form} onClose={() => setForm(null)} title="Add user" footer={<Button className="w-full" disabled={!valid} loading={create.isPending} onClick={() => create.mutate()}>Create account</Button>}>
        {form && (
          <div className="space-y-3">
            <Select label="Role" value={form.role} onChange={f('role')}><option value="instructor">Instructor (pre-approved)</option><option value="student">Student</option><option value="admin">Admin</option></Select>
            <Input label="Full name" required value={form.name} onChange={f('name')} />
            <Input label="Email" type="email" required value={form.email} onChange={f('email')} />
            <Input label="Temporary password" required hint="8+ characters with a letter and a number" value={form.password} onChange={f('password')} />
          </div>
        )}
      </Modal>
    </div>
  );
}
