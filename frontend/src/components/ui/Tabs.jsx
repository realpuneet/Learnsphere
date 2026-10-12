import { cn } from '../../lib/cn.js';

export function Tabs({ tabs, value, onChange, className }) {
  return (
    <div role="tablist" className={cn('no-scrollbar -mx-1 flex gap-1 overflow-x-auto rounded-2xl bg-ink-100 p-1', className)}>
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cn('whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition', value === t.value ? 'bg-white text-brand-700 shadow-sm' : 'text-ink-600 hover:text-ink-900')}
        >
          {t.label}
          {t.count != null && <span className="ml-1.5 rounded-full bg-brand-100 px-1.5 text-xs text-brand-700">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
