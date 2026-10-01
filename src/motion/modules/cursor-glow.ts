import type { MotionModule } from '../types';

export const cursorGlow: MotionModule = (el, { gsap, finePointer }) => {
  if (!finePointer) return;
  const glow = el.querySelector<HTMLElement>('[data-glow]');
  if (!glow) return;
  const xTo = gsap.quickTo(glow, 'x', { duration: 0.8, ease: 'power3' });
  const yTo = gsap.quickTo(glow, 'y', { duration: 0.8, ease: 'power3' });
  const onMove = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    xTo(e.clientX - r.left - glow.offsetWidth / 2);
    yTo(e.clientY - r.top - glow.offsetHeight / 2);
  };
  el.addEventListener('pointermove', onMove);
  el.dataset.motionState = 'done';
  return () => {
    el.removeEventListener('pointermove', onMove);
    gsap.killTweensOf(glow);
  };
};
