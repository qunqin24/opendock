// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// https://astro.build/config
export default defineConfig({
  // Update this to the real domain before the first deploy — canonical URLs,
  // the sitemap and the RSS feed are all derived from it.
  site: 'https://opendock.dev',

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
    }),
  ],

  build: {
    // Plugin pages are the SEO surface; clean URLs keep them link-stable.
    format: 'directory',
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
