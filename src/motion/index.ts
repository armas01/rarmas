import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { createRegistry } from './registry';
import { startLenis } from './lenis';
import { modules, reducedSafe } from './modules/index';
import { reducedMotion, finePointer } from './prefers';
import { pauseOffscreen } from './idle';

export interface BootEnv {
  reduced: boolean;
  fontsReady: Promise<unknown>;
  win: Window;
}

export function boot(env: BootEnv) {
  gsap.registerPlugin(ScrollTrigger, SplitText);
  // ScrollTrigger already refreshes on real resizes; skip the ones caused by mobile URL bars.
  ScrollTrigger.config({ ignoreMobileResize: true });
  gsap.config({ force3D: 'auto' });
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
  const stopIdle = pauseOffscreen(document, env.win);
  document.documentElement.classList.add('motion-ready');
  env.fontsReady.then(() => ScrollTrigger.refresh());
  return {
    destroy() {
      stopIdle();
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
