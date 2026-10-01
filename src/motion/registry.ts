import type { Cleanup, MotionContext, MotionModule } from './types';

export function revealFinal(el: HTMLElement): void {
  el.dataset.motionState = 'done';
  el.style.removeProperty('opacity');
  el.style.removeProperty('transform');
  el.style.removeProperty('visibility');
}

export function readOptions(el: HTMLElement): Record<string, string> {
  const out: Record<string, string> = {};
  for (const attr of Array.from(el.attributes)) {
    if (!attr.name.startsWith('data-motion-') || attr.name === 'data-motion-state') continue;
    const key = attr.name
      .slice('data-motion-'.length)
      .replace(/-([a-z0-9])/g, (_, c: string) => c.toUpperCase());
    out[key] = attr.value;
  }
  return out;
}

export interface RegistryOptions {
  modules: Record<string, MotionModule>;
  deps: Omit<MotionContext, 'options'>;
  reduced: boolean;
  root?: ParentNode;
  onError?: (name: string, error: unknown, el: HTMLElement) => void;
}

export function createRegistry(opts: RegistryOptions): { start(): void; destroy(): void } {
  const cleanups: Cleanup[] = [];
  let started = false;

  return {
    start() {
      if (started) return;
      started = true;
      const root = opts.root ?? document;
      const els = root.querySelectorAll<HTMLElement>('[data-motion]');
      els.forEach((el) => {
        if (opts.reduced) {
          revealFinal(el);
          return;
        }
        const names = (el.dataset.motion ?? '').split(/\s+/).filter(Boolean);
        const options = readOptions(el);
        for (const name of names) {
          const mod = opts.modules[name];
          if (!mod) {
            opts.onError?.(name, new Error('unknown motion module'), el);
            revealFinal(el);
            continue;
          }
          try {
            const cleanup = mod(el, { ...opts.deps, options });
            if (typeof cleanup === 'function') cleanups.push(cleanup);
          } catch (error) {
            opts.onError?.(name, error, el);
            revealFinal(el);
          }
        }
      });
    },
    destroy() {
      while (cleanups.length) {
        try {
          cleanups.pop()!();
        } catch {
          /* ignore */
        }
      }
      started = false;
    },
  };
}
