import Lenis from 'lenis';
import type { gsap as Gsap } from 'gsap';
import type { ScrollTrigger as ST } from 'gsap/ScrollTrigger';
import { reducedMotion } from './prefers';

let current: Lenis | null = null;

export function startLenis(gsap: typeof Gsap, ScrollTrigger: typeof ST): { lenis: Lenis; stop(): void } {
  // Slightly softer glide than the default, with wheel input scaled down a touch so long
  // flicks feel controlled rather than floaty.
  const lenis = new Lenis({ lerp: 0.085, smoothWheel: true, wheelMultiplier: 0.9, autoRaf: false });
  lenis.on('scroll', ScrollTrigger.update);
  const tick = (t: number) => lenis.raf(t * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  current = lenis;
  return {
    lenis,
    stop() {
      gsap.ticker.remove(tick);
      lenis.destroy();
      if (current === lenis) current = null;
    },
  };
}

export function scrollToTarget(target: string | HTMLElement, offset = 16): void {
  const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
  if (!el) return;
  if (current) {
    const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 0;
    current.scrollTo(el, {
      offset: -(navH + offset),
      duration: 1.2,
      easing: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    });
    return;
  }
  el.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' });
}
