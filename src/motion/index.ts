import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { createRegistry } from './registry';
import { startLenis } from './lenis';
import { modules, reducedSafe } from './modules/index';
import { reducedMotion, finePointer } from './prefers';

export interface BootEnv {
  reduced: boolean;
  fontsReady: Promise<unknown>;
  win: Window;
}

export function boot(env: BootEnv) {
  gsap.registerPlugin(ScrollTrigger, SplitText);
  const lenis = env.reduced ? null : startLenis(gsap, ScrollTrigger);
  const registry = createRegistry({
    modules,
    deps: { gsap, ScrollTrigger, SplitText, finePointer: finePointer() },
    reduced: env.reduced,
    reducedSafe,
    onError: (name, error) => {
      if (import.meta.env.DEV) console.error(`[motion:${name}]`, error);
    },
  });
  registry.start();
  document.documentElement.classList.add('motion-ready');
  let timer: ReturnType<typeof setTimeout> | undefined;
  const onResize = () => {
    clearTimeout(timer);
    timer = setTimeout(() => ScrollTrigger.refresh(), 200);
  };
  env.fontsReady.then(() => ScrollTrigger.refresh());
  env.win.addEventListener('resize', onResize);
  return {
    destroy() {
      env.win.removeEventListener('resize', onResize);
      clearTimeout(timer);
      registry.destroy();
      lenis?.stop();
    },
  };
}

if (typeof window !== 'undefined' && !import.meta.env.VITEST) {
  boot({
    reduced: reducedMotion(),
    fontsReady: document.fonts?.ready ?? Promise.resolve(),
    win: window,
  });
}
