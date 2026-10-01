/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { modules } from '../../src/motion/modules/index';

function makeCtx() {
  const created: any[] = [];
  const tweens: any[] = [];
  const tween = () => {
    const t = { kill: vi.fn(), timeScale: vi.fn(), scrollTrigger: { kill: vi.fn() } };
    tweens.push(t);
    return t;
  };
  const ctx: any = {
    gsap: {
      to: vi.fn(tween),
      from: vi.fn(tween),
      fromTo: vi.fn(tween),
      set: vi.fn(),
      quickTo: vi.fn(() => vi.fn()),
      killTweensOf: vi.fn(),
    },
    ScrollTrigger: {
      create: vi.fn((cfg) => {
        const st = { cfg, kill: vi.fn() };
        created.push(st);
        return st;
      }),
    },
    SplitText: { create: vi.fn() },
    finePointer: true,
    options: {},
  };
  return { ctx, created, tweens };
}
beforeEach(() => {
  document.body.innerHTML = '';
});

describe('modules B', () => {
  it('pin-story sets active chapter and dot from progress', () => {
    document.body.innerHTML = `<div id="el">${[0, 1, 2, 3]
      .map(() => `<article data-chapter></article><button data-dot></button>`)
      .join('')}<div data-shape></div></div>`;
    const el = document.getElementById('el')!;
    const { ctx, created } = makeCtx();
    const cleanup = modules['pin-story'](el, ctx) as () => void;
    const pin = created.find((s) => s.cfg.pin);
    expect(pin).toBeTruthy();
    pin.cfg.onUpdate({ progress: 0.6 });
    expect(el.dataset.activeIndex).toBe('2');
    expect(el.querySelectorAll('[data-chapter]')[2].hasAttribute('data-active')).toBe(true);
    expect(el.querySelectorAll('[data-dot]')[2].getAttribute('aria-current')).toBe('step');
    pin.cfg.onUpdate({ progress: 1 });
    expect(el.dataset.activeIndex).toBe('3');
    cleanup();
    expect(pin.kill).toHaveBeenCalled();
  });
  it('stack-cards animates every card but the last and cleans up', () => {
    document.body.innerHTML =
      '<div id="el"><div data-card></div><div data-card></div><div data-card></div></div>';
    const { ctx, tweens } = makeCtx();
    const cleanup = modules['stack-cards'](document.getElementById('el')!, ctx) as () => void;
    expect(ctx.gsap.to).toHaveBeenCalledTimes(2);
    cleanup();
    tweens.forEach((t) => expect(t.kill).toHaveBeenCalled());
  });
  it('draw-line activates entries on enter and deactivates on leave back', () => {
    document.body.innerHTML =
      '<div id="el"><span data-line-fill></span><div data-entry></div><div data-entry></div></div>';
    const { ctx, created } = makeCtx();
    const cleanup = modules['draw-line'](document.getElementById('el')!, ctx) as () => void;
    const entry = document.querySelector('[data-entry]')!;
    const st = created.find((s) => s.cfg.trigger === entry);
    st.cfg.onEnter();
    expect(entry.hasAttribute('data-active')).toBe(true);
    st.cfg.onLeaveBack();
    expect(entry.hasAttribute('data-active')).toBe(false);
    cleanup();
    created.forEach((s) => expect(s.kill).toHaveBeenCalled());
  });
  it('marquee pauses on hover and cleans up listeners', () => {
    document.body.innerHTML = '<div id="el"><div data-track></div></div>';
    const el = document.getElementById('el')!;
    const remove = vi.spyOn(el, 'removeEventListener');
    const { ctx, tweens } = makeCtx();
    const cleanup = modules['marquee'](el, ctx) as () => void;
    el.dispatchEvent(new Event('pointerenter'));
    expect(tweens[0].timeScale).toHaveBeenCalledWith(0);
    cleanup();
    expect(tweens[0].kill).toHaveBeenCalled();
    expect(remove).toHaveBeenCalledWith('pointerenter', expect.any(Function));
  });
});
