import { ArrowUpRight, ChevronRight, Download, Link2, TriangleAlert } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { CatIcon, STROKE } from '@/components/icons';
import { InstallBox } from '@/components/install-box';
import { PluginActions } from '@/components/plugin-actions';
import { ReadmeCollapse } from '@/components/readme-collapse';
import { Link } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import { authorHref } from '@/lib/authors';
import { getCategory, getLocalizedReadme, getPlugin, getPlugins, getVersions, type HealthLevel, type Plugin } from '@/lib/data';
import { COMPAT_LABEL, formatCount, formatDate, formatNumber, formatRelative } from '@/lib/format';
import { installOptions } from '@/lib/install';
import { categoryLabel, pluginDescription } from '@/lib/localize';
import { renderReadme } from '@/lib/readme';
import { scoreParts } from '@/lib/score';
import { alternates } from '@/lib/seo';
import { syncOverrides } from '@/lib/overrides';

type Props = {
  params: Promise<{ locale: Locale; slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

const REPO = 'https://github.com/qunqin24/opendock';
const TABS = ['overview', 'scorecard', 'updates'] as const;
type Tab = (typeof TABS)[number];
const HEALTH_SEGMENTS: Record<HealthLevel, number> = { ok: 4, warn: 2, danger: 1 };
const MISSING_KEY = { 'no-readme': 'readme', 'no-license': 'license', 'no-repo': 'repo' } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale, slug } = await params;
  await syncOverrides();
  const p = getPlugin(slug);
  if (!p) return {};
  return {
    title: p.title || p.name,
    description: pluginDescription(p, locale) ?? undefined,
    alternates: alternates(locale, `/plugins/${p.slug}`),
  };
}

/** Four-segment meter; filled segments are ink, the rest are hairlines. */
function Meter({ label, value, filled }: { label: string; value: string; filled: number }) {
  return (
    <div>
      <p className="flex items-baseline justify-between text-[14px]">
        <span className="font-medium">{label}</span>
        <span className="text-[var(--muted)]">{value}</span>
      </p>
      <div className="mt-2 grid grid-cols-4 gap-1.5" role="img" aria-label={`${label}: ${value}`}>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className={`h-1 rounded-full ${i < filled ? 'bg-[var(--fg)]' : 'bg-[var(--line)]'}`} />
        ))}
      </div>
    </div>
  );
}

function SideHeading({ children }: { children: React.ReactNode }) {
  return <h2 className="border-b border-[var(--line)] pb-2.5 text-[14px] font-medium text-[var(--muted)]">{children}</h2>;
}

function related(p: Plugin): Plugin[] {
  return getPlugins()
    .filter((x) => x.category === p.category && x.name !== p.name && !x.deprecated && !x.starsInherited && x.downloadsMonth >= 100)
    .slice(0, 9);
}

const avatar = (url: string, size: number) => `${url}${url.includes('?') ? '&' : '?'}s=${size}`;

export default async function PluginPage({ params, searchParams }: Props) {
  const { locale, slug } = await params;
  setRequestLocale(locale);
  await syncOverrides();
  const p = getPlugin(slug);
  if (!p) notFound();
  const sp = await searchParams;
  const tab: Tab = TABS.find((x) => x === sp.tab) ?? 'overview';

  const t = await getTranslations('plugin');
  const th = await getTranslations('health');
  const ti = await getTranslations('install');
  const common = await getTranslations('common');

  const category = getCategory(p.category);
  const catLabel = category ? categoryLabel(category, locale) : null;
  const versions = getVersions(p.slug);
  const install = installOptions(p, (key, values) => ti(key as Parameters<typeof ti>[0], values));
  const primary = install.options[0];
  const concerns = p.health.filter((h) => h.id !== 'healthy');
  const score = Math.round(p.score);
  const title = p.title || p.name;
  const description = pluginDescription(p, locale);
  const owner = authorHref(p.owner);
  const reason = (id: string) => {
    const key = `reason.${id}` as Parameters<typeof th>[0];
    return th.has(key) ? th(key) : id;
  };
  const rel = (iso: string | null) => formatRelative(iso, locale);

  const links = [
    { href: p.npmUrl, label: t('links.npm') },
    p.repoUrl && { href: p.repoUrl, label: t('links.repo') },
    p.homepage && p.homepage !== p.repoUrl && { href: p.homepage, label: t('links.homepage') },
    { href: `${REPO}/issues/new?template=data-correction.yml`, label: t('links.report') },
  ].filter((l): l is { href: string; label: string } => Boolean(l));

  const details: [string, string][] = [
    [t('currentVersion'), p.version ?? '—'],
    [t('lastUpdated'), rel(versions[0]?.t ?? p.pushedAt)],
    [t('created'), rel(p.createdAt)],
    [t('downloads'), t('downloadsValue', { count: formatCount(p.downloadsMonth, locale) })],
    [t('stars'), p.starsInherited ? t('starsShared', { count: formatCount(p.stars, locale) }) : formatCount(p.stars, locale)],
    [t('worksWith'), p.opencode ? common('opencode', { versions: COMPAT_LABEL[p.opencode] }) : t('notStated')],
    [t('license'), p.license ?? t('none')],
  ];

  const missing = [
    !p.description && t('missing.description'),
    ...concerns.flatMap((h) => (h.id in MISSING_KEY ? [t(`missing.${MISSING_KEY[h.id as keyof typeof MISSING_KEY]}`)] : [])),
  ].filter(Boolean) as string[];
  const sep = locale === 'zh' ? '、' : ', ';

  const scorecard: [string, string][] = [
    [t('hygiene'), missing.length ? t('hygieneMissing', { items: missing.join(sep) }) : t('hygieneOk')],
    [
      t('maintenance'),
      [
        t('lastPush', { when: rel(p.pushedAt) }),
        versions[0] && t('latestRelease', { version: versions[0].v, when: rel(versions[0].t) }),
        p.archived && t('repoArchived'),
        p.deprecated && t('npmDeprecated'),
      ]
        .filter(Boolean)
        .join(locale === 'zh' ? '' : ' '),
    ],
    [t('responsiveness'), p.repoUrl ? t('openIssues', { count: p.openIssues }) : t('noRepo')],
    [
      t('adoption'),
      t('adoptionText', {
        downloads: formatNumber(p.downloadsMonth, locale),
        stars: formatCount(p.stars, locale),
        delta: formatCount(p.starsDelta30d, locale),
      }) + (p.starsInherited ? (locale === 'zh' ? '' : ' ') + t('adoptionShared') : ''),
    ],
  ];

  const tabHref = (x: Tab) => (x === 'overview' ? `/plugins/${p.slug}` : `/plugins/${p.slug}?tab=${x}`);
  const readme = tab === 'overview' && p.hasReadme ? getLocalizedReadme(p.slug, locale) : null;
  const others = related(p);

  return (
    <article className="mx-auto max-w-6xl px-5 pt-10 sm:px-6 sm:pt-14">
      <div className="grid gap-x-14 gap-y-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <header className="lg:col-start-1">
          <div className="flex items-center gap-4 sm:gap-5">
            <span className="tile grid size-16 shrink-0 place-items-center rounded-2xl sm:size-[72px]" title={catLabel ?? undefined}>
              <CatIcon name={category?.icon ?? 'package'} className="size-8" />
            </span>
            <div className="min-w-0">
              <h1 className="text-[clamp(1.8rem,3.6vw,2.6rem)] leading-tight font-semibold tracking-[-0.04em] break-words">{title}</h1>
              <p className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-[14px]">
                {p.owner && (
                  <Link href={owner ?? '/plugins'} className="inline-flex items-center gap-2 font-medium hover:underline hover:underline-offset-4">
                    {p.ownerAvatar && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatar(p.ownerAvatar, 48)} alt="" width={22} height={22} className="rounded-full" />
                    )}
                    {p.owner}
                  </Link>
                )}
                <span className="inline-flex items-center gap-1.5 text-[var(--muted)]">
                  <Download aria-hidden strokeWidth={STROKE} className="size-4" />
                  {t('downloadsAMonth', { count: formatCount(p.downloadsMonth, locale) })}
                </span>
              </p>
            </div>
          </div>
          <p className="mt-6 max-w-2xl text-[18px] leading-relaxed">{description ?? t('noDescription')}</p>
          <div className="mt-6">
            <PluginActions command={primary.code} where={primary.hint} links={links} />
          </div>
          {(p.deprecated || p.archived) && (
            <p className="mt-4 flex items-center gap-2 rounded-xl border border-[var(--fg)] px-4 py-3 text-[14px]">
              <TriangleAlert aria-hidden strokeWidth={STROKE} className="size-4 shrink-0" />
              {p.deprecated ? t('deprecated') : t('archived')}
            </p>
          )}
        </header>

        <aside className="lg:col-start-2 lg:row-span-2 lg:row-start-1">
          {/* Stays in view while the README scrolls; scrolls on its own when taller than the screen. */}
          <div className="side-scroll grid gap-8 lg:sticky lg:top-[88px] lg:max-h-[calc(100dvh-112px)] lg:overflow-y-auto lg:overscroll-contain lg:pr-1 lg:pb-2">
            <div className="grid gap-5">
              <Meter label={t('health')} value={th(p.healthLevel)} filled={HEALTH_SEGMENTS[p.healthLevel]} />
              <Meter label={t('score')} value={t('scoreValue', { score: String(score) })} filled={Math.max(1, Math.ceil(score / 25))} />
              <Link href={tabHref('scorecard')} className="-mt-1 text-[13px] text-[var(--muted)] underline-offset-4 hover:text-[var(--fg)] hover:underline">
                {t('seeScorecard')}
              </Link>
            </div>

            <InstallBox options={install.options} note={install.note} />

            {category && (
              <div>
                <SideHeading>{t('category')}</SideHeading>
                <Link
                  href={`/plugins?category=${category.id}`}
                  className="mt-3 inline-flex items-center gap-2 rounded-full border border-[var(--line)] bg-[var(--card)] px-3.5 py-1.5 text-[14px] font-medium hover:bg-[var(--card-hover)]"
                >
                  <CatIcon name={category.icon} className="size-4" /> {catLabel}
                </Link>
              </div>
            )}

            <div>
              <SideHeading>{t('details')}</SideHeading>
              <dl className="mt-3 grid gap-2 text-[14px]">
                {details.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-[8.5rem_1fr] gap-3">
                    <dt className="text-[var(--muted)]">{k}</dt>
                    <dd>{v}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {p.owner && (
              <div>
                <SideHeading>{t('author')}</SideHeading>
                <div className="mt-3 flex items-center gap-3">
                  {p.ownerAvatar && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={avatar(p.ownerAvatar, 96)} alt="" width={44} height={44} className="rounded-full" />
                  )}
                  <div>
                    {owner ? (
                      <Link href={owner} className="font-medium hover:underline hover:underline-offset-4">{p.owner}</Link>
                    ) : (
                      <p className="font-medium">{p.owner}</p>
                    )}
                    {p.repoSlug && (
                      <a href={`https://github.com/${p.owner}`} rel="nofollow noopener" className="mt-0.5 flex items-center gap-1.5 text-[13px] text-[var(--muted)] hover:text-[var(--fg)]">
                        <Link2 aria-hidden strokeWidth={STROKE} className="size-3.5" /> github.com/{p.owner}
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>

        <section aria-label={t('info')} className="min-w-0 lg:col-start-1">
          <nav aria-label={t('sections')} className="inline-flex rounded-full border border-[var(--line)] p-1 text-[14px]">
            {TABS.map((x) => (
              <Link
                key={x}
                href={tabHref(x)}
                scroll={false}
                aria-current={tab === x ? 'page' : undefined}
                className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 ${tab === x ? 'bg-[var(--pill)] font-medium' : 'text-[var(--muted)] hover:text-[var(--fg)]'}`}
              >
                {t(`tab.${x}`)}
                {x === 'updates' && versions.length > 0 && (
                  <span className="rounded-full bg-[var(--line)] px-1.5 font-[family-name:var(--font-site-mono)] text-[11px]">{versions.length}</span>
                )}
              </Link>
            ))}
          </nav>

          <div className="mt-4 rounded-2xl border border-[var(--line)] bg-[var(--card)] p-5 sm:p-8">
            {tab === 'overview' &&
              (readme ? (
                <>
                  {readme.translated && <p className="mb-5 text-[13px] text-[var(--faint)]">{t('readmeLanguage', { language: '简体中文' })}</p>}
                  <ReadmeCollapse html={renderReadme(readme.markdown, p.repoSlug)} />
                </>
              ) : (
                <p className="text-[var(--muted)]">{t('noReadme')}</p>
              ))}

            {tab === 'scorecard' && (
              <div className="grid gap-12">
                <p className="text-[14px] text-[var(--muted)]">
                  {t('scorecardIntro')}{' '}
                  <a href={`${REPO}/issues/new?template=data-correction.yml`} className="underline underline-offset-4 hover:text-[var(--fg)]">{t('letUsKnow')}</a>
                </p>
                <div>
                  <h3 className="text-[22px] font-semibold tracking-[-0.02em]">
                    {t('health')} <span className="ml-2 text-[15px] font-medium text-[var(--muted)]">{th(p.healthLevel)}</span>
                  </h3>
                  <p className="mt-1 text-[14px] text-[var(--muted)]">
                    {concerns.length ? concerns.map((h) => reason(h.id)).join(' · ') : t('activelyMaintained')}
                  </p>
                  <div className="mt-4 grid grid-cols-4 gap-1.5" aria-hidden>
                    {[0, 1, 2, 3].map((i) => (
                      <span key={i} className={`h-1 rounded-full ${i < HEALTH_SEGMENTS[p.healthLevel] ? 'bg-[var(--fg)]' : 'bg-[var(--line)]'}`} />
                    ))}
                  </div>
                  <dl className="mt-4 divide-y divide-[var(--line)] text-[14px]">
                    {scorecard.map(([k, v]) => (
                      <div key={k} className="grid gap-1 py-3 sm:grid-cols-[9rem_1fr] sm:gap-4">
                        <dt className="font-medium">{k}</dt>
                        <dd className="text-[var(--muted)]">{v}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
                <div>
                  <h3 className="text-[22px] font-semibold tracking-[-0.02em]">
                    {t('score')} <span className="ml-2 text-[15px] font-medium text-[var(--muted)]">{t('scoreValue', { score: String(score) })}</span>
                  </h3>
                  <p className="mt-1 text-[14px] text-[var(--muted)]">
                    {t('scoreIntro')}{' '}
                    <Link href="/about#ranking" className="underline underline-offset-4 hover:text-[var(--fg)]">{t('howRanking')}</Link>
                  </p>
                  <ul className="mt-5 grid gap-4 text-[14px]">
                    {scoreParts(p).map((part) => (
                      <li key={part.id} className="grid grid-cols-[7.5rem_1fr_4.5rem] items-center gap-4">
                        <span className="font-medium">{t(`signal.${part.id}`)}</span>
                        <span className="h-1.5 overflow-hidden rounded-full bg-[var(--line)]">
                          <span className="block h-full rounded-full bg-[var(--fg)]" style={{ width: `${Math.round(part.value * 100)}%` }} />
                        </span>
                        <span className="text-right font-[family-name:var(--font-site-mono)] text-[12px] text-[var(--muted)] tabular-nums">
                          {Math.round(part.value * part.weight * 100)} / {part.weight * 100}
                        </span>
                      </li>
                    ))}
                  </ul>
                  {p.archived && <p className="mt-4 text-[13px] text-[var(--muted)]">{t('archivedScore')}</p>}
                </div>
              </div>
            )}

            {tab === 'updates' && (
              <div>
                {versions.length ? (
                  <ul className="divide-y divide-[var(--line)]">
                    {versions.map((v) => (
                      <li key={v.v}>
                        <a href={`https://www.npmjs.com/package/${p.name}/v/${v.v}`} rel="nofollow noopener" className="group flex items-center gap-3 py-3">
                          <span className="font-[family-name:var(--font-site-mono)] text-[15px] font-medium">{v.v}</span>
                          <span className="text-[14px] text-[var(--muted)]">{formatDate(v.t, locale)}</span>
                          <ChevronRight aria-hidden strokeWidth={1.75} className="ml-auto size-4 text-[var(--faint)] group-hover:text-[var(--fg)]" />
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[var(--muted)]">{t('noReleases')}</p>
                )}
                <a href={`${p.npmUrl}?activeTab=versions`} rel="nofollow noopener" className="mt-6 inline-flex items-center gap-1 text-[14px] text-[var(--muted)] hover:text-[var(--fg)]">
                  {t('allVersions')} <ArrowUpRight aria-hidden strokeWidth={STROKE} className="size-4" />
                </a>
              </div>
            )}
          </div>
        </section>
      </div>

      {others.length > 0 && (
        <section aria-labelledby="related-title" className="mt-20">
          <h2 id="related-title" className="text-[24px] font-semibold tracking-[-0.03em]">{t('related')}</h2>
          <ul className="mt-5 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-3">
            {others.map((r) => (
              <li key={r.name} className="border-b border-[var(--line)]">
                <Link href={`/plugins/${r.slug}`} className="group flex gap-4 py-3.5">
                  <span className="tile grid size-11 shrink-0 place-items-center rounded-xl">
                    <CatIcon name={category?.icon ?? 'package'} className="size-5" />
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[15px] font-semibold group-hover:underline group-hover:underline-offset-4">{r.title || r.name}</span>
                    <span className="mt-0.5 line-clamp-2 text-[13px] leading-snug text-[var(--muted)]">{pluginDescription(r, locale) ?? common('noDescription')}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <nav aria-label={t('breadcrumb')} className="mt-14 flex flex-wrap items-center gap-1.5 border-t border-[var(--line)] pt-6 text-[14px]">
        <Link href="/plugins" className="font-medium hover:underline hover:underline-offset-4">{t('plugins')}</Link>
        {category && (
          <>
            <ChevronRight aria-hidden strokeWidth={1.75} className="size-4 text-[var(--faint)]" />
            <Link href={`/plugins?category=${category.id}`} className="font-medium hover:underline hover:underline-offset-4">{catLabel}</Link>
          </>
        )}
        <ChevronRight aria-hidden strokeWidth={1.75} className="size-4 text-[var(--faint)]" />
        <span className="text-[var(--muted)]">{title}</span>
      </nav>
    </article>
  );
}
