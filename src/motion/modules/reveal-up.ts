import type { MotionModule } from '../types';

export const revealUp: MotionModule = (el, { gsap, options, reduced }) => {
  const targets = options.stagger !== undefined ? Array.from(el.children) : el;
  gsap.set(targets, reduced ? { opacity: 0 } : { opacity: 0, y: 28 });
  const tween = gsap.to(targets, {
    opacity: 1,
    ...(reduced ? {} : { y: 0 }),
    duration: reduced ? 0.6 : 0.8,
    ease: reduced ? 'power1.out' : 'expo.out',
    stagger: Number(options.stagger ?? 0),
    delay: Number(options.delay ?? 0),
    ...(options.trigger === 'load' ? {} : { scrollTrigger: { trigger: el, start: 'top 88%', once: true } }),
    onComplete: () => {
      el.dataset.motionState = 'done';
    },
  });
  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
  };
};
