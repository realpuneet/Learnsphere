import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Award, Printer, Share2 } from 'lucide-react';
import { get } from '../../lib/api.js';
import { Button } from '../../components/ui/Button.jsx';
import { CardSkeletons, ErrorState, toast } from '../../components/ui/Feedback.jsx';
import { dateLong } from '../../lib/format.js';

export default function CertificateView() {
  const { id } = useParams();
  const q = useQuery({ queryKey: ['certificate', id], queryFn: () => get(`/me/certificates/${id}`) });
  if (q.isLoading) return <div className="container py-8"><CardSkeletons count={1} className="h-96" /></div>;
  if (q.isError) return <div className="container py-8"><ErrorState error={q.error} onRetry={q.refetch} /></div>;
  const c = q.data.data;
  const url = `${window.location.origin}/verify/${c.code}`;
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: c.courseTitle, text: `I completed ${c.courseTitle} on LearnSphere`, url });
      else { await navigator.clipboard.writeText(url); toast.success('Verification link copied'); }
    } catch { /* dismissed */ }
  };
  return (
    <div className="container max-w-4xl py-6 sm:py-10">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link to="/certificates" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="h-4 w-4" /> All certificates</Link>
        <div className="flex gap-2"><Button variant="secondary" size="sm" onClick={share}><Share2 className="h-4 w-4" /> Share</Button><Button size="sm" onClick={() => window.print()}><Printer className="h-4 w-4" /> Print / save PDF</Button></div>
      </div>
      <div className="certificate relative overflow-hidden rounded-3xl border-[10px] border-double border-brand-200 bg-white p-8 text-center shadow-pop sm:p-14">
        <Award className="mx-auto h-14 w-14 text-brand-600" aria-hidden />
        <p className="mt-4 text-xs font-bold uppercase tracking-[0.3em] text-brand-600">Certificate of completion</p>
        <p className="mt-8 text-sm text-ink-500">This certifies that</p>
        <h1 className="mt-2 font-display text-3xl font-extrabold text-ink-900 sm:text-5xl">{c.studentName}</h1>
        <p className="mt-6 text-sm text-ink-500">has successfully completed</p>
        <h2 className="mx-auto mt-2 max-w-2xl font-display text-xl font-bold text-brand-800 sm:text-3xl">{c.courseTitle}</h2>
        {c.hours > 0 && <p className="mt-2 text-sm text-ink-500">{c.hours} hours of learning</p>}
        <div className="mt-10 grid gap-6 text-sm sm:grid-cols-3">
          <div><p className="font-semibold text-ink-900">{dateLong(c.issuedAt)}</p><p className="text-xs text-ink-500">Date issued</p></div>
          <div><p className="font-display text-lg font-bold italic text-ink-900">{c.instructorName}</p><p className="text-xs text-ink-500">Instructor</p></div>
          <div><p className="font-mono font-semibold text-ink-900">{c.code}</p><p className="text-xs text-ink-500">Certificate ID</p></div>
        </div>
        <p className="mt-8 break-all text-xs text-ink-400">Verify at {url}</p>
      </div>
    </div>
  );
}
