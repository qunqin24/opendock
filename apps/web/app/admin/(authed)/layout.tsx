import type * as React from 'react';
import { cookies } from 'next/headers';
import { HydrateUser } from '@/components/admin/hydrate-user';
import { AuthenticatedLayout } from '@/components/admin/layout/authenticated-layout';
import { requireAdminPage } from '@/lib/admin/guard';

/**
 * Shell for every signed-in admin page. This layout only guarantees a session;
 * layouts are not re-run on client navigations, so each page calls
 * `requireAdminPage()` itself (which also enforces the forced password change).
 */
export default async function AuthedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAdminPage({ allowPasswordChange: true });
  const jar = await cookies();
  return (
    <>
      <HydrateUser user={user} />
      <AuthenticatedLayout
        defaultOpen={jar.get('sidebar_state')?.value !== 'false'}
        layout={{
          collapsible: jar.get('layout_collapsible')?.value,
          variant: jar.get('layout_variant')?.value,
        }}
      >
        {children}
      </AuthenticatedLayout>
    </>
  );
}
