const TZ = 'Asia/Kolkata';

export const inr = (n) => (n == null ? '' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: n % 1 ? 2 : 0 }).format(n));
export const num = (n) => new Intl.NumberFormat('en-IN').format(n ?? 0);
export const compact = (n) => new Intl.NumberFormat('en-IN', { notation: 'compact', maximumFractionDigits: 1 }).format(n ?? 0);

const fmt = (opts) => (d) => (d ? new Intl.DateTimeFormat('en-IN', { timeZone: TZ, ...opts }).format(new Date(d)) : '');
export const dateShort = fmt({ day: '2-digit', month: 'short' });
export const dateLong = fmt({ day: '2-digit', month: 'long', year: 'numeric' });
export const dateTimeFull = fmt({ day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
export const monthYear = fmt({ month: 'short', year: 'numeric' });

export const initials = (name = '') => name.split(' ').filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join('');
export const timeAgo = (d) => {
  const s = Math.max(1, Math.round((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
  return dateShort(d);
};

/** 3725 -> "1h 2m", 90 -> "2m" (rounded up so tiny lessons never show 0m) */
export const duration = (sec = 0) => {
  if (!sec) return '0m';
  const m = Math.max(1, Math.round(sec / 60));
  const h = Math.floor(m / 60);
  return h ? `${h}h ${m % 60}m` : `${m}m`;
};
/** mm:ss for the video scrubber */
export const clock = (sec = 0) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

export const discountPct = (price, mrp) => (mrp > price && mrp > 0 ? Math.round(((mrp - price) / mrp) * 100) : 0);

export const STATUS_META = {
  draft: { label: 'Draft', tone: 'gray' },
  in_review: { label: 'In review', tone: 'amber' },
  published: { label: 'Published', tone: 'green' },
  rejected: { label: 'Changes needed', tone: 'red' },
  archived: { label: 'Archived', tone: 'gray' },
  active: { label: 'In progress', tone: 'brand' },
  completed: { label: 'Completed', tone: 'green' },
  refunded: { label: 'Refunded', tone: 'red' },
  revoked: { label: 'Revoked', tone: 'red' },
  paid: { label: 'Paid', tone: 'green' },
  created: { label: 'Created', tone: 'amber' },
  failed: { label: 'Failed', tone: 'red' },
};
export const LEVEL_LABEL = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', all: 'All levels' };
export const LESSON_ICON_LABEL = { video: 'Video', article: 'Article', quiz: 'Quiz' };
