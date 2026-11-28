import { hasDatabase } from '@opendock/db';
import { destroySession } from '@/lib/auth/session';

export async function POST() {
  if (hasDatabase()) await destroySession();
  return new Response(null, { status: 204 });
}
