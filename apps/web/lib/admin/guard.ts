import { cache } from 'react';
import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth/session';

/** One session lookup per request, shared by the layout and the page. */
const getUser = cache(currentUser);

/**
 * Server-side guard for admin pages. Call it from every authenticated page
 * (layouts do not re-run on client navigations, pages do):
 *  - no session            -> /admin/sign-in
 *  - mustChangePassword    -> /admin/settings/account (unless `allowPasswordChange`)
 */
export async function requireAdminPage({ allowPasswordChange = false } = {}) {
  const user = await getUser();
  if (!user) redirect('/admin/sign-in');
  if (user.mustChangePassword && !allowPasswordChange) {
    redirect('/admin/settings/account');
  }
  return user;
}

/** For the sign-in page: an already signed-in user goes to the overview. */
export async function redirectIfSignedIn() {
  if (await getUser()) redirect('/admin');
}
