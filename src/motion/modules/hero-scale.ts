import type { MotionModule } from '../types';

export const heroScale: MotionModule = (el, { gsap }) => {
  const frame = el.querySelector<HTMLElement>('[data-hero-frame]');
  if (!frame) return;
  const tween = gsap.to(frame, {
    scale: 0.92,
    borderRadius: 28,
    filter: 'brightness(.6)',
    ease: 'none',
    scrollTrigger: { trigger: el, start: 'top top', end: 'bottom top', scrub: true },
  });
  el.dataset.motionState = 'done';
  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
    gsap.set(frame, { clearProps: 'transform,borderRadius,filter' });
  };
};
