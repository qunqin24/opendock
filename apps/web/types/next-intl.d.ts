import type { AdminMessages } from '@/i18n/admin';
import type publicMessages from '@/messages/en.json';

declare module 'next-intl' {
  interface AppConfig {
    // Public messages stay at the top level; admin messages sit under `admin`
    // (they are only loaded for /admin requests, see i18n/request.ts).
    Messages: typeof publicMessages & { admin: AdminMessages };
  }
}
