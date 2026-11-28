import { json, requireAdmin } from '@/lib/api';

export async function GET() {
  const user = await requireAdmin();
  return user instanceof Response ? user : json({ user });
}
