import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { Installs } from '@/components/admin/features/installs';
import { requireAdminPage } from '@/lib/admin/guard';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta');
  return { title: t('installs') };
}

export default async function InstallsPage() {
  await requireAdminPage();
  return <Installs />;
}
