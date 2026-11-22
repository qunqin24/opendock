import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { getCategory, type Plugin } from '@/lib/data';
import { formatCount, formatNumber } from '@/lib/format';
import { categoryLabel, pluginDescription } from '@/lib/localize';
import { CatIcon } from './icons';

/** Grid card: category tile, name, two lines of description, downloads pinned to the bottom. */
export function PluginCard({ p }: { p: Plugin }) {
  const t = useTranslations('common');
  const locale = useLocale() as Locale;
  const cat = getCategory(p.category);
  return (
    <li>
      <Link
        href={`/plugins/${p.slug}`}
        className="group flex h-full gap-3.5 rounded-xl border border-[var(--line)] bg-[var(--card)] p-4 transition-colors hover:bg-[var(--card-hover)]"
      >
        <span className="tile grid size-9 shrink-0 place-items-center rounded-lg" title={cat ? categoryLabel(cat, locale) : undefined}>
          <CatIcon name={cat?.icon ?? 'package'} className="size-[18px]" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="block truncate text-[15px] font-semibold tracking-[-0.01em]">{p.title || p.name}</span>
          <span className="mt-1 line-clamp-2 text-[14px] leading-snug text-[var(--muted)]">{pluginDescription(p, locale) ?? t('noDescription')}</span>
          <span
            className="mt-auto block pt-2 font-[family-name:var(--font-site-mono)] text-[11px] text-[var(--faint)]"
            title={t('downloadsTitle', { count: formatNumber(p.downloadsMonth, locale) })}
          >
            {t('downloadsPerMonth', { count: formatCount(p.downloadsMonth, locale) })}
          </span>
        </span>
      </Link>
    </li>
  );
}
