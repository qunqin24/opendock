'use client';

import { Languages } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import NextLink from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { usePathname } from '@/i18n/navigation';

function Switch() {
  const t = useTranslations('nav');
  const locale = useLocale();
  const pathname = usePathname();
  const search = useSearchParams();
  const target = locale === 'zh' ? 'en' : 'zh';
  // English owns the bare path, Chinese adds /zh; link straight there, no redirect hop.
  const path = target === 'zh' ? `/zh${pathname === '/' ? '' : pathname}` : pathname;
  const query = search.toString();
  return (
    <NextLink
      href={query ? `${path}?${query}` : path}
      hrefLang={target === 'zh' ? 'zh-CN' : 'en'}
      aria-label={t('languageLabel')}
      title={t('languageLabel')}
      className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm text-[var(--muted)] transition-colors hover:bg-[var(--pill)] hover:text-[var(--fg)]"
    >
      <Languages aria-hidden strokeWidth={1.75} className="size-4" />
      {t('language')}
    </NextLink>
  );
}

/** Same page in the other language, keeping the query string (filters, tabs). */
export function LocaleSwitch() {
  return (
    <Suspense fallback={null}>
      <Switch />
    </Suspense>
  );
}
