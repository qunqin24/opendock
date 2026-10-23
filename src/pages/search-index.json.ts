import type { APIRoute } from 'astro';
import { searchIndexResponse } from '../lib/search-index';

/** English palette index; the Chinese one lives at /zh/search-index.json. */
export const GET: APIRoute = () => searchIndexResponse('en');
