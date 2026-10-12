import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../lib/cn.js';

/** Read-only star display: Stars value={4.3} */
export function Stars({ value = 0, size = 14, className }) {
  return (
    <span className={cn('inline-flex items-center gap-0.5', className)} role="img" aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = Math.max(0, Math.min(1, value - (i - 1)));
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            <Star className="absolute inset-0 text-ink-200" style={{ width: size, height: size }} fill="currentColor" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${fill * 100}%` }}>
              <Star className="text-amber-400" style={{ width: size, height: size }} fill="currentColor" />
            </span>
          </span>
        );
      })}
    </span>
  );
}

export function RatingSummary({ avg = 0, count = 0, className }) {
  if (!count) return <span className={cn('text-xs text-ink-400', className)}>New</span>;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-sm', className)}>
      <b className="text-amber-600">{avg.toFixed(1)}</b>
      <Stars value={avg} />
      <span className="text-ink-400">({new Intl.NumberFormat('en-IN').format(count)})</span>
    </span>
  );
}

/** Interactive picker for reviews. */
export function RatingInput({ value, onChange }) {
  const [hover, setHover] = useState(0);
  const shown = hover || value;
  return (
    <div role="radiogroup" aria-label="Rating" className="inline-flex gap-1" onMouseLeave={() => setHover(0)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <button key={i} type="button" role="radio" aria-checked={value === i} aria-label={`${i} star${i > 1 ? 's' : ''}`} onMouseEnter={() => setHover(i)} onClick={() => onChange(i)} className="rounded p-0.5 transition hover:scale-110">
          <Star className={cn('h-7 w-7', i <= shown ? 'text-amber-400' : 'text-ink-200')} fill="currentColor" />
        </button>
      ))}
    </div>
  );
}
