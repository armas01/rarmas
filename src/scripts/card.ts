const CARD_URL = 'https://rarmas.cl/card/';
const EVENT_KEY = 'card:lastEvent';
const OWNER_KEY = 'card:owner';
/** Opening rarmas.cl/card/?me on a device turns on the owner tools there (and strips the flag). */
const OWNER_PARAM = 'me';

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

function read(win: Window, key: string): string {
  try {
    return win.localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}
function write(win: Window, key: string, v: string): void {
  try {
    if (v) win.localStorage.setItem(key, v);
    else win.localStorage.removeItem(key);
  } catch {
    /* storage unavailable: just don't remember */
  }
}
const store = {
  get: (win: Window) => read(win, EVENT_KEY),
  set: (win: Window, v: string) => write(win, EVENT_KEY, v),
};

/**
 * Audience: visitors (anyone who received the card) only see the card, Save contact and links.
 * The owner's own device unlocks Share and QR once via ?me; the choice is stored locally.
 * This is presentation only, not access control: the owner tools reveal nothing private.
 */
export function resolveOwner(win: Window): boolean {
  const url = new URL(win.location.href);
  if (url.searchParams.has(OWNER_PARAM)) {
    write(win, OWNER_KEY, '1');
    url.searchParams.delete(OWNER_PARAM);
    win.history.replaceState(null, '', url.pathname + (url.search || '') + url.hash);
  }
  return read(win, OWNER_KEY) === '1';
}

/** Copy with the async Clipboard API, falling back to a selected field + execCommand. */
async function copyText(
  doc: Document,
  win: Window,
  text: string,
  field?: HTMLInputElement | HTMLTextAreaElement | null,
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
  const owner = resolveOwner(win);
  root?.toggleAttribute('data-owner-mode', owner);
  doc.querySelectorAll<HTMLElement>('[data-owner]').forEach((el) => (el.hidden = !owner));
  doc.querySelector('[data-owner-exit]')?.addEventListener('click', () => {
    write(win, OWNER_KEY, '');
    win.location.replace(win.location.pathname + win.location.search);
  });
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
  if (owner) flip?.addEventListener('click', () => setFlipped(!flip.hasAttribute('data-flipped')));

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
  const linkField = doc.querySelector<HTMLTextAreaElement>('[data-share-link]');
  const nativeBtn = doc.querySelector<HTMLButtonElement>('[data-share-native]');
  const copyBtn = doc.querySelector<HTMLButtonElement>('[data-share-copy]');
  const waLink = doc.querySelector<HTMLAnchorElement>('[data-share-whatsapp]');
  const qrBtn = doc.querySelector<HTMLButtonElement>('[data-share-qr]');
  const status = doc.querySelector<HTMLElement>('[data-share-status]');
  const msgEvent = root?.dataset.message ?? '{event}';
  const msgPlain = root?.dataset.messagePlain ?? '';
  const nav = win.navigator as Navigator & {
    share?: (d: ShareData) => Promise<void>;
    canShare?: (d: ShareData) => boolean;
  };
  // The OS share sheet is reliable on phones; on desktops it's often missing or a no-op.
  const coarse = typeof win.matchMedia === 'function' && win.matchMedia('(pointer: coarse)').matches;
  const canNative = typeof nav.share === 'function' && coarse && (nav.canShare?.({ url: CARD_URL }) ?? true);
  if (nativeBtn) nativeBtn.hidden = !canNative;

  const current = () => cleanEvent(input?.value);
  const render = () => {
    const e = current();
    const link = cardLink(e);
    if (linkField) linkField.value = link;
    if (preview) {
      preview.toggleAttribute('data-empty', !e);
      preview.textContent = e ? greetTemplate.replace('{event}', e) : (preview.dataset.none ?? '');
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

  const copyAndSay = async (e: string) => {
    const link = cardLink(e);
    const ok = await copyText(doc, win, link, linkField);
    // The link stays out of sight unless copying fails; then it's the only way to get it.
    say(
      ok
        ? (root?.dataset.copied ?? 'Copied')
        : `${root?.dataset.copyFailed ?? ''} ${link.replace(/^https:\/\//, '')}`,
    );
  };
  nativeBtn?.addEventListener('click', async () => {
    const e = current();
    store.set(win, e);
    const started = Date.now();
    try {
      // Called synchronously inside the tap so the browser keeps the user gesture.
      await nav.share!({ title: doc.title, text: shareMessage(e, msgEvent, msgPlain), url: cardLink(e) });
    } catch (err) {
      // A real "user closed the sheet" takes a moment; an instant rejection means the
      // browser refused, so fall back to copying instead of silently doing nothing.
      if ((err as Error)?.name === 'AbortError' && Date.now() - started > 600) return;
      await copyAndSay(e);
    }
  });
  copyBtn?.addEventListener('click', async () => {
    const e = current();
    store.set(win, e);
    await copyAndSay(e);
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
