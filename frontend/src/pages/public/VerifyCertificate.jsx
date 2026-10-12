import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { BadgeCheck, ShieldAlert, ShieldCheck } from 'lucide-react';
import { get } from '../../lib/api.js';
import { Card, KeyValue } from '../../components/ui/Card.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { Input } from '../../components/ui/Form.jsx';
import { CardSkeletons, ErrorState } from '../../components/ui/Feedback.jsx';
import { dateLong } from '../../lib/format.js';

function Result({ code }) {
  const q = useQuery({ queryKey: ['verify', code], queryFn: () => get(`/certificates/verify/${encodeURIComponent(code)}`), retry: false });
  if (q.isLoading) return <CardSkeletons count={1} className="h-40" />;
  if (q.isError) return <ErrorState error={q.error} onRetry={q.refetch} />;
  const c = q.data.data;
  return (
    <Card className="p-5 sm:p-6">
      <div className={`mb-4 flex items-center gap-3 rounded-xl p-3 ${c.valid ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-700'}`}>
        {c.valid ? <ShieldCheck className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
        <div>
          <p className="font-bold">{c.valid ? 'Authentic certificate' : 'Signature mismatch'}</p>
          <p className="text-sm">{c.valid ? 'This certificate was issued by LearnSphere.' : 'This record does not match its signature. Do not trust it.'}</p>
        </div>
      </div>
      <dl className="divide-y divide-ink-100">
        <KeyValue label="Certificate ID">{c.code}</KeyValue>
        <KeyValue label="Awarded to">{c.studentName}</KeyValue>
        <KeyValue label="Course">{c.courseTitle}</KeyValue>
        <KeyValue label="Instructor">{c.instructorName}</KeyValue>
        {c.hours > 0 && <KeyValue label="Course length">{c.hours} hours</KeyValue>}
        <KeyValue label="Issued on">{dateLong(c.issuedAt)}</KeyValue>
      </dl>
    </Card>
  );
}

export default function VerifyCertificate() {
  const { code } = useParams();
  const nav = useNavigate();
  const [val, setVal] = useState(code || '');
  return (
    <div className="container max-w-xl py-8 sm:py-12">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-brand-50 text-brand-600"><BadgeCheck className="h-6 w-6" /></span>
        <h1 className="font-display text-2xl font-extrabold text-ink-900 sm:text-3xl">Verify a certificate</h1>
        <p className="mt-1 text-sm text-ink-500">Enter the certificate ID printed on it.</p>
      </div>
      <form className="mb-6 flex gap-2" onSubmit={(e) => { e.preventDefault(); if (val.trim()) nav(`/verify/${encodeURIComponent(val.trim().toUpperCase())}`); }}>
        <Input aria-label="Certificate ID" placeholder="LS-XXXXXXXXXX" value={val} onChange={(e) => setVal(e.target.value)} wrapperClass="flex-1" />
        <Button type="submit" disabled={!val.trim()}>Verify</Button>
      </form>
      {code && <Result code={code} />}
    </div>
  );
}
