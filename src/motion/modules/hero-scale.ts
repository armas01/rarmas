import type { MotionModule } from '../types';

/**
 * Scroll-linked shrink of the hero frame. Dimming uses an overlay's opacity instead of
 * `filter: brightness()`, so each frame is a compositor-only transform/opacity change
 * rather than a re-raster of the whole (blurred, full-viewport) hero layer.
 */
export const heroScale: MotionModule = (el, { gsap }) => {
  const frame = el.querySelector<HTMLElement>('[data-hero-frame]');
  if (!frame) return;
  const dim = frame.querySelector<HTMLElement>('[data-hero-dim]');
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true },
  });
  tl.to(frame, { scale: 0.92, force3D: true }, 0);
  if (dim) tl.fromTo(dim, { opacity: 0 }, { opacity: 0.4 }, 0);
  el.dataset.motionState = 'done';
  return () => {
    tl.scrollTrigger?.kill();
    tl.kill();
    gsap.set(frame, { clearProps: 'transform' });
    if (dim) gsap.set(dim, { clearProps: 'opacity' });
  };
};
