import type { Metadata } from 'next';
import { getTranslations } from 'next-intl/server';
import { SignIn } from '@/components/admin/features/auth/sign-in';
import { redirectIfSignedIn } from '@/lib/admin/guard';

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta');
  return { title: t('signIn') };
}

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string | string[] }>;
}) {
  await redirectIfSignedIn();
  const { redirect } = await searchParams;
  return <SignIn redirect={typeof redirect === 'string' ? redirect : undefined} />;
}
