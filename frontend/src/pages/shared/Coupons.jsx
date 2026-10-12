import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Ticket, Trash2 } from 'lucide-react';
import { del, get, patch, post } from '../../lib/api.js';
import { Badge, Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Select, Switch } from '../../components/ui/Form.jsx';
import { ConfirmDialog, Modal } from '../../components/ui/Overlay.jsx';
import { CardSkeletons, Empty, ErrorState, errMsg, toast } from '../../components/ui/Feedback.jsx';
import { dateShort, inr } from '../../lib/format.js';

const blank = { code: '', type: 'percent', value: 10, maxDiscount: '', course: '', maxUses: 0, expiresAt: '', isActive: true };

/** scope: 'instructor' (course-scoped only) or 'admin' (site-wide allowed) */
export default function Coupons({ scope = 'instructor' }) {
  const qc = useQueryClient();
  const base = `/${scope}/coupons`;
  const [form, setForm] = useState(null);
  const [removing, setRemoving] = useState(null);
  const list = useQuery({ queryKey: ['coupons', scope], queryFn: () => get(base) });
  const courses = useQuery({ queryKey: ['coupon-courses', scope], queryFn: () => get(`/${scope}/courses`, { limit: 100, status: 'published' }) });
  const refresh = () => qc.invalidateQueries({ queryKey: ['coupons', scope] });

  const save = useMutation({
    mutationFn: () => {
      const body = { type: form.type, value: Number(form.value), maxUses: Number(form.maxUses) || 0, isActive: form.isActive, ...(form.maxDiscount ? { maxDiscount: Number(form.maxDiscount) } : {}), ...(form.course ? { course: form.course } : {}), ...(form.expiresAt ? { expiresAt: form.expiresAt } : {}) };
      return form.id ? patch(`${base}/${form.id}`, body) : post(base, { code: form.code.trim(), ...body });
    },
    onSuccess: () => { toast.success('Coupon saved'); setForm(null); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const toggle = useMutation({ mutationFn: (c) => patch(`${base}/${c._id}`, { isActive: !c.isActive }), onSuccess: refresh, onError: (e) => toast.error(errMsg(e)) });
  const remove = useMutation({ mutationFn: (id) => del(`${base}/${id}`), onSuccess: () => { setRemoving(null); refresh(); }, onError: (e) => { setRemoving(null); toast.error(errMsg(e)); } });

  const rows = list.data?.data || [];
  const f = (k) => (e) => setForm((s) => ({ ...s, [k]: e.target.value }));
  const valid = form && (form.id || /^[A-Za-z0-9_-]{3,24}$/.test(form.code.trim())) && Number(form.value) >= 1 && (form.type !== 'percent' || Number(form.value) <= 100) && (scope === 'admin' || form.course);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">Coupons</h1>
        <Button onClick={() => setForm({ ...blank })}><Plus className="h-4 w-4" /> New coupon</Button>
      </div>
      {list.isLoading && <CardSkeletons count={3} className="h-20" />}
      {list.isError && <ErrorState error={list.error} onRetry={list.refetch} />}
      {!list.isLoading && !list.isError && rows.length === 0 && <Empty icon={Ticket} title="No coupons yet" text={scope === 'instructor' ? 'Create a discount code for one of your courses.' : 'Create a site-wide or course-specific discount code.'} />}
      <div className="grid gap-3 md:grid-cols-2">
        {rows.map((c) => {
          const expired = c.expiresAt && new Date(c.expiresAt) < new Date();
          return (
            <Card key={c._id} className="space-y-2 p-4">
              <div className="flex items-start justify-between gap-2">
                <div><p className="font-mono text-lg font-extrabold tracking-wide text-ink-900">{c.code}</p><p className="text-sm text-ink-600">{c.type === 'percent' ? `${c.value}% off` : `${inr(c.value)} off`}{c.maxDiscount ? ` (max ${inr(c.maxDiscount)})` : ''}</p></div>
                <div className="flex flex-wrap justify-end gap-1">{expired && <Badge tone="red">Expired</Badge>}{!c.isActive && <Badge tone="gray">Off</Badge>}{c.maxUses > 0 && c.used >= c.maxUses && <Badge tone="amber">Used up</Badge>}</div>
              </div>
              <p className="text-xs text-ink-500">{c.course?.title ? `Course: ${c.course.title}` : 'All courses'} · used {c.used}{c.maxUses ? `/${c.maxUses}` : ''}{c.expiresAt ? ` · expires ${dateShort(c.expiresAt)}` : ''}</p>
              <div className="flex items-center justify-between pt-1">
                <Switch checked={c.isActive} disabled={toggle.isPending} onChange={() => toggle.mutate(c)} label={<span className="text-sm">Active</span>} />
                <div className="flex gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setForm({ ...blank, ...c, course: c.course?._id || '', maxDiscount: c.maxDiscount || '', expiresAt: c.expiresAt ? c.expiresAt.slice(0, 10) : '', id: c._id })}>Edit</Button>
                  <Button size="sm" variant="ghost" aria-label="Delete coupon" onClick={() => setRemoving(c._id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? `Edit ${form.code}` : 'New coupon'} footer={<Button className="w-full" disabled={!valid} loading={save.isPending} onClick={() => save.mutate()}>Save coupon</Button>}>
        {form && (
          <div className="space-y-3">
            <Input label="Code" required disabled={!!form.id} placeholder="LAUNCH50" hint="3–24 letters, numbers, - or _" value={form.code} onChange={f('code')} />
            <div className="grid grid-cols-2 gap-3">
              <Select label="Type" value={form.type} onChange={f('type')}><option value="percent">Percent</option><option value="flat">Flat ₹</option></Select>
              <Input label={form.type === 'percent' ? 'Percent off' : 'Amount off (₹)'} type="number" min={1} value={form.value} onChange={f('value')} />
            </div>
            {form.type === 'percent' && <Input label="Max discount (₹)" type="number" min={0} hint="Optional cap" value={form.maxDiscount} onChange={f('maxDiscount')} />}
            <Select label={scope === 'admin' ? 'Course (optional)' : 'Course'} required={scope === 'instructor'} value={form.course} onChange={f('course')}>
              <option value="">{scope === 'admin' ? 'All courses' : 'Choose a course…'}</option>
              {(courses.data?.data || []).map((c) => <option key={c._id} value={c._id}>{c.title}</option>)}
            </Select>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Max uses" type="number" min={0} hint="0 = unlimited" value={form.maxUses} onChange={f('maxUses')} />
              <Input label="Expires on" type="date" value={form.expiresAt} onChange={f('expiresAt')} />
            </div>
            <Switch checked={form.isActive} onChange={(v) => setForm((s) => ({ ...s, isActive: v }))} label="Active" />
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} danger title="Delete coupon?" message="Existing enrolments are not affected." confirmLabel="Delete" loading={remove.isPending} onConfirm={() => remove.mutate(removing)} />
    </div>
  );
}
