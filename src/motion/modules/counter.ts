import type { MotionModule } from '../types';

export const counter: MotionModule = (el, { gsap, options }) => {
  const to = Number(options.to);
  const suffix = options.suffix ?? '';
  if (!Number.isFinite(to)) return;
  const finalText = to + suffix;
  el.textContent = '0' + suffix;
  const state = { v: 0 };
  const tween = gsap.to(state, {
    v: to,
    duration: 1.6,
    ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    onUpdate: () => {
      el.textContent = Math.round(state.v) + suffix;
    },
    onComplete: () => {
      el.textContent = finalText;
      el.dataset.motionState = 'done';
    },
  });
  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
    el.textContent = finalText;
  };
};
