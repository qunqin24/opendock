import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Dashboard } from '@/components/admin/features/dashboard';
import { requireAdminPage } from '@/lib/admin/guard';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta');
  return { title: t('overview') };
}

export default async function OverviewPage() {
  await requireAdminPage();
  return <Dashboard />;
}
