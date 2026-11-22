import path from 'node:path';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

const root = path.join(import.meta.dirname, '../..');

const config: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@opendock/db'],
  // postgres.js uses Node APIs; keep it out of the bundle.
  serverExternalPackages: ['postgres'],
  outputFileTracingRoot: root,
  turbopack: { root },
  images: {
    remotePatterns: [{ protocol: 'https', hostname: 'avatars.githubusercontent.com' }],
  },
};

export default createNextIntlPlugin('./i18n/request.ts')(config);
