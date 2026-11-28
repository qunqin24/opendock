import type * as React from 'react';
import { Settings } from '@/components/admin/features/settings';

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return <Settings>{children}</Settings>;
}
