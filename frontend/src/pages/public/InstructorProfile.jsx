import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Github, Globe, Linkedin, Twitter } from 'lucide-react';
import { get } from '../../lib/api.js';
import { safeHref as safeUrl } from '../../lib/markdown.js';
import { Avatar } from '../../components/ui/Card.jsx';
import { CardSkeletons, Empty, ErrorState } from '../../components/ui/Feedback.jsx';
import { CourseGrid } from '../../components/common/CourseCard.jsx';
import { Markdown } from '../../components/common/Markdown.jsx';
import { Pager } from '../../components/common/Pager.jsx';

const LINKS = [['website', Globe], ['linkedin', Linkedin], ['github', Github], ['twitter', Twitter]];

export default function InstructorProfile() {
  const { id } = useParams();
  const [page, setPage] = useState(1);
  const q = useQuery({ queryKey: ['instructor', id, page], queryFn: () => get(`/instructors/${id}`, { page, limit: 12 }), placeholderData: keepPreviousData });
  if (q.isLoading) return <div className="container py-8"><CardSkeletons count={2} className="h-40" /></div>;
  if (q.isError) return <div className="container py-8"><ErrorState error={q.error} onRetry={q.refetch} /></div>;
  const { instructor: u, courses } = q.data.data;
  return (
    <div className="container py-8 sm:py-12">
      <div className="flex flex-col items-start gap-5 sm:flex-row">
        <Avatar name={u.name} src={u.avatar} size={96} />
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wider text-brand-600">Instructor</p>
          <h1 className="font-display text-3xl font-extrabold text-ink-900">{u.name}</h1>
          {u.headline && <p className="mt-1 text-ink-600">{u.headline}</p>}
          <div className="mt-3 flex gap-2">
            {LINKS.map(([k, Icon]) => { const href = safeUrl(u.links?.[k]); return href ? <a key={k} href={href} target="_blank" rel="noopener noreferrer nofollow" aria-label={k} className="grid h-9 w-9 place-items-center rounded-xl bg-ink-100 text-ink-600 transition hover:bg-brand-50 hover:text-brand-700"><Icon className="h-4 w-4" /></a> : null; })}
          </div>
          {u.bio && <Markdown source={u.bio} className="mt-4 max-w-2xl" />}
        </div>
      </div>
      <h2 className="mt-10 font-display text-xl font-bold text-ink-900">Courses by {u.name.split(' ')[0]} ({q.data.meta?.total ?? courses.length})</h2>
      <div className="mt-4">{courses.length ? <CourseGrid courses={courses} /> : <Empty title="No published courses yet" />}</div>
      <Pager meta={q.data.meta} onPage={setPage} />
    </div>
  );
}
