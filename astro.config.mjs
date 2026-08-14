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

  integrations: [react(), sitemap()],

  build: {
    // Plugin pages are the SEO surface; clean URLs keep them link-stable.
    format: 'directory',
  },

  vite: {
    plugins: [tailwindcss()],
  },
});
