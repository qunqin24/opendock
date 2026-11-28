import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SettingsAccount } from '@/components/admin/features/settings/account';
import { requireAdminPage } from '@/lib/admin/guard';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta');
  return { title: t('account') };
}

export default async function AccountPage() {
  // The one page reachable while a password change is pending.
  await requireAdminPage({ allowPasswordChange: true });
  return <SettingsAccount />;
}
