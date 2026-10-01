const query = (q: string) => typeof matchMedia === 'function' && matchMedia(q).matches;

export const reducedMotion = (): boolean => query('(prefers-reduced-motion: reduce)');
export const finePointer = (): boolean => query('(hover: hover) and (pointer: fine)');
