import { ChevronRight } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CatIcon } from '@/components/icons';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { getCategories, getCategory, getMeta, getPlugins, getTrending, type Plugin } from '@/lib/data';
import { formatNumber } from '@/lib/format';
import { categoryLabel, pluginDescription } from '@/lib/localize';
import { alternates } from '@/lib/seo';
import { syncOverrides } from '@/lib/overrides';

type Props = { params: Promise<{ locale: Locale }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  return { alternates: alternates(locale, '/') };
}

/** Leaves out packages that only ride on a big repository or that nobody installs. */
const listable = (p: Plugin) => !p.deprecated && !p.starsInherited && !p.isFork && p.downloadsMonth >= 200;

function columns() {
  const all = getPlugins();
  const mostUsed = all.filter(listable).toSorted((a, b) => b.downloadsMonth - a.downloadsMonth).slice(0, 5);
  const trending = getTrending(5);
  const taken = new Set([...mostUsed, ...trending].map((p) => p.name));
  const updated = all
    .filter((p) => listable(p) && p.healthLevel === 'ok' && !taken.has(p.name))
    .toSorted((a, b) => (b.pushedAt ?? '').localeCompare(a.pushedAt ?? ''))
    .slice(0, 5);
  return [
    { key: 'mostUsed', href: '/plugins?sort=downloads', items: mostUsed },
    { key: 'trending', href: '/plugins?sort=trending', items: trending },
    { key: 'updated', href: '/plugins?sort=updated', items: updated },
  ] as const;
}

function SectionTitle({ href, children, id }: { href: string; children: React.ReactNode; id?: string }) {
  return (
    <h2 id={id} className="text-[28px] font-semibold tracking-[-0.03em]">
      <Link href={href} className="group inline-flex items-center gap-1">
        {children}
        <ChevronRight aria-hidden strokeWidth={2} className="size-5 text-[var(--faint)] transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--fg)]" />
      </Link>
    </h2>
  );
}

function PluginItem({ p, locale, fallback }: { p: Plugin; locale: Locale; fallback: string }) {
  const cat = getCategory(p.category);
  return (
    <li className="border-b border-[var(--line)] last:border-b-0">
      <Link href={`/plugins/${p.slug}`} className="group flex gap-4 py-3.5">
        <span className="tile grid size-12 shrink-0 place-items-center rounded-xl" title={cat ? categoryLabel(cat, locale) : undefined}>
          <CatIcon name={cat?.icon ?? 'package'} className="size-[22px]" />
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-semibold tracking-[-0.01em] group-hover:underline group-hover:underline-offset-4">
            {p.title || p.name}
          </span>
          <span className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[var(--muted)]">{pluginDescription(p, locale) ?? fallback}</span>
        </span>
      </Link>
    </li>
  );
}

export default async function HomePage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  await syncOverrides();
  const t = await getTranslations('home');
  const common = await getTranslations('common');
  const meta = getMeta();
  const categories = getCategories().toSorted((a, b) => (a.id === 'other' ? 1 : b.id === 'other' ? -1 : b.count - a.count));

  return (
    <>
      <section className="mx-auto max-w-6xl px-5 pt-28 pb-24 text-center sm:px-6 sm:pt-36 sm:pb-32">
        <h1 className="text-[clamp(2.6rem,6.5vw,4.5rem)] leading-[1.02] font-semibold tracking-[-0.045em]">{t('title')}</h1>
        <p className="mx-auto mt-5 max-w-lg text-lg text-[var(--muted)]">{t('lead', { count: formatNumber(meta.total, locale) })}</p>
      </section>

      <section aria-labelledby="plugins-title" className="mx-auto max-w-6xl px-5 sm:px-6">
        <SectionTitle id="plugins-title" href="/plugins">{t('plugins')}</SectionTitle>
        <div className="mt-6 grid gap-10 md:grid-cols-3 md:gap-8">
          {columns().map((col) => (
            <div key={col.key}>
              <h3 className="text-[17px] font-semibold">
                <Link href={col.href} className="group inline-flex items-center gap-0.5">
                  {t(col.key)}
                  <ChevronRight aria-hidden strokeWidth={2} className="size-4 text-[var(--faint)] group-hover:text-[var(--fg)]" />
                </Link>
              </h3>
              <ul className="mt-2">
                {col.items.map((p) => (
                  <PluginItem key={p.name} p={p} locale={locale} fallback={common('noDescription')} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section id="categories" aria-labelledby="categories-title" className="mx-auto mt-20 max-w-6xl scroll-mt-24 px-5 sm:px-6">
        <SectionTitle id="categories-title" href="/plugins">{t('categories')}</SectionTitle>
        <ul className="mt-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {categories.map((c) => (
            <li key={c.id}>
              <Link
                href={`/plugins?category=${c.id}`}
                className="flex h-14 items-center gap-3 rounded-xl border border-[var(--line)] bg-[var(--card)] px-4 transition-colors hover:bg-[var(--card-hover)]"
              >
                <CatIcon name={c.icon} className="size-5 shrink-0 text-[var(--muted)]" />
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{categoryLabel(c, locale)}</span>
                <span className="font-[family-name:var(--font-site-mono)] text-[13px] text-[var(--faint)] tabular-nums">{formatNumber(c.count, locale)}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section id="dock" aria-labelledby="dock-title" className="mx-auto mt-20 max-w-6xl scroll-mt-24 px-5 sm:px-6">
        <div className="grid items-center gap-8 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-6 sm:p-8 md:grid-cols-[1fr_auto]">
          <div>
            <p className="text-sm text-[var(--faint)]">{t('dockStatus')}</p>
            <h2 id="dock-title" className="mt-2 text-[24px] font-semibold tracking-[-0.03em]">{t('dockTitle')}</h2>
            <p className="mt-2 max-w-xl text-[15px] text-[var(--muted)]">{t('dockBody')}</p>
          </div>
          <div className="font-[family-name:var(--font-site-mono)] text-[13px] md:text-right">
            <p className="text-[var(--muted)]">
              <span className="text-[var(--faint)] select-none">$ </span>opencode plugin add opendock
            </p>
            <p className="mt-1 text-xs text-[var(--faint)]">{t('dockPlanned')}</p>
          </div>
        </div>
      </section>
    </>
  );
}
