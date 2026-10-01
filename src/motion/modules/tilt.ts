import type { MotionModule } from '../types';

const MAX = 6;

export const tilt: MotionModule = (el, { gsap, finePointer }) => {
  if (!finePointer) return;
  gsap.set(el, { transformPerspective: 900 });
  const xTo = gsap.quickTo(el, 'rotateX', { duration: 0.6, ease: 'power3' });
  const yTo = gsap.quickTo(el, 'rotateY', { duration: 0.6, ease: 'power3' });
  const onMove = (e: PointerEvent) => {
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width - 0.5;
    const py = (e.clientY - r.top) / r.height - 0.5;
    xTo(-py * 2 * MAX);
    yTo(px * 2 * MAX);
  };
  const onLeave = () => {
    xTo(0);
    yTo(0);
  };
  el.addEventListener('pointermove', onMove);
  el.addEventListener('pointerleave', onLeave);
  el.dataset.motionState = 'done';
  return () => {
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerleave', onLeave);
    gsap.killTweensOf(el);
    gsap.set(el, { clearProps: 'transform' });
  };
};
