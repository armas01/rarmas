import site from '../data/site.json';

export type TrackKind = 'view' | 'save' | 'share' | 'copy' | 'whatsapp';
export interface TrackData {
  page?: 'card' | 'pro' | 'life';
  event?: string | null;
  source?: 'qr' | 'link' | 'direct';
}

const OWNER_KEY = 'card:owner';

export function isOwnerDevice(win: Window = window): boolean {
  try {
    return win.localStorage.getItem(OWNER_KEY) === '1';
  } catch {
    return false;
  }
}

/** Only the real site counts (not localhost, previews or CI), and never when the visitor opts out. */
export function shouldTrack(win: Window, opts: { owner?: boolean } = {}): boolean {
  if (win.location.hostname !== site.analytics.host) return false;
  const nav = win.navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.doNotTrack === '1' || nav.globalPrivacyControl) return false;
  // The owner's own visits don't count; the owner's share actions do.
  return opts.owner ? true : !isOwnerDevice(win);
}

/**
 * Anonymous event: what happened, which page, which ?met= event, QR or link, and the
 * browser language. No IP, user agent, cookies or identifiers are stored.
 */
export function track(
  kind: TrackKind,
  data: TrackData = {},
  win: Window = window,
  opts: { owner?: boolean } = {},
) {
  if (!shouldTrack(win, opts)) return;
  const body = {
    kind,
    page: data.page ?? 'card',
    event: data.event || null,
    source: data.source ?? 'direct',
    lang: (win.navigator.language || '').slice(0, 5) || null,
  };
  try {
    void win
      .fetch(`${site.analytics.url}/rest/v1/card_events`, {
        method: 'POST',
        keepalive: true,
        headers: {
          apikey: site.analytics.key,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(body),
      })
      .catch(() => {});
  } catch {
    /* never let stats break the page */
  }
}
