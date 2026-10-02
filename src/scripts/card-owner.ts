// Owner-only tools, loaded lazily on the owner's devices: flip/QR, share sheet,
// print-ready QR downloads, and the stats panel (needs the admin key).
import qrcode from 'qrcode-generator';
import site from '../data/site.json';
import { track } from './track';
import {
  ADMIN_KEY,
  CARD_URL,
  EVENT_KEY,
  cardLink,
  cleanEvent,
  copyText,
  read,
  shareMessage,
  write,
} from './card-shared';

export function qrSvg(link: string, opts: { margin?: number } = {}): string {
  const qr = qrcode(0, 'M');
  qr.addData(link);
  qr.make();
  return qr.createSvgTag({ cellSize: 4, margin: opts.margin ?? 0, scalable: true });
}

function download(win: Window, doc: Document, blob: Blob, name: string) {
  const a = doc.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  doc.body.append(a);
  a.click();
  a.remove();
  win.setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

async function svgToPng(win: Window, doc: Document, svg: string, size = 1200): Promise<Blob | null> {
  const img = new Image();
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    await new Promise<void>((res, rej) => {
      img.onload = () => res();
      img.onerror = () => rej(new Error('svg load failed'));
      img.src = url;
    });
    const canvas = doc.createElement('canvas');
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, size, size);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, size, size);
    return await new Promise((res) => canvas.toBlob(res, 'image/png'));
  } finally {
    URL.revokeObjectURL(url);
  }
}

const slug = (s: string) =>
  s
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();

export function initOwner(doc: Document, win: Window, root: HTMLElement | null): void {
  const greetTemplate = root?.dataset.greetingTemplate ?? 'Great meeting you at {event}';

  // --- flip between the card and its QR side ---
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

  // --- the QR on the back follows the event you're sharing for ---
  const qrBox = doc.querySelector<HTMLElement>('.qr');
  const qrUrl = doc.querySelector<HTMLElement>('.qr-url');
  const staticQr = qrBox?.innerHTML ?? '';
  const setQr = (event: string) => {
    if (!qrBox) return;
    const e = cleanEvent(event);
    const link = cardLink(e, { qr: true });
    if (qrUrl) qrUrl.textContent = e ? `rarmas.cl/card · ${e}` : 'rarmas.cl/card';
    qrBox.innerHTML = e ? qrSvg(link) : staticQr;
    qrBox.setAttribute('aria-label', `QR code linking to ${link}`);
  };

  // --- share sheet ---
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
  const remember = () => write(win, EVENT_KEY, current());
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
  const copyAndSay = async (e: string) => {
    const link = cardLink(e);
    const ok = await copyText(doc, win, link, linkField);
    // The link stays out of sight unless copying fails; then it's the only way to get it.
    say(
      ok
        ? (root?.dataset.copied ?? 'Copied')
        : `${root?.dataset.copyFailed ?? ''} ${link.replace(/^https:\/\//, '')}`,
    );
    if (ok) track('copy', { event: e }, win, { owner: true });
  };

  open?.addEventListener('click', () => {
    if (!sheet) return;
    if (input && !input.value) input.value = read(win, EVENT_KEY);
    render();
    if (typeof sheet.showModal === 'function') sheet.showModal();
    else sheet.setAttribute('open', '');
    input?.focus();
  });
  input?.addEventListener('input', render);
  input?.addEventListener('change', remember);
  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') e.preventDefault();
  });
  sheet?.addEventListener('click', (e) => {
    if (e.target === sheet) sheet.close(); // tap on the backdrop
  });

  nativeBtn?.addEventListener('click', async () => {
    const e = current();
    remember();
    const started = Date.now();
    try {
      // Called synchronously inside the tap so the browser keeps the user gesture.
      await nav.share!({ title: doc.title, text: shareMessage(e, msgEvent, msgPlain), url: cardLink(e) });
      track('share', { event: e }, win, { owner: true });
    } catch (err) {
      // A real "user closed the sheet" takes a moment; an instant rejection means the
      // browser refused, so fall back to copying instead of silently doing nothing.
      if ((err as Error)?.name === 'AbortError' && Date.now() - started > 600) return;
      await copyAndSay(e);
    }
  });
  copyBtn?.addEventListener('click', async () => {
    remember();
    await copyAndSay(current());
  });
  waLink?.addEventListener('click', () => {
    remember();
    track('whatsapp', { event: current() }, win, { owner: true });
  });
  qrBtn?.addEventListener('click', () => {
    remember();
    setQr(current());
    sheet?.close();
    setFlipped(true);
  });

  // --- print-ready QR downloads (for the event in the share sheet, or the plain card) ---
  doc.querySelectorAll<HTMLButtonElement>('[data-qr-dl]').forEach((btn) =>
    btn.addEventListener('click', async () => {
      const e = current();
      remember();
      const svg = qrSvg(cardLink(e, { qr: true }), { margin: 4 });
      const name = `rarmas-card-qr${e ? `-${slug(e)}` : ''}`;
      if (btn.dataset.qrDl === 'svg') {
        download(win, doc, new Blob([svg], { type: 'image/svg+xml' }), `${name}.svg`);
      } else {
        const png = await svgToPng(win, doc, svg);
        if (png) download(win, doc, png, `${name}.png`);
      }
    }),
  );

  // --- stats (admin key only) ---
  const key = read(win, ADMIN_KEY);
  const panel = doc.querySelector<HTMLElement>('[data-admin]');
  if (key && panel) {
    panel.hidden = false;
    void loadStats(doc, win, panel, key, 30);
    panel.querySelectorAll<HTMLButtonElement>('[data-range]').forEach((b) =>
      b.addEventListener('click', () => {
        panel
          .querySelectorAll('[data-range]')
          .forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
        void loadStats(doc, win, panel, key, Number(b.dataset.range));
      }),
    );
  }
}

interface Stats {
  totals: Record<string, number>;
  bySource: Record<string, number>;
  byEvent: { event: string; views: number; saves: number; shares: number; last: string }[];
  byDay: { day: string; views: number; saves: number }[];
}

export async function fetchStats(win: Window, key: string, days: number): Promise<Stats> {
  const res = await win.fetch(`${site.analytics.url}/rest/v1/rpc/card_stats`, {
    method: 'POST',
    headers: { apikey: site.analytics.key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ admin_key: key, days }),
  });
  if (!res.ok) throw new Error(res.status === 401 || res.status === 403 ? 'key' : `http ${res.status}`);
  return (await res.json()) as Stats;
}

function el<K extends keyof HTMLElementTagNameMap>(doc: Document, tag: K, cls?: string, text?: string) {
  const n = doc.createElement(tag);
  if (cls) n.className = cls;
  if (text !== undefined) n.textContent = text;
  return n;
}

async function loadStats(doc: Document, win: Window, panel: HTMLElement, key: string, days: number) {
  const body = panel.querySelector<HTMLElement>('[data-admin-body]');
  if (!body) return;
  body.setAttribute('aria-busy', 'true');
  let s: Stats;
  try {
    s = await fetchStats(win, key, days);
  } catch (err) {
    body.replaceChildren(
      el(
        doc,
        'p',
        'admin-msg',
        (err as Error).message === 'key'
          ? 'This admin key was not accepted. Open your private ?admin link again.'
          : "Couldn't load stats right now.",
      ),
    );
    body.removeAttribute('aria-busy');
    return;
  }
  const t = s.totals ?? {};
  const shares = (t.share ?? 0) + (t.copy ?? 0) + (t.whatsapp ?? 0);
  const tiles = el(doc, 'div', 'tiles');
  for (const [label, n] of [
    ['Card views', t.view ?? 0],
    ['Contacts saved', t.save ?? 0],
    ['Links you shared', shares],
  ] as const) {
    const tile = el(doc, 'div', 'tile');
    tile.append(el(doc, 'b', '', String(n)), el(doc, 'span', '', label));
    tiles.append(tile);
  }

  const src = s.bySource ?? {};
  const srcLine = el(
    doc,
    'p',
    'admin-sub',
    `Views from QR: ${src.qr ?? 0} · from links: ${src.link ?? 0} · direct: ${src.direct ?? 0}`,
  );

  // daily bars
  const max = Math.max(1, ...s.byDay.map((d) => d.views));
  const bars = el(doc, 'div', 'bars');
  bars.setAttribute('role', 'img');
  bars.setAttribute('aria-label', `Card views per day, last ${days} days`);
  for (const d of s.byDay) {
    const bar = el(doc, 'span', 'bar');
    bar.style.setProperty('--h', `${Math.round((d.views / max) * 100)}%`);
    bar.title = `${d.day}: ${d.views} views, ${d.saves} saves`;
    bars.append(bar);
  }

  // per-event table
  const table = el(doc, 'table', 'events');
  const head = el(doc, 'tr');
  for (const h of ['Event', 'Views', 'Saves', 'Shares']) head.append(el(doc, 'th', '', h));
  const thead = el(doc, 'thead');
  thead.append(head);
  const tbody = el(doc, 'tbody');
  for (const r of s.byEvent) {
    const tr = el(doc, 'tr');
    tr.append(
      el(doc, 'td', '', r.event || 'No event (plain link)'),
      el(doc, 'td', '', String(r.views)),
      el(doc, 'td', '', String(r.saves)),
      el(doc, 'td', '', String(r.shares)),
    );
    tbody.append(tr);
  }
  table.append(thead, tbody);

  const empty = !s.byEvent.length;
  body.replaceChildren(
    tiles,
    srcLine,
    ...(empty ? [el(doc, 'p', 'admin-msg', 'No activity yet in this period.')] : [bars, table]),
  );
  body.removeAttribute('aria-busy');
}
