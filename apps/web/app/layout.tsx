/**
 * Pass-through: each section renders its own `<html>` — `app/[locale]/layout.tsx`
 * (public site, with the right `lang`) and `app/admin/layout.tsx` (admin).
 * Stylesheets are imported there, not here, so they never cross over.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
