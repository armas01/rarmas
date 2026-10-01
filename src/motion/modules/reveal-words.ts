import type { MotionModule } from '../types';

export const revealWords: MotionModule = (el, { gsap, SplitText, options, reduced }) => {
  if (reduced) {
    gsap.set(el, { opacity: 0 });
    const fade = gsap.to(el, {
      opacity: 1,
      duration: 0.6,
      ease: 'power1.out',
      delay: Number(options.delay ?? 0),
      ...(options.trigger === 'load' ? {} : { scrollTrigger: { trigger: el, start: 'top 85%', once: true } }),
      onComplete: () => {
        el.dataset.motionState = 'done';
      },
    });
    return () => {
      fade.scrollTrigger?.kill();
      fade.kill();
    };
  }
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
