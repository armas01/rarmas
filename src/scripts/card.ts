const CARD_URL = 'https://rarmas.cl/card/';
const EVENT_KEY = 'card:lastEvent';

/** Keep only letters, digits and a little punctuation; cap the length. Rendered via textContent. */
export function cleanEvent(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/[^\p{L}\p{N} .&'’-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
}

/** The link to send someone you met: rarmas.cl/card/?met=Event (or the plain card link). */
export function cardLink(event: string, base = CARD_URL): string {
  const e = cleanEvent(event);
  return e ? `${base}?met=${encodeURIComponent(e).replace(/%20/g, '+')}` : base;
}

/** Message used for WhatsApp and the native share sheet. */
export function shareMessage(event: string, withEvent: string, plain: string): string {
  const e = cleanEvent(event);
  return e ? withEvent.replace('{event}', e) : plain;
}

const store = {
  get(win: Window): string {
    try {
      return win.localStorage.getItem(EVENT_KEY) ?? '';
    } catch {
      return '';
    }
  },
  set(win: Window, v: string): void {
    try {
      if (v) win.localStorage.setItem(EVENT_KEY, v);
      else win.localStorage.removeItem(EVENT_KEY);
    } catch {
      /* storage unavailable: just don't remember */
    }
  },
};

/** Copy with the async Clipboard API, falling back to a selected field + execCommand. */
async function copyText(
  doc: Document,
  win: Window,
  text: string,
  field?: HTMLInputElement | null,
): Promise<boolean> {
  try {
    await win.navigator.clipboard.writeText(text);
    return true;
  } catch {
    /* blocked (permissions, unfocused document, insecure context): try the legacy path */
  }
  if (field) {
    field.focus();
    field.select();
    field.setSelectionRange(0, text.length);
    try {
      return doc.execCommand('copy');
    } catch {
      return false;
    }
  }
  return false;
}

export function initCard(doc: Document, win: Window): void {
  const root = doc.querySelector<HTMLElement>('[data-card]');
  const greetTemplate = root?.dataset.greetingTemplate ?? 'Great meeting you at {event}';

  // Greeting for visitors: rarmas.cl/card/?met=BCG → "Great meeting you at BCG"
  const greet = doc.querySelector<HTMLElement>('[data-greeting]');
  const metParam = cleanEvent(new URLSearchParams(win.location.search).get('met'));
  if (greet && metParam) {
    greet.textContent = greetTemplate.replace('{event}', metParam);
    greet.hidden = false;
  }

  // Flip between the card and its QR side
  const flip = doc.querySelector<HTMLElement>('[data-flip]');
  const toggle = doc.querySelector<HTMLButtonElement>('[data-flip-toggle]');
  const flipLabel = toggle?.querySelector<HTMLElement>('[data-flip-label]');
  const front = flip?.querySelector<HTMLElement>('.front');
  const back = flip?.querySelector<HTMLElement>('.back');
  const frontLabel = flipLabel?.textContent ?? '';
  const setFlipped = (on: boolean) => {
    if (!flip || !toggle) return;
    flip.toggleAttribute('data-flipped', on);
    toggle.setAttribute('aria-pressed', String(on));
    if (flipLabel) flipLabel.textContent = on ? (toggle.dataset.labelBack ?? frontLabel) : frontLabel;
    front?.setAttribute('aria-hidden', String(on));
    back?.setAttribute('aria-hidden', String(!on));
  };
  toggle?.addEventListener('click', () => setFlipped(!flip?.hasAttribute('data-flipped')));
  flip?.addEventListener('click', () => setFlipped(!flip.hasAttribute('data-flipped')));

  // The QR on the back follows the event you're sharing for (generated on demand, lazily).
  const qrBox = doc.querySelector<HTMLElement>('.qr');
  const qrUrl = doc.querySelector<HTMLElement>('.qr-url');
  const staticQr = qrBox?.innerHTML ?? '';
  const setQr = async (event: string) => {
    if (!qrBox) return;
    const link = cardLink(event);
    const e = cleanEvent(event);
    if (qrUrl) qrUrl.textContent = e ? `rarmas.cl/card · ${e}` : 'rarmas.cl/card';
    if (link === CARD_URL) {
      qrBox.innerHTML = staticQr;
      qrBox.setAttribute('aria-label', `QR code linking to ${link}`);
      return;
    }
    const { default: qrcode } = await import('qrcode-generator');
    const qr = qrcode(0, 'M');
    qr.addData(link);
    qr.make();
    qrBox.innerHTML = qr.createSvgTag({ cellSize: 4, margin: 0, scalable: true });
    qrBox.setAttribute('aria-label', `QR code linking to ${link}`);
  };

  // Share sheet: optional event name → personalised link → share / copy / WhatsApp / QR
  const sheet = doc.querySelector<HTMLDialogElement>('[data-share-sheet]');
  const open = doc.querySelector<HTMLButtonElement>('[data-share-open]');
  const input = doc.querySelector<HTMLInputElement>('[data-share-event]');
  const preview = doc.querySelector<HTMLElement>('[data-share-preview]');
  const linkField = doc.querySelector<HTMLInputElement>('[data-share-link]');
  const nativeBtn = doc.querySelector<HTMLButtonElement>('[data-share-native]');
  const copyBtn = doc.querySelector<HTMLButtonElement>('[data-share-copy]');
  const waLink = doc.querySelector<HTMLAnchorElement>('[data-share-whatsapp]');
  const qrBtn = doc.querySelector<HTMLButtonElement>('[data-share-qr]');
  const status = doc.querySelector<HTMLElement>('[data-share-status]');
  const msgEvent = root?.dataset.message ?? '{event}';
  const msgPlain = root?.dataset.messagePlain ?? '';
  const nav = win.navigator as Navigator & { share?: (d: ShareData) => Promise<void> };
  if (nativeBtn && typeof nav.share === 'function') nativeBtn.hidden = false;

  const current = () => cleanEvent(input?.value);
  const render = () => {
    const e = current();
    const link = cardLink(e);
    if (linkField) linkField.value = link;
    if (preview) {
      preview.hidden = !e;
      preview.textContent = e ? greetTemplate.replace('{event}', e) : '';
    }
    if (waLink) {
      waLink.href = `https://wa.me/?text=${encodeURIComponent(`${shareMessage(e, msgEvent, msgPlain)} ${link}`)}`;
    }
    if (status) status.textContent = '';
  };
  const say = (text: string) => {
    if (status) status.textContent = text;
  };

  open?.addEventListener('click', () => {
    if (!sheet) return;
    if (input && !input.value) input.value = store.get(win);
    render();
    if (typeof sheet.showModal === 'function') sheet.showModal();
    else sheet.setAttribute('open', '');
    input?.focus();
  });
  input?.addEventListener('input', render);
  input?.addEventListener('change', () => store.set(win, current()));
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') e.preventDefault();
  });
  sheet?.addEventListener('click', (e) => {
    if (e.target === sheet) sheet.close(); // tap on the backdrop
  });

  nativeBtn?.addEventListener('click', async () => {
    const e = current();
    store.set(win, e);
    try {
      await nav.share?.({ title: doc.title, text: shareMessage(e, msgEvent, msgPlain), url: cardLink(e) });
    } catch (err) {
      if ((err as Error)?.name === 'AbortError') return; // user closed the share sheet
      const ok = await copyText(doc, win, cardLink(e), linkField);
      say(ok ? (root?.dataset.copied ?? 'Copied') : (root?.dataset.copyFailed ?? ''));
    }
  });
  copyBtn?.addEventListener('click', async () => {
    const e = current();
    store.set(win, e);
    const ok = await copyText(doc, win, cardLink(e), linkField);
    say(ok ? (root?.dataset.copied ?? 'Copied') : (root?.dataset.copyFailed ?? ''));
  });
  waLink?.addEventListener('click', () => store.set(win, current()));
  qrBtn?.addEventListener('click', async () => {
    const e = current();
    store.set(win, e);
    await setQr(e);
    sheet?.close();
    setFlipped(true);
  });

  // Offline: cache the card so it opens instantly even with bad signal at events. Once the
  // page is idle, warm the QR chunk too so event QR codes still work offline later.
  if ('serviceWorker' in win.navigator && win.location.protocol === 'https:') {
    win.navigator.serviceWorker
      .register('/card/sw.js', { scope: '/card/' })
      .then(() => {
        const idle = (win as Window & { requestIdleCallback?: (cb: () => void) => number })
          .requestIdleCallback;
        (idle ?? ((cb: () => void) => win.setTimeout(cb, 2000)))(() => {
          import('qrcode-generator').catch(() => {});
        });
      })
      .catch(() => {});
  }
}
