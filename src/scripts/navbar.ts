import { scrollToTarget } from '../motion/lenis';

const FOCUSABLE = 'a[href], button:not([disabled])';

export function initNavbar(root: HTMLElement, win: Window = window): () => void {
  const doc = win.document;
  const html = doc.documentElement;
  const toggle = root.querySelector<HTMLButtonElement>('.nav-toggle');
  const overlay = root.querySelector<HTMLElement>('#mobile-menu');
  const indicator = root.querySelector<HTMLElement>('.nav-indicator');
  const navLinks = Array.from(root.querySelectorAll<HTMLAnchorElement>('nav a[href^="#"]'));
  let lastY = win.scrollY;
  let ticking = false;
  let open = false;
  let observer: IntersectionObserver | null = null;

  const isOpen = () => open;

  const update = () => {
    ticking = false;
    const y = win.scrollY;
    root.dataset.state = y < 40 ? 'top' : 'floating';
    const max = doc.documentElement.scrollHeight - win.innerHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, y / max)) : 0;
    root.style.setProperty('--progress', String(p));
    const delta = y - lastY;
    if (isOpen() || root.contains(doc.activeElement)) {
      root.removeAttribute('data-hidden');
    } else if (delta > 8 && y > 400) {
      root.setAttribute('data-hidden', '');
    } else if (delta < 0) {
      root.removeAttribute('data-hidden');
    }
    if (Math.abs(delta) > 8 || delta < 0) lastY = y;
  };
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    win.requestAnimationFrame(update);
  };

  const setActive = (id: string | null) => {
    let active: HTMLAnchorElement | null = null;
    for (const a of navLinks) {
      const on = id !== null && a.getAttribute('href') === `#${id}`;
      if (on) {
        a.setAttribute('aria-current', 'true');
        active = a;
      } else a.removeAttribute('aria-current');
    }
    if (indicator) {
      if (active) {
        indicator.style.setProperty('--ind-x', `${active.offsetLeft}px`);
        indicator.style.setProperty('--ind-w', `${active.offsetWidth}px`);
        indicator.dataset.active = 'true';
      } else {
        delete indicator.dataset.active;
      }
    }
  };

  if ('IntersectionObserver' in win && navLinks.length) {
    const ids = new Set(navLinks.map((a) => a.getAttribute('href')!.slice(1)));
    const sections = Array.from(doc.querySelectorAll<HTMLElement>('section[id]')).filter((s) =>
      ids.has(s.id),
    );
    observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    sections.forEach((s) => observer!.observe(s));
  }

  const setMenu = (next: boolean, restoreFocus = true) => {
    if (!toggle || !overlay || next === open) return;
    open = next;
    toggle.setAttribute('aria-expanded', String(next));
    overlay.toggleAttribute('hidden', !next);
    html.classList.toggle('menu-open', next);
    if (next) {
      root.removeAttribute('data-hidden');
      overlay.querySelector<HTMLElement>('a')?.focus();
    } else if (restoreFocus) {
      toggle.focus();
    }
  };

  const onToggle = () => setMenu(!open);

  const onLinkClick = (e: Event) => {
    const a = (e.target as Element).closest?.<HTMLAnchorElement>('a[href^="#"]');
    if (!a || !root.contains(a)) return;
    const hash = a.getAttribute('href')!;
    if (hash.length < 2) return;
    e.preventDefault();
    setMenu(false, false);
    scrollToTarget(hash);
    win.history.replaceState(null, '', hash);
  };

  const onKey = (e: KeyboardEvent) => {
    if (!open || !overlay || !toggle) return;
    if (e.key === 'Escape') {
      setMenu(false);
      return;
    }
    if (e.key !== 'Tab') return;
    const items = [toggle, ...Array.from(overlay.querySelectorAll<HTMLElement>(FOCUSABLE))];
    const first = items[0];
    const last = items[items.length - 1];
    const cur = doc.activeElement;
    if (e.shiftKey && (cur === first || !items.includes(cur as HTMLElement))) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && (cur === last || !items.includes(cur as HTMLElement))) {
      e.preventDefault();
      first.focus();
    }
  };

  const mq = win.matchMedia('(min-width: 768px)');
  const onMq = (e: MediaQueryListEvent) => {
    if (e.matches) setMenu(false, false);
  };

  toggle?.addEventListener('click', onToggle);
  root.addEventListener('click', onLinkClick);
  doc.addEventListener('keydown', onKey);
  win.addEventListener('scroll', onScroll, { passive: true });
  win.addEventListener('resize', onScroll, { passive: true });
  mq.addEventListener?.('change', onMq);
  update();

  return () => {
    toggle?.removeEventListener('click', onToggle);
    root.removeEventListener('click', onLinkClick);
    doc.removeEventListener('keydown', onKey);
    win.removeEventListener('scroll', onScroll);
    win.removeEventListener('resize', onScroll);
    mq.removeEventListener?.('change', onMq);
    observer?.disconnect();
    html.classList.remove('menu-open');
  };
}
