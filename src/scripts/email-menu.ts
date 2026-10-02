/**
 * Every mailto: link opens a small menu instead of assuming a mail app is set up:
 * Mail app, Gmail, Outlook, or copy the address. Modifier-clicks keep native behaviour.
 */
export async function copyText(win: Window, doc: Document, text: string): Promise<boolean> {
  try {
    await win.navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = doc.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
    doc.body.append(ta);
    ta.select();
    let ok = false;
    try {
      ok = doc.execCommand('copy');
    } catch {
      ok = false;
    }
    ta.remove();
    return ok;
  }
}

export function initEmailMenu(doc: Document, win: Window = window): void {
  const menu = doc.querySelector<HTMLDialogElement>('[data-email-menu]');
  if (!menu || typeof menu.showModal !== 'function') return;
  const status = menu.querySelector<HTMLElement>('[data-email-status]');
  const copyBtn = menu.querySelector<HTMLButtonElement>('[data-email-copy]');
  const address = (menu.querySelector<HTMLAnchorElement>('[data-email-opt="app"]')?.href ?? '').replace(
    /^mailto:/,
    '',
  );

  doc.addEventListener('click', (e) => {
    const a = (e.target as Element | null)?.closest?.<HTMLAnchorElement>('a[href^="mailto:"]');
    if (!a || menu.contains(a)) return;
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    if (status) status.textContent = '';
    menu.showModal();
    doc.dispatchEvent(new CustomEvent('email-menu:open'));
  });
  menu.addEventListener('click', (e) => {
    if (e.target === menu) menu.close(); // backdrop
    const opt = (e.target as Element).closest?.('[data-email-opt]');
    if (opt) {
      doc.dispatchEvent(new CustomEvent('email-menu:choose', { detail: opt.getAttribute('data-email-opt') }));
      win.setTimeout(() => menu.close(), 150);
    }
  });
  copyBtn?.addEventListener('click', async () => {
    const ok = await copyText(win, doc, address);
    if (status)
      status.textContent = ok ? (copyBtn.dataset.copied ?? '') : `${copyBtn.dataset.failed ?? ''} ${address}`;
    doc.dispatchEvent(new CustomEvent('email-menu:choose', { detail: 'copy' }));
  });
}
