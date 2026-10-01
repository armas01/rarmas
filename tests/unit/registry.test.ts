/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createRegistry, readOptions, revealFinal } from '../../src/motion/registry';

const deps = { gsap: {} as any, ScrollTrigger: {} as any, SplitText: {} as any, finePointer: true };
beforeEach(() => {
  document.body.innerHTML = '';
});

describe('registry', () => {
  it('runs each named module once per element, with options', () => {
    document.body.innerHTML =
      '<div data-motion="a b" data-motion-delay="0.2"></div><div data-motion="a"></div>';
    const a = vi.fn();
    const b = vi.fn();
    createRegistry({ modules: { a, b }, deps, reduced: false }).start();
    expect(a).toHaveBeenCalledTimes(2);
    expect(b).toHaveBeenCalledTimes(1);
    expect(a.mock.calls[0][1].options).toEqual({ delay: '0.2' });
  });
  it('calls cleanups on destroy', () => {
    document.body.innerHTML = '<div data-motion="a"></div>';
    const cleanup = vi.fn();
    const r = createRegistry({ modules: { a: () => cleanup }, deps, reduced: false });
    r.start();
    r.destroy();
    expect(cleanup).toHaveBeenCalledOnce();
  });
  it('isolates a throwing module and reveals its element', () => {
    document.body.innerHTML = '<div id="x" data-motion="boom ok"></div>';
    const ok = vi.fn();
    const onError = vi.fn();
    createRegistry({
      modules: {
        boom: () => {
          throw new Error('x');
        },
        ok,
      },
      deps,
      reduced: false,
      onError,
    }).start();
    expect(onError).toHaveBeenCalledWith('boom', expect.any(Error), expect.any(HTMLElement));
    expect(ok).toHaveBeenCalled();
    expect(document.getElementById('x')!.dataset.motionState).toBe('done');
  });
  it('does not run modules when reduced, and marks elements done', () => {
    document.body.innerHTML = '<div id="x" data-motion="a"></div>';
    const a = vi.fn();
    createRegistry({ modules: { a }, deps, reduced: true }).start();
    expect(a).not.toHaveBeenCalled();
    expect(document.getElementById('x')!.dataset.motionState).toBe('done');
  });
  it('ignores unknown module names but reveals element', () => {
    document.body.innerHTML = '<div id="x" data-motion="nope"></div>';
    const onError = vi.fn();
    createRegistry({ modules: {}, deps, reduced: false, onError }).start();
    expect(document.getElementById('x')!.dataset.motionState).toBe('done');
  });
  it('start is idempotent', () => {
    document.body.innerHTML = '<div data-motion="a"></div>';
    const a = vi.fn();
    const r = createRegistry({ modules: { a }, deps, reduced: false });
    r.start();
    r.start();
    expect(a).toHaveBeenCalledOnce();
  });
  it('readOptions camelCases data-motion-* except data-motion itself', () => {
    const el = document.createElement('div');
    el.setAttribute('data-motion', 'a');
    el.setAttribute('data-motion-stagger-each', '0.1');
    el.setAttribute('data-motion-state', 'x');
    expect(readOptions(el)).toEqual({ staggerEach: '0.1' });
  });
  it('revealFinal clears inline styles', () => {
    const el = document.createElement('div');
    el.style.opacity = '0';
    el.style.transform = 'translateY(5px)';
    revealFinal(el);
    expect(el.style.opacity).toBe('');
    expect(el.style.transform).toBe('');
  });
});
