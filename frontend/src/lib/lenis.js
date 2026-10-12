import Lenis from 'lenis';
import { gsap, ScrollTrigger } from './gsap.js';

let lenis;

/** Smooth scroll driven by GSAP's ticker so ScrollTrigger and Lenis stay in sync. Disabled for reduced-motion users. */
export function startLenis() {
  if (lenis || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null;
  lenis = new Lenis({ duration: 1.1, smoothWheel: true, wheelMultiplier: 1, touchMultiplier: 1.4 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  return lenis;
}
export function stopLenis() {
  lenis?.destroy();
  lenis = undefined;
}
export const getLenis = () => lenis;
