import type { MotionModule } from '../types';

export const scrubWords: MotionModule = (el, { gsap, SplitText }) => {
  // aria: 'none' — SplitText's default aria-label is prohibited on <p>; the word spans stay readable
  const split = SplitText.create(el, { type: 'words', wordsClass: 'word', aria: 'none' });
  const tween = gsap.fromTo(
    split.words,
    { opacity: 0.18 },
    {
      opacity: 1,
      stagger: 0.05,
      ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true },
    },
  );
  el.dataset.motionState = 'done';
  return () => {
    tween.scrollTrigger?.kill();
    tween.kill();
    split.revert();
  };
};
