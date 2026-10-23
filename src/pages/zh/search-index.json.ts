import type { APIRoute } from 'astro';
import { searchIndexResponse } from '../../lib/search-index';

/** Chinese palette index: same shape, descriptions translated where available. */
export const GET: APIRoute = () => searchIndexResponse('zh');
