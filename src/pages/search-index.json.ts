import type { APIRoute } from 'astro';
import { plugins } from '../lib/plugins';

/**
 * Trimmed index for the header command palette. It is fetched lazily the
 * first time the palette opens, so it must stay small — full `searchDocs`
 * carries fields (license, version, timestamps) the palette never renders.
 *
 * Keys are single letters because at ~1500 entries the field names alone
 * would outweigh the data.
 */
/** Carried by ~98% of packages, so they match everything and rank nothing. */
const NOISE = new Set(['opencode-plugin', 'opencode', 'plugin', 'opencode-plugins']);

export const GET: APIRoute = () =>
  new Response(
    JSON.stringify(
      plugins.map((p) => ({
        s: p.slug,
        t: p.title,
        n: p.name,
        d: p.description?.slice(0, 110) ?? null,
        o: p.owner,
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
