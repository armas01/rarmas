/**
 * Marks sections that are off-screen with [data-idle] so their infinite CSS animations
 * (orbs, bento visuals, scroll cue) pause instead of ticking where nobody can see them.
 */
export function pauseOffscreen(root: ParentNode = document, win: Window = window): () => void {
  const IO = (win as Window & { IntersectionObserver?: typeof IntersectionObserver }).IntersectionObserver;
  if (!IO) return () => {};
  const sections = Array.from(root.querySelectorAll<HTMLElement>('main > section'));
  const io = new IO(
    (entries: IntersectionObserverEntry[]) => {
      for (const e of entries) e.target.toggleAttribute('data-idle', !e.isIntersecting);
    },
    { rootMargin: '200px 0px' },
  );
  sections.forEach((s) => io.observe(s));
  return () => {
    io.disconnect();
    sections.forEach((s) => s.removeAttribute('data-idle'));
  };
}
