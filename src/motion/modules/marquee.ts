import type { MotionModule } from '../types';

/**
 * Infinite marquee that speeds up with scroll velocity and eases back to cruise speed.
 * One ticker callback smooths the speed (no tweens are created per scroll event), the loop
 * pauses while off-screen, and hovering glides it to a stop instead of freezing abruptly.
 */
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
      force3D: true,
    },
  );
  let hovering = false;
  let boost = 0;
  let speed = 1;
  const tick = (_t: number, dt: number) => {
    const k = Math.min(1, dt / 120);
    boost += (0 - boost) * Math.min(1, dt / 500);
    const target = hovering ? 0 : 1 + boost;
    speed += (target - speed) * k;
    tween.timeScale(Math.abs(speed) < 0.002 ? 0 : speed);
  };
  const st = ScrollTrigger.create({
    trigger: el,
    start: 'top bottom',
    end: 'bottom top',
    onToggle: (self) => {
      if (self.isActive) {
        tween.play();
        gsap.ticker.add(tick);
      } else {
        tween.pause();
        gsap.ticker.remove(tick);
      }
    },
    onUpdate: (self) => {
      boost = Math.max(boost, Math.min(Math.abs(self.getVelocity()) / 400, 3));
    },
  });
  if (!st.isActive) tween.pause();
  else gsap.ticker.add(tick);
  const onEnter = () => {
    hovering = true;
  };
  const onLeave = () => {
    hovering = false;
  };
  el.addEventListener('pointerenter', onEnter);
  el.addEventListener('pointerleave', onLeave);
  el.dataset.motionState = 'done';
  return () => {
    el.removeEventListener('pointerenter', onEnter);
    el.removeEventListener('pointerleave', onLeave);
    gsap.ticker.remove(tick);
    st.kill();
    tween.kill();
  };
};
