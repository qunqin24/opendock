import { CircleCheck, Download, OctagonX, Star, TriangleAlert } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { CategoryIcon } from '@/components/category-icon';
import type { Locale } from '@/i18n/routing';
import type { HealthLevel } from '@/lib/data';
import { formatCount, formatNumber } from '@/lib/format';

/** One icon language for the site: Lucide, 1.5 stroke, grey until active. */
export const STROKE = 1.5;

export function CatIcon({ name, className = 'size-3.5' }: { name: string; className?: string }) {
  return <CategoryIcon name={name} className={className} strokeWidth={STROKE} />;
}

const HEALTH_ICON = { ok: CircleCheck, warn: TriangleAlert, danger: OctagonX } as const;

/** Health without colour: the shape carries the meaning. */
export function HealthMark({ level, withLabel = false, className = 'size-3.5' }: { level: HealthLevel; withLabel?: boolean; className?: string }) {
  const t = useTranslations('health');
  const Icon = HEALTH_ICON[level];
  return (
    <span className="inline-flex items-center gap-1" title={t(level)}>
      <Icon aria-hidden className={`${className} ${level === 'ok' ? 'text-[var(--faint)]' : 'text-[var(--fg)]'}`} strokeWidth={STROKE + (level === 'ok' ? 0 : 0.5)} />
      {withLabel ? <span>{t(level)}</span> : <span className="sr-only">{t(level)}</span>}
    </span>
  );
}

export function Downloads({ n, className = '' }: { n: number; className?: string }) {
  const t = useTranslations('common');
  const locale = useLocale() as Locale;
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} title={t('downloadsTitle', { count: formatNumber(n, locale) })}>
      <Download aria-hidden className="size-3" strokeWidth={STROKE} />
      {formatCount(n, locale)}
      <span className="text-[var(--faint)]">{t('perMonth')}</span>
      <span className="sr-only"> {t('downloadsSr')}</span>
    </span>
  );
}

export function Stars({ n, className = '' }: { n: number; className?: string }) {
  const t = useTranslations('common');
  const locale = useLocale() as Locale;
  return (
    <span className={`inline-flex items-center gap-1 ${className}`} title={t('starsTitle', { count: formatNumber(n, locale) })}>
      <Star aria-hidden className="size-3" strokeWidth={STROKE} />
      {formatCount(n, locale)}
      <span className="sr-only"> {t('starsSr')}</span>
    </span>
  );
}
