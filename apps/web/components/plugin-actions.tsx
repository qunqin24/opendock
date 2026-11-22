'use client';

import { ArrowUpRight, Check, Copy, Ellipsis } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useEffect, useRef, useState } from 'react';

interface Props {
  command: string;
  /** Plain words on where the command goes, shown after copying. */
  where: string;
  links: { href: string; label: string }[];
}

/** The header actions: copy the install line, plus a menu of outside links. */
export function PluginActions({ command, where, links }: Props) {
  const t = useTranslations('actions');
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !menuRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('pointerdown', close);
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('keydown', close);
    };
  }, [open]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(command);
      setState('copied');
    } catch {
      setState('failed');
    }
    setTimeout(() => setState('idle'), 3000);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={copy}
        className="inline-flex h-11 items-center gap-2 rounded-xl bg-[var(--fg)] px-5 text-[15px] font-medium text-[var(--bg)] transition-opacity hover:opacity-85"
      >
        {state === 'copied' ? <Check aria-hidden strokeWidth={2} className="size-4" /> : <Copy aria-hidden strokeWidth={1.75} className="size-4" />}
        {state === 'copied' ? t('copied') : t('copy')}
      </button>
      <div ref={menuRef} className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label={t('more')}
          aria-expanded={open}
          aria-haspopup="menu"
          className="grid size-11 place-items-center rounded-xl border border-[var(--line)] bg-[var(--card)] hover:bg-[var(--card-hover)]"
        >
          <Ellipsis aria-hidden strokeWidth={1.75} className="size-5" />
        </button>
        {open && (
          <ul role="menu" className="absolute top-[calc(100%+6px)] left-0 z-30 min-w-48 rounded-xl border border-[var(--line)] bg-[var(--card)] p-1.5 shadow-[0_20px_50px_-20px_rgba(0,0,0,0.4)]">
            {links.map((l) => (
              <li key={l.label} role="none">
                <a
                  role="menuitem"
                  href={l.href}
                  rel="nofollow noopener"
                  className="flex items-center justify-between gap-6 rounded-lg px-3 py-2 text-[14px] hover:bg-[var(--card-hover)]"
                >
                  {l.label} <ArrowUpRight aria-hidden strokeWidth={1.75} className="size-4 text-[var(--faint)]" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="basis-full text-[13px] text-[var(--muted)]" aria-live="polite">
        {state === 'copied' && t('copiedHint', { hint: where })}
        {state === 'failed' && t('blocked')}
      </p>
    </div>
  );
}
