'use client';

import { useTranslations } from 'next-intl';
import { useLayoutEffect, useRef, useState } from 'react';

/** Long READMEs start folded, with a "Show more" fade like a card. */
export function ReadmeCollapse({ html }: { html: string }) {
  const t = useTranslations('plugin');
  const ref = useRef<HTMLDivElement>(null);
  const [tall, setTall] = useState(false);
  const [open, setOpen] = useState(false);

  useLayoutEffect(() => {
    setTall((ref.current?.scrollHeight ?? 0) > 1100);
  }, [html]);

  return (
    <div className="relative">
      <div
        ref={ref}
        className={`prose ${tall && !open ? 'max-h-[900px] overflow-hidden' : ''}`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {tall && !open && (
        <div className="absolute inset-x-0 bottom-0 flex h-40 items-end justify-center bg-gradient-to-t from-[var(--card)] to-transparent pb-2">
          <button type="button" onClick={() => setOpen(true)} className="rounded-full px-4 py-2 text-[14px] font-medium text-[var(--muted)] hover:bg-[var(--pill)] hover:text-[var(--fg)]">
            {t('showMore')}
          </button>
        </div>
      )}
    </div>
  );
}
