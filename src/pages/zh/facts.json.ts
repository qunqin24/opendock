import type { APIRoute } from 'astro';
import { factsResponse } from '../../lib/facts';

/** Same figures as /facts.json, with Chinese descriptions. */
export const GET: APIRoute = () => factsResponse('zh');
