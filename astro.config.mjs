// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Canonical URLs, hreflang, the sitemap, the RSS feed and every absolute
  // URL in the JSON-LD are derived from this. Changing it moves all of them.
  site: 'https://www.opendock.net',

  // English owns the bare paths; Chinese lives under /zh/. The plugin data
  // itself is English (npm descriptions, GitHub READMEs), so the English
  // build is the one that matches its own content.
  i18n: {
    locales: ['en', 'zh'],
    defaultLocale: 'en',
    routing: { prefixDefaultLocale: false },
  },

  integrations: [
    react(),
    sitemap({
      i18n: { defaultLocale: 'en', locales: { en: 'en', zh: 'zh-CN' } },
      // Plugin descriptions and READMEs are source-language content. Keep the
      // Chinese UI routes available, but index only the English detail pages.
      filter: (page) => !/^\/zh\/plugins\/[^/]+\/$/.test(new URL(page).pathname),
    }),
  ],

  trailingSlash: 'always',

  build: {
    // Plugin pages are the SEO surface; clean URLs keep them link-stable.
    format: 'directory',
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
