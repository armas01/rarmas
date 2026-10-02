import type { MotionModule } from '../types';

/**
 * Cards shrink and dim as the next one slides over them. Dimming animates an overlay's
 * opacity ([data-card-dim]) instead of `filter`, keeping every frame compositor-only.
 */
export const stackCards: MotionModule = (el, { gsap }) => {
  const cards = Array.from(el.querySelectorAll<HTMLElement>('[data-card]'));
  const navH = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--nav-h')) || 72;
  const timelines = cards.slice(0, -1).map((card, i) => {
    const dim = card.querySelector<HTMLElement>('[data-card-dim]');
    const tl = gsap.timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: cards[i + 1],
        start: 'top bottom',
        end: 'top top+=' + (navH + 24),
        scrub: true,
      },
    });
    tl.to(card, { scale: 0.92, force3D: true }, 0);
    if (dim) tl.fromTo(dim, { opacity: 0 }, { opacity: 0.3 }, 0);
    return tl;
  });
  el.dataset.motionState = 'done';
  return () => {
    timelines.forEach((t) => {
      t.scrollTrigger?.kill();
      t.kill();
    });
    cards.forEach((c) => gsap.set(c, { clearProps: 'transform' }));
    el.querySelectorAll('[data-card-dim]').forEach((d) => gsap.set(d, { clearProps: 'opacity' }));
  };
};
