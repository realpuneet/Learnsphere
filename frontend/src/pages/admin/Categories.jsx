import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2 } from 'lucide-react';
import { del, get, patch, post } from '../../lib/api.js';
import { Badge, Card } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Switch, Textarea } from '../../components/ui/Form.jsx';
import { ConfirmDialog, Modal } from '../../components/ui/Overlay.jsx';
import { CardSkeletons, Empty, ErrorState, errMsg, toast } from '../../components/ui/Feedback.jsx';

const blank = { name: '', description: '', icon: '', sortOrder: 0, isActive: true };

export default function AdminCategories() {
  const qc = useQueryClient();
  const [form, setForm] = useState(null);
  const [removing, setRemoving] = useState(null);
  const q = useQuery({ queryKey: ['admin-categories'], queryFn: () => get('/admin/categories') });
  const refresh = () => { qc.invalidateQueries({ queryKey: ['admin-categories'] }); qc.invalidateQueries({ queryKey: ['categories'] }); };
  const save = useMutation({
    mutationFn: () => {
      const body = { name: form.name.trim(), description: form.description.trim() || undefined, icon: form.icon.trim() || undefined, sortOrder: Number(form.sortOrder) || 0, isActive: form.isActive };
      return form._id ? patch(`/admin/categories/${form._id}`, body) : post('/admin/categories', body);
    },
    onSuccess: () => { toast.success('Category saved'); setForm(null); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const remove = useMutation({ mutationFn: (id) => del(`/admin/categories/${id}`), onSuccess: () => { setRemoving(null); refresh(); }, onError: (e) => { setRemoving(null); toast.error(errMsg(e)); } });
  const rows = q.data?.data || [];
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">Categories</h1>
        <Button onClick={() => setForm({ ...blank })}><Plus className="h-4 w-4" /> New category</Button>
      </div>
      {q.isLoading && <CardSkeletons count={4} className="h-16" />}
      {q.isError && <ErrorState error={q.error} onRetry={q.refetch} />}
      {!q.isLoading && !q.isError && rows.length === 0 && <Empty title="No categories" />}
      <div className="grid gap-2 md:grid-cols-2">
        {rows.map((c) => (
          <Card key={c._id} className="flex items-center gap-3 p-3.5">
            <div className="min-w-0 flex-1"><p className="flex items-center gap-2 font-semibold text-ink-900">{c.name}{!c.isActive && <Badge tone="gray">Hidden</Badge>}</p><p className="truncate text-xs text-ink-500">/{c.slug} · order {c.sortOrder}</p></div>
            <Button size="sm" variant="ghost" onClick={() => setForm({ ...blank, ...c, description: c.description || '', icon: c.icon || '' })}>Edit</Button>
            <Button size="sm" variant="ghost" aria-label={`Delete ${c.name}`} onClick={() => setRemoving(c)}><Trash2 className="h-4 w-4" /></Button>
          </Card>
        ))}
      </div>
      <Modal open={!!form} onClose={() => setForm(null)} title={form?._id ? 'Edit category' : 'New category'} footer={<Button className="w-full" disabled={!form || form.name.trim().length < 2} loading={save.isPending} onClick={() => save.mutate()}>Save</Button>}>
        {form && (
          <div className="space-y-3">
            <Input label="Name" required value={form.name} onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))} />
            <Textarea label="Description" rows={2} maxLength={300} value={form.description} onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="Icon name" hint="Optional" value={form.icon} onChange={(e) => setForm((s) => ({ ...s, icon: e.target.value }))} />
              <Input label="Sort order" type="number" value={form.sortOrder} onChange={(e) => setForm((s) => ({ ...s, sortOrder: e.target.value }))} />
            </div>
            <Switch checked={form.isActive} onChange={(v) => setForm((s) => ({ ...s, isActive: v }))} label="Visible in catalogue" />
          </div>
        )}
      </Modal>
      <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} danger loading={remove.isPending} title={`Delete ${removing?.name}?`} message="Categories that still have courses can't be deleted – hide them instead." confirmLabel="Delete" onConfirm={() => remove.mutate(removing._id)} />
    </div>
  );
}
