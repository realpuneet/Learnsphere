import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { cn } from '../../lib/cn.js';
import { Button } from './Button.jsx';
import { getLenis } from '../../lib/lenis.js';

function useLock(open, onClose) {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.activeElement;
    getLenis()?.stop();
    const lockedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    setTimeout(() => ref.current?.focus(), 0);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = lockedOverflow;
      getLenis()?.start();
      prev?.focus?.();
    };
  }, [open, onClose]);
  return ref;
}

/** Bottom sheet on phones, centered dialog on larger screens. */
export function Modal({ open, onClose, title, children, footer, size = 'md', className }) {
  const ref = useLock(open, onClose);
  if (!open) return null;
  const widths = { sm: 'sm:max-w-sm', md: 'sm:max-w-lg', lg: 'sm:max-w-2xl', xl: 'sm:max-w-4xl' };
  return createPortal(
    <div className="fixed inset-0 z-[90] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <div className="absolute inset-0 bg-ink-900/50 backdrop-blur-[2px]" onClick={onClose} />
      <div ref={ref} tabIndex={-1} data-lenis-prevent className={cn('relative flex max-h-[92vh] w-full animate-[sheetUp_.28s_cubic-bezier(.2,.8,.2,1)] flex-col rounded-t-3xl bg-white shadow-pop outline-none sm:rounded-3xl', widths[size], className)}>
        <div className="flex items-center justify-between border-b border-ink-100 px-5 py-4">
          <h3 className="font-display text-lg font-bold text-ink-900">{title}</h3>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
        {footer && <div className="border-t border-ink-100 px-5 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>,
    document.body,
  );
}

export function Drawer({ open, onClose, children, side = 'left', className }) {
  const ref = useLock(open, onClose);
  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-[80]">
      <div className="absolute inset-0 bg-ink-900/50" onClick={onClose} />
      <aside ref={ref} tabIndex={-1} data-lenis-prevent className={cn('absolute top-0 h-full w-72 max-w-[85vw] overflow-y-auto bg-white shadow-pop outline-none', side === 'left' ? 'left-0 animate-[slideRight_.25s_ease-out]' : 'right-0', className)}>
        {children}
      </aside>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', danger, loading, children }) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<div className="flex justify-end gap-2"><Button variant="secondary" onClick={onClose}>Keep</Button><Button variant={danger ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>{confirmLabel}</Button></div>}>
      {message && <p className="text-sm text-ink-600">{message}</p>}
      {children}
    </Modal>
  );
}
