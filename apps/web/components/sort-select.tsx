'use client';

import { ChevronsUpDown } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';

/** Sort dropdown that rewrites the URL, so every sorted view stays shareable. */
export function SortSelect({ value, options, hrefs }: { value: string; options: { id: string; label: string }[]; hrefs: Record<string, string> }) {
  const router = useRouter();
  const t = useTranslations('list');
  return (
    <label className="relative">
      <span className="sr-only">{t('sortBy')}</span>
      <select
        value={value}
        onChange={(e) => router.push(hrefs[e.target.value])}
        className="h-9 appearance-none rounded-lg border border-[var(--line)] bg-[var(--card)] pr-8 pl-3 text-[14px] text-[var(--fg)] hover:bg-[var(--card-hover)]"
      >
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronsUpDown aria-hidden strokeWidth={1.75} className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-[var(--faint)]" />
    </label>
  );
}
