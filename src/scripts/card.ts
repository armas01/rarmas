/** Keep only letters, digits and a little punctuation; cap the length. Rendered via textContent. */
export function cleanEvent(raw: string | null): string {
  if (!raw) return '';
  return raw
    .replace(/[^\p{L}\p{N} .&'’-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
}

export function initCard(doc: Document, win: Window): void {
  // Greeting: rarmas.cl/card/?met=BCG → "Great meeting you at BCG"
  const greet = doc.querySelector<HTMLElement>('[data-greeting]');
  const event = cleanEvent(new URLSearchParams(win.location.search).get('met'));
  if (greet && event) {
    greet.textContent = (greet.dataset.template ?? '{event}').replace('{event}', event);
    greet.hidden = false;
  }

  // Flip between the card and its QR side
  const flip = doc.querySelector<HTMLElement>('[data-flip]');
  const toggle = doc.querySelector<HTMLButtonElement>('[data-flip-toggle]');
  const label = toggle?.querySelector<HTMLElement>('[data-flip-label]');
  const front = flip?.querySelector<HTMLElement>('.front');
  const back = flip?.querySelector<HTMLElement>('.back');
  const frontLabel = label?.textContent ?? '';
  const setFlipped = (on: boolean) => {
    if (!flip || !toggle) return;
    flip.toggleAttribute('data-flipped', on);
    toggle.setAttribute('aria-pressed', String(on));
    if (label) label.textContent = on ? (toggle.dataset.labelBack ?? frontLabel) : frontLabel;
    front?.setAttribute('aria-hidden', String(on));
    back?.setAttribute('aria-hidden', String(!on));
  };
  toggle?.addEventListener('click', () => setFlipped(!flip?.hasAttribute('data-flipped')));
  flip?.addEventListener('click', () => setFlipped(!flip.hasAttribute('data-flipped')));

  // Share: native share sheet when available, otherwise copy the link
  const share = doc.querySelector<HTMLButtonElement>('[data-share]');
  const shareLabel = share?.querySelector<HTMLElement>('[data-share-label]');
  const url = `${win.location.origin}/card/`;
  share?.addEventListener('click', async () => {
    const nav = win.navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
    try {
      if (nav.share) {
        await nav.share({ title: doc.title, text: 'Rodo Armas — contact card', url });
        return;
      }
      await nav.clipboard.writeText(url);
      if (shareLabel) {
        const prev = shareLabel.textContent;
        shareLabel.textContent = share.dataset.copied ?? 'Copied';
        win.setTimeout(() => (shareLabel.textContent = prev), 2000);
      }
    } catch {
      /* share sheet dismissed */
    }
  });

  // Offline: cache the card so it opens instantly even with bad signal at events
  if ('serviceWorker' in win.navigator && win.location.protocol === 'https:') {
    win.navigator.serviceWorker.register('/card/sw.js', { scope: '/card/' }).catch(() => {});
  }
}
