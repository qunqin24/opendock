import { json, requireAdmin } from '@/lib/api';
import { getCategories } from '@/lib/data';

export async function GET() {
  const user = await requireAdmin();
  if (user instanceof Response) return user;
  return json(getCategories().map((c) => ({ id: c.id, label: c.labelEn, labelZh: c.label })));
}
