import { useEffect, useRef, useState } from 'react';
import { useMotion } from '../../hooks/useMotion.js';
import { gsap } from '../../lib/gsap.js';

/** Fade/slide children in when they scroll into view. */
export function Reveal({ children, y = 28, delay = 0, className, as: As = 'div' }) {
  const scope = useMotion(() => {
    gsap.from(scope.current, { y, opacity: 0, duration: 0.8, delay, ease: 'power3.out', scrollTrigger: { trigger: scope.current, start: 'top 88%', once: true } });
  });
  return <As ref={scope} className={className}>{children}</As>;
}

/** Stagger direct children (cards, list rows). */
export function StaggerList({ children, className, selector = ':scope > *', stagger = 0.07, y = 24 }) {
  const scope = useMotion(() => {
    const items = scope.current.querySelectorAll(selector);
    if (!items.length) return;
    gsap.from(items, { y, opacity: 0, duration: 0.7, stagger, ease: 'power3.out', scrollTrigger: { trigger: scope.current, start: 'top 90%', once: true } });
  });
  return <div ref={scope} className={className}>{children}</div>;
}

/** Hero headline: words rise in one by one. */
export function SplitText({ text, className, as: As = 'h1', delay = 0 }) {
  const scope = useMotion(() => {
    gsap.from(scope.current.querySelectorAll('[data-w]'), { yPercent: 110, opacity: 0, duration: 0.9, stagger: 0.06, delay, ease: 'power4.out' });
  });
  return (
    <As ref={scope} className={className} aria-label={text}>
      {text.split(' ').map((w, i) => (
        <span key={i} className="inline-block overflow-hidden align-bottom" aria-hidden>
          <span data-w className="inline-block">{w}&nbsp;</span>
        </span>
      ))}
    </As>
  );
}

/** Count up to a number when visible. */
export function Counter({ value, prefix = '', suffix = '', className, duration = 1.6 }) {
  const ref = useRef(null);
  const [shown, setShown] = useState(0);
  const reduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  useEffect(() => {
    if (reduced) return undefined;
    const obj = { v: 0 };
    const tween = gsap.to(obj, {
      v: value, duration, ease: 'power2.out', onUpdate: () => setShown(Math.round(obj.v)),
      scrollTrigger: { trigger: ref.current, start: 'top 90%', once: true },
    });
    return () => { tween.scrollTrigger?.kill(); tween.kill(); };
  }, [value, duration, reduced]);
  return <span ref={ref} className={className}>{prefix}{new Intl.NumberFormat('en-IN').format(reduced ? value : shown)}{suffix}</span>;
}

/** Subtle magnetic hover for CTAs (desktop pointers only). */
export function Magnetic({ children, strength = 0.25, className }) {
  const scope = useMotion(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return undefined;
    const el = scope.current;
    const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
    const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
    const move = (e) => { const r = el.getBoundingClientRect(); xTo((e.clientX - (r.left + r.width / 2)) * strength); yTo((e.clientY - (r.top + r.height / 2)) * strength); };
    const leave = () => { xTo(0); yTo(0); };
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerleave', leave);
    return () => { el.removeEventListener('pointermove', move); el.removeEventListener('pointerleave', leave); };
  });
  return <span ref={scope} className={`inline-block ${className || ''}`}>{children}</span>;
}

/** Infinite horizontal marquee (CSS driven; paused for reduced motion via global rule). */
export function Marquee({ items, className }) {
  return (
    <div className={`overflow-hidden ${className || ''}`} aria-hidden>
      <div className="flex w-max animate-[marquee_28s_linear_infinite] gap-10 pr-10">
        {[...items, ...items].map((it, i) => <span key={i} className="whitespace-nowrap font-display text-lg font-bold text-brand-700/70">{it}</span>)}
      </div>
    </div>
  );
}
