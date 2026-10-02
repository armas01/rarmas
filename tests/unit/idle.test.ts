import { describe, it, expect } from 'vitest';
import { pauseOffscreen } from '../../src/motion/idle';

describe('pauseOffscreen', () => {
  it('marks off-screen sections idle and clears the mark on cleanup', () => {
    document.body.innerHTML = '<main><section id="a"></section><section id="b"></section></main>';
    let cb!: (entries: { target: Element; isIntersecting: boolean }[]) => void;
    const observed: Element[] = [];
    const fakeWin = {
      IntersectionObserver: class {
        constructor(fn: typeof cb) {
          cb = fn;
        }
        observe(el: Element) {
          observed.push(el);
        }
        disconnect() {}
      },
    } as unknown as Window;
    const stop = pauseOffscreen(document, fakeWin);
    expect(observed).toHaveLength(2);
    const [a, b] = observed;
    cb([
      { target: a, isIntersecting: true },
      { target: b, isIntersecting: false },
    ]);
    expect(a.hasAttribute('data-idle')).toBe(false);
    expect(b.hasAttribute('data-idle')).toBe(true);
    stop();
    expect(b.hasAttribute('data-idle')).toBe(false);
  });
});
