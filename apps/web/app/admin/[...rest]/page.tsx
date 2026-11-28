import { notFound } from 'next/navigation';

/** Unknown paths under /admin render the admin 404 (not the public site's). */
export default function AdminCatchAll() {
  notFound();
}
