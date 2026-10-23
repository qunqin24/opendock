import { plugins } from './plugins';
import { pluginDescription, type Locale } from './i18n';

/** Shared by nearly every avatar; the palette adds it back. */
const AVATAR_HOST = 'https://avatars.githubusercontent.com/';

/** Carried by ~98% of packages, so they match everything and rank nothing. */
const NOISE = new Set(['opencode-plugin', 'opencode', 'plugin', 'opencode-plugins']);

/**
 * Trimmed index for the header command palette, one per locale: on zh the
 * `d` field holds the Chinese description (falling back to the original), so
 * Chinese queries match it and rows show it. It is fetched lazily the first
 * time the palette opens, so it must stay small — full `searchDocs` carries
 * fields (license, version, timestamps) the palette never renders.
 *
 * Keys are single letters because at ~1500 entries the field names alone
 * would outweigh the data.
 */
export function searchIndexResponse(lang: Locale): Response {
  return new Response(
    JSON.stringify(
      plugins.map((p) => ({
        s: p.slug,
        t: p.title,
        n: p.name,
        d: pluginDescription(p, lang)?.slice(0, lang === 'zh' ? 70 : 110) ?? null,
        o: p.owner,
        a: p.ownerAvatar?.replace(AVATAR_HOST, '') ?? null,
        k: p.keywords.filter((k) => !NOISE.has(k.toLowerCase())).slice(0, 5),
        c: p.category,
        r: p.stars,
        h: p.healthLevel,
      })),
    ),
    {
      headers: {
        'content-type': 'application/json; charset=utf-8',
        'cache-control': 'public, max-age=0, s-maxage=86400, stale-while-revalidate=3600',
        'x-robots-tag': 'noindex',
      },
    },
  );
}
