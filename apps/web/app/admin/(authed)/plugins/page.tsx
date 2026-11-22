import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Plugins } from '@/components/admin/features/plugins';
import { requireAdminPage } from '@/lib/admin/guard';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta');
  return { title: t('plugins') };
}

export default async function PluginsPage() {
  await requireAdminPage();
  return <Plugins />;
}
