import { forwardRef } from 'react';
import { Link } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/cn.js';

const variants = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 active:bg-brand-800 shadow-sm',
  secondary: 'bg-white text-ink-800 border border-ink-200 hover:bg-ink-50 active:bg-ink-100',
  soft: 'bg-brand-50 text-brand-700 hover:bg-brand-100',
  danger: 'bg-red-600 text-white hover:bg-red-700',
  ghost: 'text-ink-700 hover:bg-ink-100',
  coral: 'bg-coral-500 text-white hover:bg-coral-600',
};
const sizes = { sm: 'h-9 px-3 text-sm', md: 'h-11 px-5 text-[15px]', lg: 'h-12 px-6 text-base', icon: 'h-10 w-10' };

export const Button = forwardRef(function Button({ variant = 'primary', size = 'md', loading, disabled, className, children, to, href, ...rest }, ref) {
  const cls = cn(
    'inline-flex select-none items-center justify-center gap-2 rounded-xl font-semibold transition-colors duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 disabled:cursor-not-allowed disabled:opacity-50',
    variants[variant],
    sizes[size],
    className,
  );
  if (to) return <Link ref={ref} to={to} className={cls} {...rest}>{children}</Link>;
  if (href) return <a ref={ref} href={href} className={cls} {...rest}>{children}</a>;
  return (
    <button ref={ref} className={cls} disabled={disabled || loading} {...rest}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
});
