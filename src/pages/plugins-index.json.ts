import type { APIRoute } from 'astro';
import { compactDocs } from '../lib/plugins';

/** Full explorer dataset, fetched by PluginExplorer after hydration; Chinese at /zh/plugins-index.json. */
export const GET: APIRoute = () =>
  new Response(JSON.stringify(compactDocs('en')), {
    headers: { 'content-type': 'application/json; charset=utf-8', 'x-robots-tag': 'noindex' },
  });
