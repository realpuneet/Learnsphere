import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { get, put } from '../../lib/api.js';
import { Card, SectionTitle } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input, Switch } from '../../components/ui/Form.jsx';
import { CardSkeletons, ErrorState, errMsg, toast } from '../../components/ui/Feedback.jsx';

const NUM = ['platformFeePercent', 'gstPercent', 'refundWindowDays', 'refundMaxProgress'];

export default function AdminSettings() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin-settings'], queryFn: () => get('/admin/settings') });
  const [f, setF] = useState(null);
  useEffect(() => { if (q.data) setF(q.data.data); }, [q.data]);
  const save = useMutation({
    mutationFn: () => put('/admin/settings', { ...f, ...Object.fromEntries(NUM.map((k) => [k, Number(f[k])])) }),
    onSuccess: () => { toast.success('Settings saved'); qc.invalidateQueries({ queryKey: ['admin-settings'] }); qc.invalidateQueries({ queryKey: ['settings'] }); },
    onError: (e) => toast.error(errMsg(e)),
  });
  if (q.isLoading || !f) return <CardSkeletons count={3} className="h-40" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  return (
    <div className="max-w-2xl space-y-5">
      <h1 className="font-display text-2xl font-extrabold text-ink-900">Settings</h1>
      <Card className="space-y-4 p-5">
        <SectionTitle title="Site" />
        <Input label="Site name" maxLength={60} value={f.siteName} onChange={set('siteName')} />
        <Input label="Tagline" maxLength={160} value={f.tagline} onChange={set('tagline')} />
        <Input label="Support email" type="email" value={f.supportEmail} onChange={set('supportEmail')} />
      </Card>
      <Card className="space-y-4 p-5">
        <SectionTitle title="Money" subtitle="Applies to new purchases. Earlier orders keep their original split." />
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Platform fee (%)" type="number" min={0} max={90} value={f.platformFeePercent} onChange={set('platformFeePercent')} />
          <Input label="GST included in prices (%)" type="number" min={0} max={40} value={f.gstPercent} onChange={set('gstPercent')} />
          <Input label="Refund window (days)" type="number" min={0} max={90} value={f.refundWindowDays} onChange={set('refundWindowDays')} />
          <Input label="Refund allowed up to progress (%)" type="number" min={0} max={100} value={f.refundMaxProgress} onChange={set('refundMaxProgress')} />
        </div>
      </Card>
      <Card className="space-y-2 p-5">
        <SectionTitle title="Moderation" />
        <Switch checked={f.requireCourseApproval} onChange={(v) => setF((s) => ({ ...s, requireCourseApproval: v }))} label="Require admin approval for courses" description="Off = courses publish as soon as an approved instructor submits them" />
        <Switch checked={f.allowInstructorSignup} onChange={(v) => setF((s) => ({ ...s, allowInstructorSignup: v }))} label="Allow instructor sign-up" description="Off = only admins can create instructor accounts" />
      </Card>
      <Button size="lg" loading={save.isPending} onClick={() => save.mutate()}>Save settings</Button>
    </div>
  );
}
