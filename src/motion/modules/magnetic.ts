import type { MotionModule } from '../types';

/**
 * Element leans toward the pointer. Its resting rect is measured once per hover (it moves
 * itself, so re-measuring mid-hover would feed back into the pull and cost a layout per move).
 */
export const magnetic: MotionModule = (el, { gsap, finePointer, options }) => {
  if (!finePointer) return;
  const strength = Number(options.strength ?? 0.3);
  const xTo = gsap.quickTo(el, 'x', { duration: 0.5, ease: 'power3' });
  const yTo = gsap.quickTo(el, 'y', { duration: 0.5, ease: 'power3' });
  let cx = 0;
  let cy = 0;
  const onEnter = () => {
    const r = el.getBoundingClientRect();
    const x = Number(gsap.getProperty(el, 'x')) || 0;
    const y = Number(gsap.getProperty(el, 'y')) || 0;
    cx = r.left - x + r.width / 2;
    cy = r.top - y + r.height / 2;
  };
  const onMove = (e: PointerEvent) => {
    xTo((e.clientX - cx) * strength);
    yTo((e.clientY - cy) * strength);
  };
  const onLeave = () => {
    gsap.to(el, { x: 0, y: 0, duration: 0.9, ease: 'elastic.out(1,0.45)', overwrite: 'auto' });
  };
  el.addEventListener('pointerenter', onEnter);
  el.addEventListener('pointermove', onMove, { passive: true });
  el.addEventListener('pointerleave', onLeave);
  el.dataset.motionState = 'done';
  return () => {
    el.removeEventListener('pointerenter', onEnter);
    el.removeEventListener('pointermove', onMove);
    el.removeEventListener('pointerleave', onLeave);
    gsap.killTweensOf(el);
    gsap.set(el, { x: 0, y: 0 });
  };
};
