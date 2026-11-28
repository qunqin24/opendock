'use client';

import { Check, Copy, FileJson, Terminal } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';
import type { InstallOption } from '@/lib/install';

type CopyState = 'idle' | 'copied' | 'manual';

/**
 * How to install one plugin. Each tab says where the snippet goes in plain
 * words; copying always gives feedback, and when the clipboard is blocked the
 * text is selected so ⌘C / Ctrl+C still works.
 */
export function InstallBox({ options, note }: { options: InstallOption[]; note: string | null }) {
  const t = useTranslations('install');
  const [active, setActive] = useState(options[0].id);
  const [copy, setCopy] = useState<CopyState>('idle');
  const codeRef = useRef<HTMLElement>(null);
  const option = options.find((o) => o.id === active) ?? options[0];
  const terminal = option.where === 'terminal';

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(option.code);
      setCopy('copied');
    } catch {
      const el = codeRef.current;
      if (el) {
        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      setCopy('manual');
    }
    setTimeout(() => setCopy('idle'), 2400);
  }

  return (
    <section aria-labelledby="install-title" className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)]">
      <div className="flex items-center justify-between gap-3 px-4 pt-4">
        <h2 id="install-title" className="text-[15px] font-semibold">{t('title')}</h2>
        {options.length > 1 && (
          <div role="tablist" aria-label={t('method')} className="flex rounded-full bg-[var(--pill)] p-0.5 text-[12px]">
            {options.map((o) => (
              <button
                key={o.id}
                type="button"
                role="tab"
                aria-selected={o.id === active}
                onClick={() => {
                  setActive(o.id);
                  setCopy('idle');
                }}
                className={`rounded-full px-2.5 py-1 transition-colors ${o.id === active ? 'bg-[var(--bg)] font-medium shadow-sm' : 'text-[var(--muted)] hover:text-[var(--fg)]'}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div role="tabpanel" className="p-4 pt-3">
        <p className="flex items-start gap-2 text-[13px] leading-snug text-[var(--muted)]">
          {terminal ? (
            <Terminal aria-hidden strokeWidth={1.75} className="mt-px size-4 shrink-0" />
          ) : (
            <FileJson aria-hidden strokeWidth={1.75} className="mt-px size-4 shrink-0" />
          )}
          {option.hint}
        </p>
        <div className="mt-3 overflow-hidden rounded-xl bg-[var(--bg)] ring-1 ring-[var(--line)]">
          {/* Title row: where the snippet goes, and the copy button, so the code keeps the full width. */}
          <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] py-1 pr-1 pl-3.5">
            <span className="min-w-0 truncate font-[family-name:var(--font-site-mono)] text-[11px] text-[var(--faint)]">
              {terminal ? t('terminal') : option.where}
            </span>
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex h-7 shrink-0 items-center gap-1.5 rounded-md px-2 text-[12px] text-[var(--muted)] transition-colors hover:bg-[var(--pill)] hover:text-[var(--fg)]"
            >
              {copy === 'copied' ? <Check aria-hidden strokeWidth={2} className="size-3.5 text-[var(--fg)]" /> : <Copy aria-hidden strokeWidth={1.75} className="size-3.5" />}
              {copy === 'copied' ? t('copied') : t('copy')}
            </button>
          </div>
          {/* Wraps instead of scrolling: breaks at spaces first, inside a long package name only when it must. */}
          <pre className="px-3.5 py-3 font-[family-name:var(--font-site-mono)] text-[13px] leading-relaxed whitespace-pre-wrap [overflow-wrap:anywhere]">
            {terminal && <span className="text-[var(--faint)] select-none">$ </span>}
            <code ref={codeRef}>{option.code}</code>
          </pre>
        </div>
        <p className="mt-2 h-4 text-[12px] text-[var(--muted)]" aria-live="polite">
          {copy === 'copied' && t('copiedSr')}
          {copy === 'manual' && t('manual')}
        </p>
        {note && <p className="mt-1 border-t border-[var(--line)] pt-3 text-[13px] text-[var(--muted)]">{note}</p>}
      </div>
    </section>
  );
}
