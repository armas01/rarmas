import type { APIRoute } from 'astro';
import site from '../data/site.json';
import { content } from '../content/schema';

/** vCard 3.0 escaping for text values. */
const esc = (v: string) =>
  v
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/([,;])/g, '\\$1');

export function buildVCard(): string {
  const { card } = content;
  const org = card.org.split('·')[0].trim();
  const lines = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'N:Armas Saenz;Rodolfo;;;',
    `FN:${esc(card.name)}`,
    `NICKNAME:Rodo`,
    `ORG:${esc(org)}`,
    `TITLE:${esc(card.role)}`,
    `EMAIL;TYPE=INTERNET,PREF:${site.identity.email}`,
    `URL:https://rarmas.cl`,
    `X-SOCIALPROFILE;TYPE=linkedin:${site.links.linkedin}`,
    `X-SOCIALPROFILE;TYPE=instagram:${site.links.instagram}`,
    `ADR;TYPE=WORK:;;;Santiago;;;Chile`,
    `NOTE:${esc(`${card.tagline} LinkedIn: ${site.links.linkedin} · Instagram: ${site.links.instagram}`)}`,
    'END:VCARD',
  ];
  return lines.join('\r\n') + '\r\n';
}

export const GET: APIRoute = () =>
  new Response(buildVCard(), { headers: { 'Content-Type': 'text/vcard; charset=utf-8' } });
