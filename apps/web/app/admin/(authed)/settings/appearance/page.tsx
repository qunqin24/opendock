import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SettingsAppearance } from '@/components/admin/features/settings/appearance';
import { requireAdminPage } from '@/lib/admin/guard';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta');
  return { title: t('appearance') };
}

export default async function AppearancePage() {
  await requireAdminPage();
  return <SettingsAppearance />;
}
