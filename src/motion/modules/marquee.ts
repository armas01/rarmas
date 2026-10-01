import type { MotionModule } from '../types';

export const marquee: MotionModule = (el, { gsap, ScrollTrigger, options }) => {
  const track = el.querySelector<HTMLElement>('[data-track]');
  if (!track) return;
  const reverse = options.direction === 'reverse';
  const tween = gsap.fromTo(
    track,
    { xPercent: reverse ? -50 : 0 },
    {
      xPercent: reverse ? 0 : -50,
      duration: Number(options.duration ?? 30),
      repeat: -1,
      ease: 'none',
    },
  );
  let hovering = false;
  let boost: gsap.core.Tween | null = null;
  let settle: gsap.core.Tween | null = null;
  const stopTimeScaleTweens = () => {
    boost?.kill();
    settle?.kill();
    boost = settle = null;
  };
  const st = ScrollTrigger.create({
    onUpdate: (s) => {
      if (hovering) return;
      stopTimeScaleTweens();
      const target = 1 + Math.min(Math.abs(s.getVelocity()) / 400, 3);
      boost = gsap.to(tween, {
        timeScale: target,
        duration: 0.2,
        overwrite: true,
        onComplete: () => {
          // ease back to normal speed after the burst
          settle = gsap.to(tween, { timeScale: 1, duration: 0.8, ease: 'power2.out' });
        },
      });
    },
  });
  const onEnter = () => {
    hovering = true;
    stopTimeScaleTweens();
    tween.timeScale(0);
  };
  const onLeave = () => {
    hovering = false;
    tween.timeScale(1);
  };
  el.addEventListener('pointerenter', onEnter);
  el.addEventListener('pointerleave', onLeave);
  el.dataset.motionState = 'done';
  return () => {
    el.removeEventListener('pointerenter', onEnter);
    el.removeEventListener('pointerleave', onLeave);
    stopTimeScaleTweens();
    st.kill();
    tween.scrollTrigger?.kill();
    tween.kill();
  };
};
