import type { MotionModule } from '../types';

export const revealWords: MotionModule = (el, { gsap, SplitText, options }) => {
  const isHeading = /^H[1-6]$/.test(el.tagName);
  if (isHeading) el.setAttribute('aria-label', (el.textContent ?? '').trim());
  const split = SplitText.create(el, { type: 'words', mask: 'words', wordsClass: 'word' });
  if (isHeading) split.words.forEach((w: Element) => w.setAttribute('aria-hidden', 'true'));
  const tween = gsap.from(split.words, {
    yPercent: 110,
    duration: 1.2,
    ease: 'expo.out',
    stagger: 0.04,
    delay: Number(options.delay ?? 0),
    scrollTrigger: options.trigger === 'load' ? undefined : { trigger: el, start: 'top 85%', once: true },
  });
  gsap.set(el, { opacity: 1 });
  el.dataset.motionState = 'done';
  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
    split.revert();
  };
};
