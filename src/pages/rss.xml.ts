import type { APIRoute } from 'astro';
import { rankings } from '../lib/plugins';

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Feed of newly-indexed plugins — the low-effort way for people to follow the ecosystem. */
export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL('https://opendock.dev');
  const items = rankings.recent.slice(0, 50);

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>OpenDock — 新收录的 opencode 插件</title>
    <link>${base}</link>
    <description>最新发布并被 OpenDock 收录的 opencode 插件。</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${new URL('/rss.xml', base)}" rel="self" type="application/rss+xml" />
${items
  .map(
    (p) => `    <item>
      <title>${escape(p.title)}</title>
      <link>${new URL(`/plugins/${p.slug}`, base)}</link>
      <guid isPermaLink="true">${new URL(`/plugins/${p.slug}`, base)}</guid>
      <description>${escape(p.description ?? p.name)}</description>
      <category>${escape(p.category)}</category>
      ${p.createdAt ? `<pubDate>${new Date(p.createdAt).toUTCString()}</pubDate>` : ''}
    </item>`,
  )
  .join('\n')}
  </channel>
</rss>`;

  return new Response(xml, { headers: { 'content-type': 'application/rss+xml; charset=utf-8' } });
};
