/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { modules } from '../../src/motion/modules/index';

function makeCtx(finePointer = true) {
  const kills: any[] = [];
  const tween = () => {
    const t = { kill: vi.fn(), scrollTrigger: { kill: vi.fn() } };
    kills.push(t);
    return t;
  };
  const quick = () => Object.assign(vi.fn(), { tween: { kill: vi.fn() } });
  const split = {
    words: [document.createElement('span'), document.createElement('span')],
    revert: vi.fn(),
  };
  const ctx: any = {
    gsap: {
      to: vi.fn(tween),
      from: vi.fn(tween),
      fromTo: vi.fn(tween),
      set: vi.fn(),
      quickTo: vi.fn(quick),
      killTweensOf: vi.fn(),
    },
    ScrollTrigger: { create: vi.fn(() => ({ kill: vi.fn() })) },
    SplitText: { create: vi.fn(() => split) },
    finePointer,
    options: {},
  };
  return { ctx, kills, split };
}
beforeEach(() => {
  document.body.innerHTML = '';
});

const names = [
  'reveal-words',
  'reveal-up',
  'scrub-words',
  'counter',
  'cursor-glow',
  'hero-scale',
  'magnetic',
  'tilt',
];

describe('modules A', () => {
  it('registers all names', () => {
    for (const n of names) expect(typeof modules[n]).toBe('function');
  });

  it.each(names)('%s returns a cleanup that kills its tweens', (name) => {
    document.body.innerHTML =
      '<div id="el" data-motion-to="10">Lorem ipsum dolor<span data-glow></span><span data-hero-frame></span></div>';
    const el = document.getElementById('el')!;
    const { ctx, kills, split } = makeCtx();
    ctx.options = { to: '10' };
    const cleanup = modules[name](el, ctx);
    expect(typeof cleanup).toBe('function');
    (cleanup as () => void)();
    for (const t of kills) expect(t.kill).toHaveBeenCalled();
    if (name.includes('words')) expect(split.revert).toHaveBeenCalled();
  });

  it('reveal-up with trigger=load has no scrollTrigger', () => {
    document.body.innerHTML = '<div id="el"></div>';
    const { ctx } = makeCtx();
    ctx.options = { trigger: 'load', delay: '0.5' };
    modules['reveal-up'](document.getElementById('el')!, ctx);
    const cfg = ctx.gsap.to.mock.calls[0][1];
    expect(cfg.scrollTrigger).toBeUndefined();
    expect(cfg.delay).toBe(0.5);
  });

  it.each(['magnetic', 'tilt', 'cursor-glow'])('%s removes pointer listeners on cleanup', (name) => {
    document.body.innerHTML = '<div id="el"><span data-glow></span></div>';
    const el = document.getElementById('el')!;
    const remove = vi.spyOn(el, 'removeEventListener');
    const { ctx } = makeCtx();
    (modules[name](el, ctx) as () => void)();
    expect(remove).toHaveBeenCalledWith('pointermove', expect.any(Function));
  });

  it.each(['magnetic', 'tilt', 'cursor-glow'])('%s is a no-op without a fine pointer', (name) => {
    document.body.innerHTML = '<div id="el"><span data-glow></span></div>';
    const el = document.getElementById('el')!;
    const add = vi.spyOn(el, 'addEventListener');
    const { ctx } = makeCtx(false);
    modules[name](el, ctx);
    expect(add).not.toHaveBeenCalled();
  });

  it('reveal-words keeps accessible text', () => {
    document.body.innerHTML = '<h1 id="el">Lorem ipsum dolor</h1>';
    const el = document.getElementById('el')!;
    modules['reveal-words'](el, makeCtx().ctx);
    expect(el.getAttribute('aria-label')).toBe('Lorem ipsum dolor');
  });

  it('reveal-words skips aria on non-headings', () => {
    document.body.innerHTML = '<p id="el">Lorem ipsum dolor</p>';
    const el = document.getElementById('el')!;
    const { ctx, split } = makeCtx();
    modules['reveal-words'](el, ctx);
    expect(el.hasAttribute('aria-label')).toBe(false);
    for (const w of split.words) expect(w.hasAttribute('aria-hidden')).toBe(false);
  });

  it('scrub-words keeps text readable', () => {
    document.body.innerHTML = '<p id="el">Lorem ipsum dolor</p>';
    const el = document.getElementById('el')!;
    const { ctx, split } = makeCtx();
    modules['scrub-words'](el, ctx);
    expect(el.hasAttribute('aria-label')).toBe(false);
    for (const w of split.words) expect(w.hasAttribute('aria-hidden')).toBe(false);
  });

  it('counter sets no aria-label, starts at 0 and restores final text on cleanup', () => {
    document.body.innerHTML = '<span id="el">98%</span>';
    const el = document.getElementById('el')!;
    const { ctx } = makeCtx();
    ctx.options = { to: '98', suffix: '%' };
    const cleanup = modules['counter'](el, ctx) as () => void;
    expect(el.hasAttribute('aria-label')).toBe(false);
    expect(el.textContent).toBe('0%');
    cleanup();
    expect(el.textContent).toBe('98%');
  });
});
