import type { MotionModule } from '../types';

export const magnetic: MotionModule = (el, { gsap, finePointer, options }) => {
  if (!finePointer) return;
  const strength = Number(options.strength ?? 0.3);
  const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
  const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
  const onMove = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    xTo((e.clientX - (r.left + r.width / 2)) * strength);
    yTo((e.clientY - (r.top + r.height / 2)) * strength);
  };
  const onLeave = () => {
    gsap.to(el, { x: 0, y: 0, duration: 1, ease: 'elastic.out(1,0.4)', overwrite: 'auto' });
  };
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerleave', onLeave);
  el.dataset.motionState = 'done';
  return () => {
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerleave', onLeave);
    gsap.killTweensOf(el);
    gsap.set(el, { x: 0, y: 0 });
  };
};
