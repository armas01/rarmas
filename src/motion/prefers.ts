const query = (q: string) => typeof matchMedia === 'function' && matchMedia(q).matches;

/**
 * Site owner's choice: play the full animations even when the OS asks for reduced motion.
 * Set to true to restore the gentle reduced-motion mode (fades only, no pinning or smooth scroll).
 */
export const RESPECT_REDUCED_MOTION = false;

export const reducedMotion = (): boolean =>
  RESPECT_REDUCED_MOTION && query('(prefers-reduced-motion: reduce)');
export const finePointer = (): boolean => query('(hover: hover) and (pointer: fine)');
