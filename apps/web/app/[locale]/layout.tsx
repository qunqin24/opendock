import type { Metadata } from 'next';
import { hasLocale, NextIntlClientProvider } from 'next-intl';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { Geist_Mono, Inter } from 'next/font/google';
import { notFound } from 'next/navigation';
import { BackToTop } from '@/components/back-to-top';
import { LocaleSwitch } from '@/components/locale-switch';
import { Logo } from '@/components/logo';
import { SiteSearch } from '@/components/site-search';
import { Link } from '@/i18n/navigation';
import { LANG_TAG, routing, type Locale } from '@/i18n/routing';
import { getMeta } from '@/lib/data';
import { formatNumber } from '@/lib/format';
import { alternates } from '@/lib/seo';
import '../globals.css';
import './site.css';
import { syncOverrides } from '@/lib/overrides';

const sans = Inter({ subsets: ['latin'], variable: '--font-site-sans' });
const mono = Geist_Mono({ subsets: ['latin'], variable: '--font-site-mono' });

const REPO = 'https://github.com/qunqin24/opendock';

type Props = { children: React.ReactNode; params: Promise<{ locale: string }> };

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'meta' });
  return {
    metadataBase: new URL('https://www.opendock.net'),
    title: { default: t('title'), template: '%s · OpenDock' },
    description: t('description'),
    alternates: alternates(locale as Locale, '/'),
  };
}

/** Site shell: one header with the search, one footer, in the page's language. */
export default async function LocaleLayout({ children, params }: Props) {
  const { locale } = await params;
  if (!hasLocale(routing.locales, locale)) notFound();
  setRequestLocale(locale);
  await syncOverrides();
  const t = await getTranslations('footer');
  const nav = await getTranslations('nav');
  const meta = getMeta();

  // Internal links go through the locale-aware Link; outside links are plain anchors.
  const footer = [
    {
      title: t('directory'),
      links: [
        { href: '/plugins', label: t('allPlugins') },
        { href: '/#categories', label: t('categories') },
        { href: '/plugins?sort=trending', label: t('trending') },
      ],
    },
    {
      title: t('authors'),
      links: [
        { href: '/about#ranking', label: t('ranking') },
        { href: '/about#listing', label: t('listing') },
        { href: `${REPO}/issues/new?template=data-correction.yml`, label: t('report'), external: true },
      ],
    },
    {
      title: t('project'),
      links: [
        { href: '/#dock', label: t('dock') },
        { href: REPO, label: 'GitHub', external: true },
      ],
    },
  ];

  return (
    <html lang={LANG_TAG[locale]}>
      <body>
        <NextIntlClientProvider>
          <div className={`${sans.variable} ${mono.variable} site min-h-dvh antialiased`}>
            <a href="#main" className="site-skip">{nav('skip')}</a>
            <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bg)]/85 backdrop-blur-md">
              {/* Three columns with equal sides, so the search sits on the page's centre line. */}
              <div className="mx-auto grid h-16 max-w-6xl grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-5 sm:grid-cols-[1fr_minmax(0,34rem)_1fr] sm:gap-6 sm:px-6">
                <Link href="/" className="justify-self-start" aria-label={nav('home')}>
                  <Logo className="h-[22px] max-sm:hidden" />
                  <Logo withText={false} className="sm:hidden" />
                </Link>
                <SiteSearch total={meta.total} />
                <div className="flex items-center justify-self-end">
                  <LocaleSwitch />
                  <a href={REPO} className="hidden h-9 items-center rounded-full px-3 text-sm text-[var(--muted)] hover:bg-[var(--pill)] hover:text-[var(--fg)] sm:inline-flex">
                    {nav('github')}
                  </a>
                </div>
              </div>
            </header>
            <main id="main" tabIndex={-1} className="outline-none">
              {children}
            </main>
            <BackToTop />
            <footer className="mt-28 border-t border-[var(--line)]">
              <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
                <div>
                  <Logo className="h-[22px]" />
                  <p className="mt-3 max-w-xs text-sm text-[var(--muted)]">{t('tagline')}</p>
                  <p className="mt-6 font-[family-name:var(--font-site-mono)] text-xs text-[var(--faint)]">
                    {t('status', { count: formatNumber(meta.total, locale) })}
                  </p>
                </div>
                {footer.map((col) => (
                  <nav key={col.title} aria-label={col.title}>
                    <p className="text-sm text-[var(--faint)]">{col.title}</p>
                    <ul className="mt-4 grid gap-2.5 text-sm">
                      {col.links.map((l) => (
                        <li key={l.label}>
                          {'external' in l ? (
                            <a href={l.href} className="hover:underline hover:underline-offset-4">{l.label}</a>
                          ) : (
                            <Link href={l.href} className="hover:underline hover:underline-offset-4">{l.label}</Link>
                          )}
                        </li>
                      ))}
                    </ul>
                  </nav>
                ))}
              </div>
            </footer>
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
