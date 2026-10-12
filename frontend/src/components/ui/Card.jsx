import { cn } from '../../lib/cn.js';
import { STATUS_META, initials } from '../../lib/format.js';
import { ik } from '../../lib/imagekit.js';

export const Card = ({ className, children, as: As = 'div', ...rest }) => (
  <As className={cn('rounded-2xl border border-ink-100 bg-white shadow-card', className)} {...rest}>{children}</As>
);

const tones = {
  brand: 'bg-brand-50 text-brand-700 ring-brand-200',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  amber: 'bg-amber-50 text-amber-700 ring-amber-200',
  red: 'bg-red-50 text-red-700 ring-red-200',
  blue: 'bg-sky-50 text-sky-700 ring-sky-200',
  gray: 'bg-ink-100 text-ink-600 ring-ink-200',
  coral: 'bg-coral-50 text-coral-600 ring-coral-100',
};
export const Badge = ({ tone = 'gray', className, children }) => (
  <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset', tones[tone], className)}>{children}</span>
);
export const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || { label: status, tone: 'gray' };
  return <Badge tone={m.tone}>{m.label}</Badge>;
};

export function Avatar({ name, src, size = 44, className }) {
  const s = { width: size, height: size, fontSize: size * 0.36 };
  return src ? (
    <img src={ik(src, size * 2)} alt={name || ''} loading="lazy" style={s} className={cn('shrink-0 rounded-full object-cover', className)} />
  ) : (
    <span style={s} className={cn('inline-flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-100 to-brand-200 font-bold text-brand-800', className)} aria-hidden>
      {initials(name) || '•'}
    </span>
  );
}

export function Stat({ label, value, icon: Icon, tone = 'brand', hint }) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-ink-500">{label}</p>
        {Icon && <span className={cn('rounded-xl p-2', tones[tone])}><Icon className="h-4 w-4" /></span>}
      </div>
      <p className="mt-2 font-display text-2xl font-extrabold text-ink-900">{value}</p>
      {hint && <p className="mt-0.5 text-xs text-ink-500">{hint}</p>}
    </Card>
  );
}

export function SectionTitle({ title, subtitle, action, className }) {
  return (
    <div className={cn('mb-4 flex items-end justify-between gap-3', className)}>
      <div>
        <h2 className="font-display text-xl font-bold text-ink-900 sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export const Divider = ({ className }) => <hr className={cn('border-ink-100', className)} />;

export function KeyValue({ label, children }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 text-sm">
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-right font-medium text-ink-800">{children}</dd>
    </div>
  );
}
