import { Link } from 'react-router-dom';
import { Clock, PlayCircle, Users } from 'lucide-react';
import { ik } from '../../lib/imagekit.js';
import { cn } from '../../lib/cn.js';
import { discountPct, duration, inr, LEVEL_LABEL, compact } from '../../lib/format.js';
import { Badge } from '../ui/Card.jsx';
import { RatingSummary } from './Rating.jsx';

const GRADIENTS = [
  'from-brand-600 to-brand-400', 'from-coral-500 to-amber-300', 'from-emerald-600 to-teal-300', 'from-sky-600 to-cyan-300', 'from-fuchsia-600 to-pink-300', 'from-indigo-700 to-sky-400',
];
const hash = (s = '') => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Thumbnail with a deterministic gradient fallback so courses without images still look intentional. */
export function Thumb({ course, className, width = 480 }) {
  const g = GRADIENTS[hash(course?.title) % GRADIENTS.length];
  return course?.thumbnail ? (
    <img src={ik(course.thumbnail, width)} alt="" loading="lazy" className={cn('h-full w-full object-cover', className)} />
  ) : (
    <div className={cn('flex h-full w-full items-end bg-gradient-to-br p-4', g, className)} aria-hidden>
      <span className="font-display text-lg font-extrabold leading-tight text-white/95 drop-shadow">{course?.title}</span>
    </div>
  );
}

export function Price({ price, mrp, className, size = 'md' }) {
  const off = discountPct(price, mrp);
  return (
    <span className={cn('inline-flex flex-wrap items-baseline gap-x-2', className)}>
      <b className={cn('font-display text-ink-900', size === 'lg' ? 'text-3xl' : 'text-lg')}>{price ? inr(price) : 'Free'}</b>
      {off > 0 && <><s className="text-sm text-ink-400">{inr(mrp)}</s><span className="text-xs font-bold text-emerald-600">{off}% off</span></>}
    </span>
  );
}

export function CourseCard({ course }) {
  const c = course;
  return (
    <Link to={`/courses/${c.slug}`} className="group flex h-full flex-col overflow-hidden rounded-2xl border border-ink-100 bg-white shadow-card transition hover:-translate-y-0.5 hover:shadow-pop">
      <div className="relative aspect-video overflow-hidden bg-ink-100">
        <Thumb course={c} className="transition duration-500 group-hover:scale-105" />
        {c.featured && <span className="absolute left-3 top-3 rounded-full bg-coral-500 px-2.5 py-0.5 text-[11px] font-bold text-white shadow">Featured</span>}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <h3 className="line-clamp-2 font-display font-bold leading-snug text-ink-900 group-hover:text-brand-700">{c.title}</h3>
        <p className="line-clamp-1 text-sm text-ink-500">{c.instructor?.name}</p>
        <RatingSummary avg={c.stats?.ratingAvg} count={c.stats?.ratingCount} />
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
          <span className="inline-flex items-center gap-1"><PlayCircle className="h-3.5 w-3.5" />{c.stats?.lessons || 0} lessons</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5" />{duration(c.stats?.durationSec)}</span>
          {c.stats?.enrolled > 0 && <span className="inline-flex items-center gap-1"><Users className="h-3.5 w-3.5" />{compact(c.stats.enrolled)}</span>}
        </div>
        <div className="mt-auto flex items-center justify-between pt-2">
          <Price price={c.price} mrp={c.mrp} />
          {c.level && <Badge tone="gray">{LEVEL_LABEL[c.level]}</Badge>}
        </div>
      </div>
    </Link>
  );
}

export function CourseGrid({ courses, className }) {
  return <div className={cn('grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4', className)}>{courses.map((c) => <CourseCard key={c._id} course={c} />)}</div>;
}

export function ProgressBar({ value = 0, className, label }) {
  return (
    <div className={className}>
      <div className="h-2 overflow-hidden rounded-full bg-ink-100" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100} aria-label={label || 'Progress'}>
        <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-300 transition-all duration-500" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
