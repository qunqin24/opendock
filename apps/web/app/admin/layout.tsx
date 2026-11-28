import type * as React from 'react';
import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getLocale, getTranslations } from 'next-intl/server';
import { Inter, Manrope } from 'next/font/google';
import './admin.css';
import { LANG_TAG, type Locale } from '@/i18n/routing';
import { Providers } from './providers';

// Admin lives outside `app/[locale]` (unprefixed URLs; language from a cookie or
// Accept-Language, see i18n/request.ts), so it renders its own <html>. Its
// stylesheet (admin.css) is imported only here.
const inter = Inter({ subsets: ['latin'], variable: '--font-admin-inter' });
const manrope = Manrope({ subsets: ['latin'], variable: '--font-admin-manrope' });

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations('admin.meta');
  return {
    title: { default: t('title'), template: `%s · ${t('title')}` },
    description: t('description'),
    robots: { index: false, follow: false },
  };
}

/**
 * Runs before first paint: puts the saved theme (`dark`/`light`, `system`
 * resolved through prefers-color-scheme) and font class on <html>, so the page
 * never flashes the wrong theme. Cookie names match the providers in
 * components/admin/context.
 */
const initScript = `(function(){try{var c=document.cookie,r=document.documentElement;
var t=(c.match(/(?:^|; )od-admin-theme=(light|dark|system)/)||[])[1]||'system';
var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);
r.classList.add(d?'dark':'light');
r.classList.add('font-'+((c.match(/(?:^|; )od-admin-font=(inter|manrope|system)/)||[])[1]||'inter'));
}catch(e){}})();`;

export default async function AdminRootLayout({ children }: { children: React.ReactNode }) {
  const locale = (await getLocale()) as Locale;
  return (
    <html lang={LANG_TAG[locale]} className={`${inter.variable} ${manrope.variable}`} suppressHydrationWarning>
      <head>
        {/* Inline on purpose: it must run synchronously before first paint. React 19 logs a dev-only
            "script tag while rendering" notice for it; the script still runs from the server HTML. */}
        <script dangerouslySetInnerHTML={{ __html: initScript }} />
      </head>
      <body>
        {/* Only the admin messages are loaded for /admin requests (i18n/request.ts). */}
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
