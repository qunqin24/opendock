'use client';

import { GeneralError } from '@/components/admin/features/errors/general-error';

export default function AdminError({ reset }: { error: Error; reset: () => void }) {
  return <GeneralError reset={reset} />;
}
