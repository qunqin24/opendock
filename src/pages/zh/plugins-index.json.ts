import type { APIRoute } from 'astro';
import { compactDocs } from '../../lib/plugins';

/** Same dataset as /plugins-index.json, carrying the Chinese descriptions. */
export const GET: APIRoute = () =>
  new Response(JSON.stringify(compactDocs('zh')), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'x-robots-tag': 'noindex' },
  });
