import type { MotionModule } from '../types';

export const pinStory: MotionModule = (el, { ScrollTrigger }) => {
  const chapters = Array.from(el.querySelectorAll<HTMLElement>('[data-chapter]'));
  const dots = Array.from(el.querySelectorAll<HTMLElement>('[data-dot]'));
  const setIndex = (i: number) => {
    el.dataset.activeIndex = String(i);
    chapters.forEach((c, n) => c.toggleAttribute('data-active', n === i));
    dots.forEach((d, n) => {
      if (n === i) d.setAttribute('aria-current', 'step');
      else d.removeAttribute('aria-current');
    });
  };
  setIndex(0);
  const st = ScrollTrigger.create({
    trigger: el,
    start: 'top top',
    end: '+=300%',
    pin: true,
    scrub: true,
    onUpdate: (self) => setIndex(Math.min(3, Math.floor(self.progress * 4))),
  });
  el.dataset.motionState = 'done';
  return () => {
    st.kill();
  };
};
