import { useEffect } from 'react';
import { create } from 'zustand';
import { AlertTriangle, CheckCircle2, Info, Loader2, SearchX, X, XCircle } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { Button } from './Button.jsx';

/* ---------------- toasts ---------------- */
const useToasts = create((set) => ({
  items: [],
  push: (t) => {
    const id = Math.random().toString(36).slice(2);
    set((s) => ({ items: [...s.items.slice(-3), { id, ...t }] }));
    return id;
  },
  dismiss: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id) })),
}));
export const toast = {
  success: (message) => useToasts.getState().push({ type: 'success', message }),
  error: (message) => useToasts.getState().push({ type: 'error', message }),
  info: (message, opts) => useToasts.getState().push({ type: 'info', message, ...opts }),
};
export const errMsg = (e) => e?.userMessage || e?.message || 'Something went wrong';

const icons = { success: CheckCircle2, error: XCircle, info: Info };
const tone = { success: 'text-emerald-600', error: 'text-red-600', info: 'text-brand-600' };

function ToastItem({ t }) {
  const dismiss = useToasts((s) => s.dismiss);
  useEffect(() => {
    const id = setTimeout(() => dismiss(t.id), t.type === 'error' ? 6000 : 3800);
    return () => clearTimeout(id);
  }, [t, dismiss]);
  const Icon = icons[t.type];
  return (
    <div role="status" className="pointer-events-auto flex w-full max-w-sm animate-[fadeUp_.25s_ease-out] items-start gap-3 rounded-2xl border border-ink-100 bg-white p-3.5 shadow-pop">
      <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', tone[t.type])} />
      <p className="flex-1 text-sm font-medium text-ink-800">{t.message}</p>
      <button aria-label="Dismiss" onClick={() => dismiss(t.id)} className="text-ink-400 hover:text-ink-700"><X className="h-4 w-4" /></button>
    </div>
  );
}
export function Toaster() {
  const items = useToasts((s) => s.items);
  return (
    <div className="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3 sm:items-end sm:px-5" aria-live="polite">
      {items.map((t) => <ToastItem key={t.id} t={t} />)}
    </div>
  );
}

/* ---------------- loading & empty states ---------------- */
export const Spinner = ({ className }) => <Loader2 className={cn('h-5 w-5 animate-spin text-brand-600', className)} aria-label="Loading" />;
export const PageLoader = () => (
  <div className="flex min-h-[50vh] items-center justify-center"><Spinner className="h-8 w-8" /></div>
);

export const Skeleton = ({ className }) => (
  <div className={cn('relative overflow-hidden rounded-xl bg-ink-100 before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.4s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/70 before:to-transparent', className)} />
);
export const CardSkeletons = ({ count = 3, className = 'h-28' }) => (
  <div className="space-y-3">{Array.from({ length: count }).map((_, i) => <Skeleton key={i} className={className} />)}</div>
);

export function Empty({ icon: Icon = SearchX, title, text, action }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-ink-200 bg-white/60 px-6 py-12 text-center">
      <span className="mb-3 rounded-2xl bg-brand-50 p-3 text-brand-600"><Icon className="h-7 w-7" /></span>
      <h3 className="font-display text-lg font-bold text-ink-900">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-ink-500">{text}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-red-100 bg-red-50/50 px-6 py-10 text-center">
      <AlertTriangle className="mb-2 h-8 w-8 text-red-500" />
      <p className="font-semibold text-ink-900">Couldn&apos;t load this</p>
      <p className="mt-1 text-sm text-ink-500">{errMsg(error)}</p>
      {onRetry && <Button variant="secondary" size="sm" className="mt-4" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

/** Renders loading / error / empty / content for a react-query result. */
export function QueryState({ query, skeleton, empty, isEmpty, children }) {
  if (query.isLoading) return skeleton || <CardSkeletons />;
  if (query.isError) return <ErrorState error={query.error} onRetry={query.refetch} />;
  if (isEmpty?.(query.data)) return empty;
  return children(query.data);
}
