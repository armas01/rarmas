import type { MotionModule } from '../types';

/**
 * Soft glow that trails the pointer. The host's rect is measured on pointerenter and after
 * scroll/resize instead of on every pointermove, so moving the mouse never forces layout.
 */
export const cursorGlow: MotionModule = (el, { gsap, finePointer }) => {
  if (!finePointer) return;
  const glow = el.querySelector<HTMLElement>('[data-glow]');
  if (!glow) return;
  const half = { w: glow.offsetWidth / 2, h: glow.offsetHeight / 2 };
  const xTo = gsap.quickTo(glow, 'x', { duration: 0.9, ease: 'power3' });
  const yTo = gsap.quickTo(glow, 'y', { duration: 0.9, ease: 'power3' });
  let rect: DOMRect | null = null;
  const invalidate = () => {
    rect = null;
  };
  const onMove = (e: PointerEvent) => {
    rect ??= el.getBoundingClientRect();
    xTo(e.clientX - rect.left - half.w);
    yTo(e.clientY - rect.top - half.h);
  };
  el.addEventListener('pointerenter', invalidate);
  el.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('scroll', invalidate, { passive: true });
  window.addEventListener('resize', invalidate, { passive: true });
  el.dataset.motionState = 'done';
  return () => {
    el.removeEventListener('pointerenter', invalidate);
    el.removeEventListener('pointermove', onMove);
    window.removeEventListener('scroll', invalidate);
    window.removeEventListener('resize', invalidate);
    gsap.killTweensOf(glow);
  };
};
