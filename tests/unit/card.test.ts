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
