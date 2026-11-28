import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

/** Locale-aware Link and router: `href="/plugins"` becomes `/zh/plugins` on Chinese pages. */
export const { Link, redirect, permanentRedirect, usePathname, useRouter, getPathname } = createNavigation(routing);
