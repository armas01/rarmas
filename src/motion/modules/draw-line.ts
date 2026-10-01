import type { MotionModule } from '../types';

export const drawLine: MotionModule = (el, { gsap, ScrollTrigger }) => {
  const fill = el.querySelector<HTMLElement>('[data-line-fill]');
  const entries = Array.from(el.querySelectorAll<HTMLElement>('[data-entry]'));
  const tween = fill
    ? gsap.fromTo(
        fill,
        { scaleY: 0, transformOrigin: 'top' },
        {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: { trigger: el, start: 'top 70%', end: 'bottom 70%', scrub: true },
        },
      )
    : null;
  const triggers = entries.map((entry) =>
    ScrollTrigger.create({
      trigger: entry,
      start: 'top 70%',
      onEnter: () => entry.setAttribute('data-active', ''),
      onLeaveBack: () => entry.removeAttribute('data-active'),
    }),
  );
  el.dataset.motionState = 'done';
  return () => {
    triggers.forEach((t) => t.kill());
    tween?.scrollTrigger?.kill();
    tween?.kill();
  };
};
