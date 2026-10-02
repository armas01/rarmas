import { describe, it, expect } from 'vitest';
import { cleanEvent } from '../../src/scripts/card';
import { buildVCard } from '../../src/pages/rodo-armas.vcf';

describe('card', () => {
  it('cleans the ?met= event name', () => {
    expect(cleanEvent('BCG Case Competition')).toBe('BCG Case Competition');
    expect(cleanEvent('<img src=x onerror=alert(1)>')).toBe('img srcx onerroralert1');
    expect(cleanEvent('  Platanus   Hack  ')).toBe('Platanus Hack');
    expect(cleanEvent('Ñuñoa & Co.')).toBe('Ñuñoa & Co.');
    expect(cleanEvent('x'.repeat(80))).toHaveLength(40);
    expect(cleanEvent(null)).toBe('');
  });
  it('builds a valid vCard without a phone number', () => {
    const v = buildVCard();
    expect(v.startsWith('BEGIN:VCARD\r\nVERSION:3.0\r\n')).toBe(true);
    expect(v.trimEnd().endsWith('END:VCARD')).toBe(true);
    expect(v).toContain('EMAIL;TYPE=INTERNET,PREF:rodoarmas@gmail.com');
    expect(v).toContain('instagram.com/rodo_armass');
    expect(v).not.toMatch(/^TEL/m);
  });
});

describe('share links', () => {
  it('builds personalised card links', async () => {
    const { cardLink, shareMessage } = await import('../../src/scripts/card');
    expect(cardLink('')).toBe('https://rarmas.cl/card/');
    expect(cardLink('BCG Case Competition')).toBe('https://rarmas.cl/card/?met=BCG+Case+Competition');
    expect(cardLink('Ñuñoa & Co')).toBe('https://rarmas.cl/card/?met=%C3%91u%C3%B1oa+%26+Co');
    expect(new URL(cardLink('Ñuñoa & Co')).searchParams.get('met')).toBe('Ñuñoa & Co');
    expect(shareMessage('BCG', 'Great meeting you at {event}!', 'Hi')).toBe('Great meeting you at BCG!');
    expect(shareMessage('  ', 'x {event}', 'Hi')).toBe('Hi');
  });
});

describe('audience', () => {
  it('?me turns on owner mode, strips the flag from the URL and persists', async () => {
    const { resolveOwner } = await import('../../src/scripts/card');
    localStorage.clear();
    history.replaceState(null, '', '/card/?met=BCG');
    expect(resolveOwner(window)).toBe(false);
    history.replaceState(null, '', '/card/?me&met=BCG');
    expect(resolveOwner(window)).toBe(true);
    expect(location.search).toBe('?met=BCG');
    history.replaceState(null, '', '/card/');
    expect(resolveOwner(window)).toBe(true);
    localStorage.clear();
  });
});
