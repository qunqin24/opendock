import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { getCategory, type Plugin } from '@/lib/data';
import { COMPAT_LABEL, formatRelative } from '@/lib/format';
import { categoryLabel, pluginDescription } from '@/lib/localize';
import { CatIcon, Downloads, HealthMark, Stars } from './icons';

/** One plugin in a list: category tile, name, description, and the numbers that decide a pick. */
export function PluginListItem({ p }: { p: Plugin }) {
  const t = useTranslations('common');
  const locale = useLocale() as Locale;
  const cat = getCategory(p.category);
  return (
    <li className="border-b border-[var(--line)] last:border-b-0">
      <Link href={`/plugins/${p.slug}`} className="group flex gap-4 py-4">
        <span className="tile grid size-11 shrink-0 place-items-center rounded-xl" title={cat ? categoryLabel(cat, locale) : undefined}>
          <CatIcon name={cat?.icon ?? 'package'} className="size-5" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[15px] font-semibold tracking-[-0.01em] group-hover:underline group-hover:underline-offset-4">{p.title || p.name}</span>
            {p.owner && <span className="text-[13px] text-[var(--faint)]">{t('by', { owner: p.owner })}</span>}
          </span>
          <span className="mt-1 line-clamp-2 text-[14px] leading-snug text-[var(--muted)]">{pluginDescription(p, locale) ?? t('noDescription')}</span>
          <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 font-[family-name:var(--font-site-mono)] text-[12px] text-[var(--faint)]">
            <Downloads n={p.downloadsMonth} />
            <Stars n={p.starsCredited} />
            <span title={t('lastPushTitle')}>{formatRelative(p.pushedAt, locale)}</span>
            {p.opencode && <span title={t('compatTitle')}>{t('opencode', { versions: COMPAT_LABEL[p.opencode] })}</span>}
            <HealthMark level={p.healthLevel} withLabel className="size-3" />
          </span>
        </span>
      </Link>
    </li>
  );
}
