import type { MotionModule } from '../types';

export const revealUp: MotionModule = (el, { gsap, options }) => {
  const targets = options.stagger !== undefined ? Array.from(el.children) : el;
  gsap.set(targets, { opacity: 0, y: 28 });
  const tween = gsap.to(targets, {
    opacity: 1,
    y: 0,
    duration: 0.8,
    ease: 'expo.out',
    stagger: Number(options.stagger ?? 0),
    delay: Number(options.delay ?? 0),
    scrollTrigger: { trigger: el, start: 'top 88%', once: true },
    onComplete: () => {
      el.dataset.motionState = 'done';
    },
  });
  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
  };
};
