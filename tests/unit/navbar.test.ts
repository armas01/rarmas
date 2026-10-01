import { describe, it, expect, vi, beforeEach } from 'vitest';
vi.mock('../../src/motion/lenis', () => ({ scrollToTarget: vi.fn() }));
import { scrollToTarget } from '../../src/motion/lenis';
import { initNavbar } from '../../src/scripts/navbar';

function mount() {
  document.body.innerHTML = `
    <header data-nav data-state="top">
      <nav aria-label="Main"><a href="#about">About</a><a href="#work">Work</a><span class="nav-indicator"></span></nav>
      <button class="nav-toggle" aria-expanded="false" aria-controls="mobile-menu">Menu</button>
      <div id="mobile-menu" hidden><a href="#about">About</a><a href="#work">Work</a></div>
    </header>
    <section id="about"></section><section id="work"></section>`;
  return document.querySelector<HTMLElement>('[data-nav]')!;
}
beforeEach(() => {
  document.documentElement.className = '';
});

describe('navbar', () => {
  it('toggles the mobile menu with aria and scroll lock', () => {
    const root = mount();
    initNavbar(root);
    const toggle = root.querySelector<HTMLButtonElement>('.nav-toggle')!;
    toggle.click();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(root.querySelector('#mobile-menu')!.hasAttribute('hidden')).toBe(false);
    expect(document.documentElement.classList.contains('menu-open')).toBe(true);
    expect(document.activeElement).toBe(root.querySelector('#mobile-menu a'));
  });
  it('Escape closes the menu and returns focus', () => {
    const root = mount();
    initNavbar(root);
    const toggle = root.querySelector<HTMLButtonElement>('.nav-toggle')!;
    toggle.click();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(document.documentElement.classList.contains('menu-open')).toBe(false);
    expect(document.activeElement).toBe(toggle);
  });
  it('link click scrolls via scrollToTarget and closes menu', () => {
    const root = mount();
    initNavbar(root);
    root.querySelector<HTMLButtonElement>('.nav-toggle')!.click();
    root.querySelector<HTMLAnchorElement>('#mobile-menu a[href="#work"]')!.click();
    expect(scrollToTarget).toHaveBeenCalledWith('#work');
    expect(root.querySelector('#mobile-menu')!.hasAttribute('hidden')).toBe(true);
  });
  it('cleanup removes document listeners', () => {
    const root = mount();
    const remove = vi.spyOn(document, 'removeEventListener');
    initNavbar(root)();
    expect(remove).toHaveBeenCalledWith('keydown', expect.any(Function));
  });
});
