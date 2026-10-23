import type { APIRoute } from 'astro';
import { factsResponse } from '../lib/facts';

/** Plugin figures for /compare and /config-check; the Chinese one is /zh/facts.json. */
export const GET: APIRoute = () => factsResponse('en');
