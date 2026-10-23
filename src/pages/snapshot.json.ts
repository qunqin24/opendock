import type { APIRoute } from 'astro';
import { generatedAt } from '../lib/plugins';

/**
 * Which data snapshot this deploy was built from. scripts/indexnow.mjs polls
 * it after the daily refresh, so search engines are only pinged once the new
 * pages are actually live.
 */
export const GET: APIRoute = () =>
  new Response(JSON.stringify({ generatedAt }), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'x-robots-tag': 'noindex' },
  });
