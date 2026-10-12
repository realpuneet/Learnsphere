import { forwardRef, useId } from 'react';
import { cn } from '../../lib/cn.js';

export function Field({ label, error, hint, required, children, className }) {
  return (
    <div className={cn('space-y-1.5', className)}>
      {label && (
        <label className="block text-sm font-medium text-ink-700">
          {label} {required && <span className="text-coral-500">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-xs text-ink-500">{hint}</p>}
      {error && <p role="alert" className="text-xs font-medium text-red-600">{error}</p>}
    </div>
  );
}

const base =
  'w-full rounded-xl border bg-white px-3.5 text-[15px] text-ink-900 placeholder:text-ink-400 transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-100 disabled:bg-ink-50';

export const Input = forwardRef(function Input({ label, error, hint, className, required, wrapperClass, ...rest }, ref) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={wrapperClass}>
      <input ref={ref} className={cn(base, 'h-11', error ? 'border-red-400' : 'border-ink-200', className)} aria-invalid={!!error} {...rest} />
    </Field>
  );
});

export const Textarea = forwardRef(function Textarea({ label, error, hint, className, required, rows = 3, wrapperClass, ...rest }, ref) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={wrapperClass}>
      <textarea ref={ref} rows={rows} className={cn(base, 'py-2.5', error ? 'border-red-400' : 'border-ink-200', className)} {...rest} />
    </Field>
  );
});

export const Select = forwardRef(function Select({ label, error, hint, className, required, children, wrapperClass, ...rest }, ref) {
  return (
    <Field label={label} error={error} hint={hint} required={required} className={wrapperClass}>
      <select ref={ref} className={cn(base, 'h-11 appearance-none bg-[url("data:image/svg+xml;utf8,<svg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 20 20%27 fill=%27%23587280%27><path d=%27M5.5 7.5l4.5 4.5 4.5-4.5%27 stroke=%27%23587280%27 stroke-width=%271.8%27 fill=%27none%27 stroke-linecap=%27round%27/></svg>")] bg-[length:18px] bg-[right_12px_center] bg-no-repeat pr-9', error ? 'border-red-400' : 'border-ink-200', className)} {...rest}>
        {children}
      </select>
    </Field>
  );
});

export function Switch({ checked, onChange, label, description, disabled }) {
  const id = useId();
  return (
    <label htmlFor={id} className={cn('flex cursor-pointer items-start justify-between gap-4 rounded-xl py-2', disabled && 'cursor-not-allowed opacity-50')}>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-ink-800">{label}</span>
        {description && <span className="mt-0.5 block text-xs text-ink-500">{description}</span>}
      </span>
      <span className="relative mt-0.5 inline-flex h-6 w-11 shrink-0">
        <input id={id} type="checkbox" role="switch" className="peer sr-only" checked={!!checked} disabled={disabled} onChange={(e) => onChange?.(e.target.checked)} />
        <span className="absolute inset-0 rounded-full bg-ink-300 transition peer-checked:bg-brand-600 peer-focus-visible:ring-4 peer-focus-visible:ring-brand-100" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function Checkbox({ checked, onChange, label, description }) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-ink-200 bg-white p-3 transition hover:border-brand-300 has-[:checked]:border-brand-500 has-[:checked]:bg-brand-50">
      <input type="checkbox" className="mt-0.5 h-5 w-5 accent-brand-600" checked={!!checked} onChange={(e) => onChange?.(e.target.checked)} />
      <span>
        <span className="block text-sm font-semibold text-ink-800">{label}</span>
        {description && <span className="block text-xs text-ink-500">{description}</span>}
      </span>
    </label>
  );
}

/** Chips for multi-value text (allergies, symptoms...) */
export function TagInput({ label, value = [], onChange, placeholder = 'Type and press Enter', max = 20 }) {
  const add = (raw) => {
    const t = raw.trim();
    if (t && !value.includes(t) && value.length < max) onChange([...value, t]);
  };
  return (
    <Field label={label}>
      <div className="flex flex-wrap gap-1.5 rounded-xl border border-ink-200 bg-white p-2 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100">
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2 py-1 text-xs font-medium text-brand-700">
            {t}
            <button type="button" aria-label={`Remove ${t}`} onClick={() => onChange(value.filter((x) => x !== t))} className="text-brand-500 hover:text-brand-800">×</button>
          </span>
        ))}
        <input
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-sm outline-none"
          placeholder={value.length ? '' : placeholder}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              add(e.currentTarget.value);
              e.currentTarget.value = '';
            }
          }}
          onBlur={(e) => {
            add(e.currentTarget.value);
            e.currentTarget.value = '';
          }}
        />
      </div>
    </Field>
  );
}
