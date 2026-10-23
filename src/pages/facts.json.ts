import type { APIRoute } from 'astro';
import { factsResponse } from '../lib/facts';

/** Plugin figures for /config-check (both locales: nothing in it is translated). */
export const GET: APIRoute = () => factsResponse();
