// Visitor-side card behaviour. Owner tools (share sheet, QR, stats) live in card-owner.ts and
// are only downloaded on the owner's devices.
import { track } from './track';
import { ADMIN_KEY, OWNER_KEY, cleanEvent, read, write } from './card-shared';

export { cleanEvent, cardLink, shareMessage } from './card-shared';

/**
 * Audience: visitors only see the card, Save contact and links. The owner's device unlocks the
 * owner tools once via ?admin=<key> (tools + stats) or ?admin / ?me (tools only). The flags are
 * stripped from the URL and remembered locally. Tools reveal nothing private; stats need the key.
 */
export function resolveOwner(win: Window): boolean {
  const url = new URL(win.location.href);
  const p = url.searchParams;
  if (p.has('admin') || p.has('me')) {
    write(win, OWNER_KEY, '1');
    const key = p.get('admin');
    if (key) write(win, ADMIN_KEY, key);
    p.delete('admin');
    p.delete('me');
    win.history.replaceState(null, '', url.pathname + (url.search || '') + url.hash);
  }
  return read(win, OWNER_KEY) === '1';
}

export function initCard(doc: Document, win: Window): void {
  const root = doc.querySelector<HTMLElement>('[data-card]');
  const owner = resolveOwner(win);
  root?.toggleAttribute('data-owner-mode', owner);
  doc.querySelectorAll<HTMLElement>('[data-owner]').forEach((el) => (el.hidden = !owner));
  doc.querySelector('[data-owner-exit]')?.addEventListener('click', () => {
    write(win, OWNER_KEY, '');
    write(win, ADMIN_KEY, '');
    win.location.replace(win.location.pathname + win.location.search);
  });

  // Greeting for visitors: rarmas.cl/card/?met=BCG → "Great meeting you at BCG"
  const params = new URLSearchParams(win.location.search);
  const met = cleanEvent(params.get('met'));
  const greet = doc.querySelector<HTMLElement>('[data-greeting]');
  if (greet && met) {
    greet.textContent = (root?.dataset.greetingTemplate ?? '{event}').replace('{event}', met);
    greet.hidden = false;
  }

  // Anonymous stats: a view, and whether they saved the contact
  const source = params.get('src') === 'qr' ? 'qr' : met ? 'link' : 'direct';
  track('view', { page: 'card', event: met, source }, win);
  doc
    .querySelector('a[href$=".vcf"]')
    ?.addEventListener('click', () => track('save', { page: 'card', event: met, source }, win));
  if (params.has('src')) {
    params.delete('src');
    const q = params.toString();
    win.history.replaceState(null, '', win.location.pathname + (q ? `?${q}` : '') + win.location.hash);
  }

  if (owner) {
    void import('./card-owner').then((m) => m.initOwner(doc, win, root));
  }

  // Offline: cache the card so it opens instantly even with bad signal at events
  if ('serviceWorker' in win.navigator && win.location.protocol === 'https:') {
    win.navigator.serviceWorker.register('/card/sw.js', { scope: '/card/' }).catch(() => {});
  }
}
