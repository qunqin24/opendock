import { Activity, ArrowUpRight, Download, FilePenLine, PackagePlus, PackageX, Star, TrendingUp } from 'lucide-react';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { HealthMark, STROKE } from '@/components/icons';
import type { Locale } from '@/i18n/routing';
import { alternates } from '@/lib/seo';

type Props = { params: Promise<{ locale: Locale }> };

const REPO = 'https://github.com/qunqin24/opendock';

const SIGNALS = [
  { id: 'downloads', icon: Download, weight: '35%' },
  { id: 'stars', icon: Star, weight: '35%' },
  { id: 'activity', icon: Activity, weight: '20%' },
  { id: 'momentum', icon: TrendingUp, weight: '10%' },
] as const;

const LEVELS = ['ok', 'warn', 'danger'] as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'about' });
  return { title: t('metaTitle'), description: t('metaDescription'), alternates: alternates(locale, '/about') };
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 border-t border-[var(--line)] pt-10">
      <h2 id={`${id}-title`} className="text-[28px] font-semibold tracking-[-0.03em]">{title}</h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

const Keyword = () => <code className="font-[family-name:var(--font-site-mono)] text-[14px] text-[var(--fg)]">opencode-plugin</code>;

export default async function AboutPage({ params }: Props) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations('about');
  const sig = await getTranslations('plugin.signal');
  const th = await getTranslations('health');

  return (
    <div className="mx-auto grid max-w-3xl gap-16 px-5 pt-20 sm:px-6 sm:pt-28">
      <header>
        <h1 className="text-[clamp(2.4rem,5vw,3.5rem)] leading-[1.05] font-semibold tracking-[-0.045em]">{t('title')}</h1>
        <p className="mt-5 text-lg text-[var(--muted)]">{t('lead')}</p>
      </header>

      <Section id="ranking" title={t('ranking')}>
        <p className="text-[var(--muted)]">{t('rankingIntro')}</p>
        <ul className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--line)] sm:grid-cols-2">
          {SIGNALS.map(({ id, icon: Icon, weight }) => (
            <li key={id} className="bg-[var(--bg)] p-5">
              <p className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 font-medium">
                  <Icon aria-hidden strokeWidth={STROKE} className="size-4" /> {sig(id)}
                </span>
                <span className="font-[family-name:var(--font-site-mono)] text-sm tabular-nums">{weight}</span>
              </p>
              <p className="mt-2 text-sm leading-relaxed text-[var(--muted)]">{t(`signals.${id}`)}</p>
            </li>
          ))}
        </ul>
        <p className="mt-4 text-sm text-[var(--muted)]">{t('archived')}</p>
      </Section>

      <Section id="health" title={t('health')}>
        <ul className="grid gap-5">
          {LEVELS.map((level) => (
            <li key={level} className="flex gap-3">
              <HealthMark level={level} className="mt-1 size-4" />
              <span>
                <span className="font-medium">{th(level)}.</span> <span className="text-[var(--muted)]">{t(`healthBody.${level}`)}</span>
              </span>
            </li>
          ))}
        </ul>
      </Section>

      <Section id="listing" title={t('authors')}>
        <ul className="grid gap-8">
          <li className="flex gap-3">
            <PackagePlus aria-hidden strokeWidth={STROKE} className="mt-1 size-5 shrink-0" />
            <div>
              <h3 className="font-medium">{t('listTitle')}</h3>
              <p className="mt-1 text-[var(--muted)]">{t.rich('listBody', { keyword: () => <Keyword /> })}</p>
            </div>
          </li>
          <li className="flex gap-3">
            <FilePenLine aria-hidden strokeWidth={STROKE} className="mt-1 size-5 shrink-0" />
            <div>
              <h3 className="font-medium">{t('fixTitle')}</h3>
              <p className="mt-1 text-[var(--muted)]">{t('fixBody')}</p>
              <a href={`${REPO}/issues/new?template=data-correction.yml`} className="mt-2 inline-flex items-center gap-1 font-medium hover:underline hover:underline-offset-4">
                {t('fixCta')} <ArrowUpRight aria-hidden strokeWidth={STROKE} className="size-4" />
              </a>
            </div>
          </li>
          <li className="flex gap-3">
            <PackageX aria-hidden strokeWidth={STROKE} className="mt-1 size-5 shrink-0" />
            <div>
              <h3 className="font-medium">{t('removeTitle')}</h3>
              <p className="mt-1 text-[var(--muted)]">{t.rich('removeBody', { keyword: () => <Keyword /> })}</p>
              <a href={`${REPO}/issues/new?template=removal-request.yml`} className="mt-2 inline-flex items-center gap-1 font-medium hover:underline hover:underline-offset-4">
                {t('removeCta')} <ArrowUpRight aria-hidden strokeWidth={STROKE} className="size-4" />
              </a>
            </div>
          </li>
        </ul>
      </Section>
    </div>
  );
}
