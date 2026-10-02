import { describe, it, expect, vi } from 'vitest';

const refresh = vi.fn();
const stConfig = vi.fn();
vi.mock('gsap', () => ({
  gsap: {
    registerPlugin: vi.fn(),
    config: vi.fn(),
    ticker: { add: vi.fn(), remove: vi.fn(), lagSmoothing: vi.fn() },
  },
}));
vi.mock('gsap/ScrollTrigger', () => ({
  ScrollTrigger: { refresh, config: stConfig, update: vi.fn(), getAll: () => [] },
}));
vi.mock('gsap/SplitText', () => ({ SplitText: {} }));
vi.mock('lenis', () => ({
  default: class {
    on() {}
    raf() {}
    destroy() {}
    scrollTo() {}
  },
}));
vi.mock('../../src/motion/modules/index', () => ({ modules: {}, reducedSafe: new Set<string>() }));

describe('boot', () => {
  it('adds motion-ready, refreshes after fonts load, and leaves resizes to ScrollTrigger', async () => {
    vi.useFakeTimers();
    const { boot } = await import('../../src/motion/index');
    let resolveFonts!: () => void;
    const fontsReady = new Promise<void>((r) => (resolveFonts = r));
    boot({ reduced: false, fontsReady, win: window });
    expect(document.documentElement.classList.contains('motion-ready')).toBe(true);
    resolveFonts();
    await fontsReady;
    await Promise.resolve();
    expect(refresh).toHaveBeenCalledTimes(1);
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('resize'));
    vi.advanceTimersByTime(250);
    // ScrollTrigger refreshes on real resizes itself; boot must not add a second refresh
    expect(refresh).toHaveBeenCalledTimes(1);
    expect(stConfig).toHaveBeenCalledWith({ ignoreMobileResize: true });
    vi.useRealTimers();
  });
  it('reduced: no lenis, still motion-ready', async () => {
    const { boot } = await import('../../src/motion/index');
    const r = boot({ reduced: true, fontsReady: Promise.resolve(), win: window });
    expect(document.documentElement.classList.contains('motion-ready')).toBe(true);
    r.destroy();
  });
});
