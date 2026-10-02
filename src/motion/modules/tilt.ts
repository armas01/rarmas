import type { MotionModule } from '../types';

const MAX = 6;

/**
 * Subtle 3D tilt toward the pointer. The rect is captured on pointerenter (before the
 * element rotates), and the layer is promoted only while hovered.
 */
export const tilt: MotionModule = (el, { gsap, finePointer }) => {
  if (!finePointer) return;
  gsap.set(el, { transformPerspective: 900 });
  const xTo = gsap.quickTo(el, 'rotateX', { duration: 0.6, ease: 'power3' });
  const yTo = gsap.quickTo(el, 'rotateY', { duration: 0.6, ease: 'power3' });
  let rect: DOMRect | null = null;
  const onEnter = () => {
    rect = el.getBoundingClientRect();
    el.style.willChange = 'transform';
  };
  const onMove = (e: PointerEvent) => {
    rect ??= el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    xTo(-py * 2 * MAX);
    yTo(px * 2 * MAX);
  };
  const onLeave = () => {
    rect = null;
    xTo(0);
    yTo(0);
    gsap.delayedCall(0.7, () => {
      if (!rect) el.style.removeProperty('will-change');
    });
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
    gsap.set(el, { clearProps: 'transform,willChange' });
  };
};
