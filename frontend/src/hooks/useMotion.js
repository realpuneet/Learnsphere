import { useRef } from 'react';
import { gsap, useGSAP } from '../lib/gsap.js';

/**
 * Run GSAP animations scoped to a container with automatic cleanup.
 * `fn(ctx, { reduced })` gets two matchMedia branches so reduced-motion users never see movement.
 */
export function useMotion(fn, deps = []) {
  const scope = useRef(null);
  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(
        { full: '(prefers-reduced-motion: no-preference)', reduced: '(prefers-reduced-motion: reduce)' },
        (ctx) => {
          const { reduced } = ctx.conditions;
          if (reduced) return;
          return fn(ctx, { reduced });
        },
      );
      return () => mm.revert();
    },
    { scope, dependencies: deps, revertOnUpdate: true },
  );
  return scope;
}
