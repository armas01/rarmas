export const CARD_URL = 'https://rarmas.cl/card/';
export const EVENT_KEY = 'card:lastEvent';
export const OWNER_KEY = 'card:owner';
export const ADMIN_KEY = 'card:adminKey';

/** Keep only letters, digits and a little punctuation; cap the length. Rendered via textContent. */
export function cleanEvent(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/[^\p{L}\p{N} .&'’-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 40);
}

/** The link to send someone you met: rarmas.cl/card/?met=Event (src=qr when it goes into a QR code). */
export function cardLink(event: string, opts: { qr?: boolean; base?: string } = {}): string {
  const e = cleanEvent(event);
  const params: string[] = [];
  if (e) params.push(`met=${encodeURIComponent(e).replace(/%20/g, '+')}`);
  if (opts.qr) params.push('src=qr');
  return (opts.base ?? CARD_URL) + (params.length ? `?${params.join('&')}` : '');
}

/** Message used for WhatsApp and the native share sheet. */
export function shareMessage(event: string, withEvent: string, plain: string): string {
  const e = cleanEvent(event);
  return e ? withEvent.replace('{event}', e) : plain;
}

export function read(win: Window, key: string): string {
  try {
    return win.localStorage.getItem(key) ?? '';
  } catch {
    return '';
  }
}
export function write(win: Window, key: string, v: string): void {
  try {
    if (v) win.localStorage.setItem(key, v);
    else win.localStorage.removeItem(key);
  } catch {
    /* storage unavailable: just don't remember */
  }
}

/** Copy with the async Clipboard API, falling back to a selected field + execCommand. */
export async function copyText(
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
    field.value = text;
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
