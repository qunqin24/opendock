'use client';

import { Search, X } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import { useEffect, useId, useRef, useState } from 'react';
import { CatIcon } from '@/components/icons';
import { useRouter } from '@/i18n/navigation';
import type { Locale } from '@/i18n/routing';
import type { PluginCard } from '@/lib/data';
import { formatNumber } from '@/lib/format';

type Result = PluginCard & { title: string; owner: string | null; categoryLabel: string | null; categoryIcon: string };

interface Answer {
  q: string;
  total: number;
  items: Result[];
}

const SHOWN = 5;

/**
 * The header search. Typing opens a dropdown right under the field, like a
 * native combobox: five best matches, then "View all results". `⌘K` or `/`
 * jumps here from anywhere on the page.
 */
export function SiteSearch({ total }: { total: number }) {
  const router = useRouter();
  const t = useTranslations('search');
  const locale = useLocale() as Locale;
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<Answer | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = /^(INPUT|TEXTAREA|SELECT)$/.test((e.target as HTMLElement).tagName);
      if ((e.key === 'k' && (e.metaKey || e.ctrlKey)) || (e.key === '/' && !typing)) {
        e.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, []);

  useEffect(() => {
    if (!query.trim()) {
      setAnswer(null);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?${new URLSearchParams({ q: query, limit: String(SHOWN), locale })}`, { signal: controller.signal });
        const data = await res.json();
        setAnswer({ q: query, total: data.total, items: data.items.slice(0, SHOWN) });
        setActive(0);
      } catch {
        /* aborted */
      }
    }, 110);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, locale]);

  const items = answer?.items ?? [];
  const pending = query.trim() !== '' && answer?.q !== query;
  const showList = open && query.trim() !== '' && (answer !== null || items.length > 0);
  // The last option is always "View all results".
  const optionCount = items.length + 1;
  const viewAll = `/plugins?q=${encodeURIComponent(query)}`;

  function go(index: number) {
    setOpen(false);
    router.push(index < items.length ? `/plugins/${items[index].slug}` : viewAll);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setOpen(true);
      setActive((i) => Math.min(i + 1, optionCount - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && query.trim()) {
      e.preventDefault();
      go(pending ? items.length : active);
    } else if (e.key === 'Escape') {
      if (query) setQuery('');
      else inputRef.current?.blur();
      setOpen(false);
    }
  }

  return (
    <div ref={rootRef} className="relative w-full min-w-0">
      <label
        className={`flex h-11 items-center gap-2.5 rounded-full border bg-[var(--pill)] pr-2.5 pl-4 transition-colors ${
          showList ? 'border-[var(--faint)]' : 'border-transparent hover:border-[var(--line)]'
        } focus-within:border-[var(--faint)]`}
      >
        <Search aria-hidden strokeWidth={1.75} className="size-4 shrink-0 text-[var(--faint)]" />
        <span className="sr-only">{t('label')}</span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={t('placeholder', { count: formatNumber(total, locale) })}
          role="combobox"
          aria-expanded={showList}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showList ? `${listId}-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 bg-transparent text-[15px] outline-none placeholder:text-[var(--faint)]"
          style={{ outline: 'none' }}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('');
              inputRef.current?.focus();
            }}
            aria-label={t('clear')}
            className="grid size-5 shrink-0 place-items-center rounded-full bg-[var(--faint)] text-[var(--bg)] hover:bg-[var(--muted)]"
          >
            <X aria-hidden strokeWidth={2.5} className="size-3" />
          </button>
        )}
        <kbd className="hidden shrink-0 rounded-full border border-[var(--line)] px-2 py-0.5 font-[family-name:var(--font-site-mono)] text-[11px] text-[var(--faint)] sm:inline">
          ⌘K
        </kbd>
      </label>

      {showList && (
        <div className="absolute top-[calc(100%+6px)] left-0 z-50 w-full overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--card)] shadow-[0_24px_60px_-20px_rgba(0,0,0,0.45)] max-sm:fixed max-sm:inset-x-3 max-sm:top-[58px] max-sm:w-auto">
          <ul id={listId} role="listbox" aria-label={t('results')} className={`p-1.5 transition-opacity ${pending ? 'opacity-60' : ''}`}>
            {items.map((r, i) => (
              <li
                key={r.slug}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === active}
                onPointerEnter={() => setActive(i)}
                onClick={() => go(i)}
                className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 ${i === active ? 'bg-[var(--card-hover)]' : ''}`}
              >
                <span className="tile grid size-9 shrink-0 place-items-center rounded-lg">
                  <CatIcon name={r.categoryIcon} className="size-[18px]" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium">{r.title || r.name}</span>
                  <span className="block truncate text-[13px] text-[var(--muted)]">{r.owner ?? r.name}</span>
                </span>
                {r.categoryLabel && (
                  <span className="hidden shrink-0 text-[13px] text-[var(--muted)] sm:block">{locale === 'zh' ? r.categoryLabel : r.categoryLabel.split(' & ')[0]}</span>
                )}
              </li>
            ))}
            {!pending && items.length === 0 && (
              <li className="px-3 py-3 text-[14px] text-[var(--muted)]">{t('none', { query })}</li>
            )}
            <li
              id={`${listId}-${items.length}`}
              role="option"
              aria-selected={active === items.length}
              onPointerEnter={() => setActive(items.length)}
              onClick={() => go(items.length)}
              className={`mt-1 flex cursor-pointer items-center justify-between rounded-lg px-2.5 py-2.5 text-[15px] font-medium ${
                active === items.length ? 'bg-[var(--card-hover)]' : ''
              }`}
            >
              <span className="pl-12">{t('viewAll')}</span>
              {answer && answer.total > 0 && (
                <span className="font-[family-name:var(--font-site-mono)] text-[12px] font-normal text-[var(--faint)]">
                  {formatNumber(answer.total, locale)}
                </span>
              )}
            </li>
          </ul>
        </div>
      )}
    </div>
  );
}
