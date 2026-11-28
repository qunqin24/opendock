import { ArrowUpRight, AtSign, Download, Globe, Link2, Package, Star } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { CatIcon, HealthMark, STROKE } from '@/components/icons';
import { Link, permanentRedirect } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { getAuthor } from '@/lib/authors';
import { getCategory } from '@/lib/data';
import { formatCount, formatNumber } from '@/lib/format';
import { categoryLabel, pluginDescription } from '@/lib/localize';
import { alternates } from '@/lib/seo';
import { syncOverrides } from '@/lib/overrides';

type Props = { params: Promise<{ locale: Locale; author: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, author } = await params;
  await syncOverrides();
  const a = getAuthor(decodeURIComponent(author));
  if (!a) return {};
  const t = await getTranslations({ locale, namespace: 'author' });
  return {
    title: a.profile?.name ?? a.login,
    description: a.profile?.bio ?? t('metaDescription', { count: a.plugins.length, login: a.login }),
    alternates: alternates(locale, `/authors/${a.key}`),
  };
}

export default async function AuthorPage({ params }: Props) {
  const { locale, author } = await params;
  setRequestLocale(locale);
  await syncOverrides();
  const param = decodeURIComponent(author);
  const a = getAuthor(param);
  if (!a) notFound();
  // One URL per person: logins are case-insensitive.
  if (param !== a.key) permanentRedirect({ href: `/authors/${a.key}`, locale });

  const t = await getTranslations('author');
  const common = await getTranslations('common');
  const plugins = a.plugins.toSorted((x, y) => y.score - x.score);
  const profile = a.profile;
  const blurb = profile?.bio ?? ([profile?.company, profile?.location].filter(Boolean).join(' · ') || null);
  const website = profile?.website ? (/^https?:\/\//i.test(profile.website) ? profile.website : `https://${profile.website}`) : null;
  const links = [
    { href: a.profileUrl, label: a.profileUrl.replace(/^https:\/\/(www\.)?/, ''), icon: Link2 },
    ...(website ? [{ href: website, label: website.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, ''), icon: Globe }] : []),
    ...(profile?.twitter ? [{ href: `https://x.com/${profile.twitter}`, label: `x.com/${profile.twitter}`, icon: AtSign }] : []),
  ];

  const stats = [
    { icon: Package, label: t('plugins', { count: a.plugins.length }), value: formatNumber(a.plugins.length, locale) },
    { icon: Download, label: t('downloadsAMonth'), value: formatCount(a.downloadsMonth, locale) },
    { icon: Star, label: t('stars'), value: formatCount(a.stars, locale) },
  ];

  return (
    <div className="mx-auto max-w-6xl px-5 pt-12 sm:px-6 sm:pt-20">
      <div className="grid gap-8 md:grid-cols-[8rem_minmax(0,1fr)_14rem] md:gap-12">
        <div>
          {a.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`${a.avatar}${a.avatar.includes('?') ? '&' : '?'}s=256`}
              alt=""
              width={128}
              height={128}
              className="size-24 rounded-full ring-1 ring-[var(--line)] md:size-32"
            />
          ) : (
            <span className="tile grid size-24 place-items-center rounded-full text-[36px] font-semibold md:size-32">{a.login.slice(0, 1).toUpperCase()}</span>
          )}
        </div>

        <div className="min-w-0 md:pt-6">
          <h1 className="text-[clamp(1.9rem,3.6vw,2.4rem)] leading-tight font-semibold tracking-[-0.04em] break-words">{profile?.name ?? a.login}</h1>
          <p className="mt-1 text-[15px] text-[var(--muted)]">
            <span className="font-[family-name:var(--font-site-mono)] text-[13px]">@{a.login}</span>
            {profile?.type === 'org' ? ` · ${t('org')}` : ''}
          </p>
          {blurb ? <p className="mt-4 max-w-prose text-[15px] leading-relaxed break-words">{blurb}</p> : null}
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
            {stats.map(({ icon: Icon, label, value }) => (
              <li key={label} className="inline-flex items-center gap-2">
                <Icon aria-hidden strokeWidth={STROKE} className="size-4 text-[var(--faint)]" />
                <span className="font-semibold tabular-nums">{value}</span>
                <span className="text-[var(--muted)]">{label}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="md:pt-6">
          <p className="text-[14px] text-[var(--muted)]">{t('elsewhere')}</p>
          <ul className="mt-2 grid gap-2">
            {links.map(({ href, label, icon: Icon }) => (
              <li key={href}>
                <a href={href} rel="nofollow noopener" className="inline-flex max-w-full items-center gap-2 text-[14px] font-medium hover:underline hover:underline-offset-4">
                  <Icon aria-hidden strokeWidth={STROKE} className="size-4 shrink-0 text-[var(--faint)]" />
                  <span className="truncate">{label}</span>
                  <ArrowUpRight aria-hidden strokeWidth={STROKE} className="size-3.5 shrink-0 text-[var(--faint)]" />
                </a>
              </li>
            ))}
          </ul>
        </div>

        <section aria-labelledby="author-plugins" className="md:col-start-2 md:col-end-4">
          <h2 id="author-plugins" className="inline-flex items-center gap-2 rounded-full border border-[var(--line)] py-1.5 pr-2 pl-4 text-[14px] font-medium">
            {t('pluginsTab')}
            <span className="rounded-full bg-[var(--fg)] px-2 font-[family-name:var(--font-site-mono)] text-[11px] leading-5 text-[var(--bg)]">{a.plugins.length}</span>
          </h2>
          <ul className="mt-4 grid gap-2.5">
            {plugins.map((p) => {
              const cat = getCategory(p.category);
              return (
                <li key={p.name}>
                  <Link
                    href={`/plugins/${p.slug}`}
                    className="group flex items-center gap-4 rounded-xl border border-[var(--line)] bg-[var(--card)] px-4 py-3.5 transition-colors hover:bg-[var(--card-hover)]"
                  >
                    <span className="tile grid size-10 shrink-0 place-items-center rounded-lg" title={cat ? categoryLabel(cat, locale) : undefined}>
                      <CatIcon name={cat?.icon ?? 'package'} className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold">{p.title || p.name}</span>
                      <span className="mt-0.5 line-clamp-1 text-[14px] text-[var(--muted)]">{pluginDescription(p, locale) ?? common('noDescription')}</span>
                    </span>
                    <span className="hidden shrink-0 items-center gap-4 font-[family-name:var(--font-site-mono)] text-[12px] text-[var(--faint)] sm:flex">
                      <span title={common('downloadsTitle', { count: formatNumber(p.downloadsMonth, locale) })}>
                        {formatCount(p.downloadsMonth, locale)}
                        {common('perMonth')}
                      </span>
                      <HealthMark level={p.healthLevel} className="size-3.5" />
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
