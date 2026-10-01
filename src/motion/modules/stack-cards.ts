import type { MotionModule } from '../types';

export const stackCards: MotionModule = (el, { gsap }) => {
  const cards = Array.from(el.querySelectorAll<HTMLElement>('[data-card]'));
  const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72;
  const tweens = cards.slice(0, -1).map((card, i) =>
    gsap.to(card, {
      scale: 0.92,
      filter: 'brightness(.7)',
      ease: 'none',
      scrollTrigger: {
        trigger: cards[i + 1],
        start: 'top bottom',
        end: 'top top+=' + (navH + 24),
        scrub: true,
      },
    }),
  );
  el.dataset.motionState = 'done';
  return () => {
    tweens.forEach((t) => {
      t.scrollTrigger?.kill();
      t.kill();
    });
    cards.forEach((c) => gsap.set(c, { clearProps: 'transform,filter' }));
  };
};
