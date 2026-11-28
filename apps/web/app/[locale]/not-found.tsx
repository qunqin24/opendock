import { getTranslations } from 'next-intl/server';
import { Link } from '@/i18n/navigation';

export default async function NotFound() {
  const t = await getTranslations('notFound');
  return (
    <div className="mx-auto max-w-6xl px-5 pt-28 pb-10 text-center sm:px-6 sm:pt-36">
      <p className="font-[family-name:var(--font-site-mono)] text-sm text-[var(--faint)]">404</p>
      <h1 className="mt-3 text-[clamp(2.2rem,5vw,3.5rem)] font-semibold tracking-[-0.045em]">{t('title')}</h1>
      <p className="mx-auto mt-4 max-w-md text-[var(--muted)]">{t('body')}</p>
      <Link href="/plugins" className="mt-8 inline-flex h-11 items-center rounded-full bg-[var(--fg)] px-5 text-sm font-medium text-[var(--bg)] hover:opacity-85">
        {t('cta')}
      </Link>
    </div>
  );
}
