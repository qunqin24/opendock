import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Fact } from '../lib/facts';
// Not from lib/facts: that module imports the dataset, and this is a client island.
import { AVATAR_HOST } from '../lib/expand-doc';
import { COMPARE_MAX, setCompare } from '../lib/compare-store';
import { avatarUrl, cn, compactNumber, formatNumber, letterAvatar, timeAgo } from '../lib/utils';
import { localePath, useTranslations, type Locale } from '../lib/i18n';

interface Props {
  lang: Locale;
  /** category id → label in this locale */
  categoryLabels: Record<string, string>;
}

/** A row of the table: how to show a value, and how to rank it when "higher is better". */
interface Row {
  key: string;
  label: string;
  show: (f: Fact) => ReactNode;
  rank?: (f: Fact) => number | null;
}

const HEALTH_RANK = { ok: 2, warn: 1, danger: 0 } as const;
const COMPAT_RANK = { both: 3, v2: 2, v1: 1 } as const;
const HEALTH_TEXT = { ok: 'text-ok', warn: 'text-warn', danger: 'text-danger' } as const;

const fromUrl = () =>
  (new URLSearchParams(window.location.search).get('p') ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

export default function CompareView({ lang, categoryLabels }: Props) {
  const t = useTranslations(lang);
  const [facts, setFacts] = useState<Fact[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [slugs, setSlugs] = useState<string[]>([]);
  const [restored, setRestored] = useState(false);
  const [query, setQuery] = useState('');
  const [copied, setCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setSlugs(fromUrl().slice(0, COMPARE_MAX));
    setRestored(true);
    fetch(lang === 'zh' ? '/zh/facts.json' : '/facts.json')
      .then((r) => r.json())
      .then((data: Fact[]) => setFacts(data))
      .catch(() => setFailed(true));
  }, [lang]);

  const bySlug = useMemo(() => new Map((facts ?? []).map((f) => [f.s, f])), [facts]);
  const picked = useMemo(() => slugs.map((s) => bySlug.get(s)).filter((f): f is Fact => Boolean(f)), [slugs, bySlug]);

  // The URL is the shareable state; the tray mirrors it so leaving the page keeps the pick.
  useEffect(() => {
    if (!restored) return;
    // Built by hand: URLSearchParams would encode the commas and make the link unreadable.
    const qs = slugs.length ? `?p=${slugs.map(encodeURIComponent).join(',')}` : '';
    window.history.replaceState(window.history.state, '', window.location.pathname + qs);
    if (facts) setCompare(picked.map((f) => ({ s: f.s, t: f.t })));
  }, [slugs, restored, facts, picked]);

  const add = (slug: string) => {
    setSlugs((prev) => (prev.includes(slug) || prev.length >= COMPARE_MAX ? prev : [...prev, slug]));
    setQuery('');
  };
  const remove = (slug: string) => setSlugs((prev) => prev.filter((s) => s !== slug));

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q || !facts) return [];
    return facts
      .filter((f) => !slugs.includes(f.s) && (f.t.toLowerCase().includes(q) || f.n.toLowerCase().includes(q)))
      .sort((a, b) => b.r - a.r)
      .slice(0, 8);
  }, [query, facts, slugs]);

  // Quick picks: the first plugin's category, or the directory's best overall.
  const suggestions = useMemo(() => {
    if (!facts) return [];
    const anchor = picked[0];
    return facts
      .filter((f) => !slugs.includes(f.s) && (!anchor || f.c === anchor.c))
      .sort((a, b) => b.sc - a.sc)
      .slice(0, 6);
  }, [facts, picked, slugs]);

  const reference = useMemo(() => (facts ? Math.max(...facts.map((f) => (f.p ? Date.parse(f.p) : 0))) : 0), [facts]);

  const groups: { title: string; rows: Row[] }[] = [
    {
      title: t('compare.group.popularity'),
      rows: [
        { key: 'stars', label: t('compare.row.stars'), show: (f) => formatNumber(f.r), rank: (f) => f.r },
        { key: 'week', label: t('compare.row.week'), show: (f) => (f.w > 0 ? `+${formatNumber(f.w)}` : '—'), rank: (f) => f.w },
        { key: 'installs', label: t('compare.row.installs'), show: (f) => formatNumber(f.m), rank: (f) => f.m },
      ],
    },
    {
      title: t('compare.group.quality'),
      rows: [
        { key: 'score', label: t('compare.row.score'), show: (f) => f.sc.toFixed(1), rank: (f) => f.sc },
        {
          key: 'health',
          label: t('compare.row.health'),
          show: (f) => (
            <span className={cn('inline-flex items-center gap-1.5', HEALTH_TEXT[f.h])}>
              <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
              {t(`health.level.${f.h}`)}
            </span>
          ),
          rank: (f) => HEALTH_RANK[f.h],
        },
        {
          key: 'commit',
          label: t('compare.row.commit'),
          show: (f) => (f.p ? <span title={f.p}>{timeAgo(f.p, lang)}</span> : '—'),
          // Against the newest commit in the data, like the explorer's "recent".
          rank: (f) => (f.p ? Date.parse(f.p) - reference : null),
        },
        { key: 'issues', label: t('compare.row.issues'), show: (f) => (f.i === null ? '—' : formatNumber(f.i)) },
        {
          key: 'status',
          label: t('compare.row.status'),
          show: (f) =>
            f.dp || f.ar ? (
              <span className="text-danger">{[f.dp && t('compare.status.deprecated'), f.ar && t('compare.status.archived')].filter(Boolean).join(' · ')}</span>
            ) : (
              <span className="text-muted-foreground">{t('compare.status.fine')}</span>
            ),
        },
      ],
    },
    {
      title: t('compare.group.meta'),
      rows: [
        {
          key: 'opencode',
          label: t('compare.row.opencode'),
          show: (f) =>
            f.oc ? (
              <span title={t(f.oi ? 'compat.tip.inferred' : `compat.tip.${f.oc}`)} className="font-mono">
                {t(`compat.${f.oc}`)}
                {f.oi && '*'}
              </span>
            ) : (
              <span className="text-muted-foreground">{t('compat.unknown')}</span>
            ),
          rank: (f) => (f.oc ? COMPAT_RANK[f.oc] : 0),
        },
        { key: 'category', label: t('compare.row.category'), show: (f) => categoryLabels[f.c] ?? f.c },
        { key: 'version', label: t('compare.row.version'), show: (f) => (f.v ? <span className="font-mono">{f.v}</span> : '—') },
        { key: 'license', label: t('compare.row.license'), show: (f) => f.l ?? '—' },
        { key: 'created', label: t('compare.row.created'), show: (f) => f.cr ?? '—' },
      ],
    },
  ];

  /** Columns holding the row's best value; none when there's nothing to choose between. */
  const best = (row: Row): Set<string> => {
    if (!row.rank || picked.length < 2) return new Set();
    const values = picked.map((f) => [f.s, row.rank!(f)] as const).filter(([, v]) => v !== null) as [string, number][];
    if (values.length < 2) return new Set();
    const top = Math.max(...values.map(([, v]) => v));
    const winners = values.filter(([, v]) => v === top);
    return winners.length === values.length ? new Set() : new Set(winners.map(([s]) => s));
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked: the address bar still has it.
    }
  };

  const full = slugs.length >= COMPARE_MAX;
  const cols = picked.length + (full ? 0 : 1);

  const search = (
    <div className="relative">
      <label className="flex h-9 items-center gap-2 rounded-md border border-input bg-background px-2.5 shadow-xs transition-[border-color,box-shadow] focus-within:border-ring focus-within:ring-3 focus-within:ring-ring/20">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-4 shrink-0 text-muted-foreground" aria-hidden="true">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
        <span className="sr-only">{t('compare.add')}</span>
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && matches[0]) add(matches[0].s);
            if (e.key === 'Escape') setQuery('');
          }}
          placeholder={full ? t('compare.full') : t('compare.addPlaceholder')}
          disabled={full || !facts}
          className="min-w-0 flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed"
        />
      </label>
      {matches.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-80 overflow-y-auto rounded-lg border border-border bg-popover p-1 shadow-lg">
          {matches.map((f) => (
            <li key={f.s}>
              <button
                type="button"
                onClick={() => add(f.s)}
                className="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
              >
                <Avatar fact={f} size={24} />
                <span className="min-w-0 flex-1 truncate">{f.t}</span>
                <span className="tabular shrink-0 text-xs text-muted-foreground">★ {compactNumber(f.r)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (failed) return <p className="rounded-xl border border-border bg-card p-8 text-center text-sm text-muted-foreground">{t('palette.failed')}</p>;

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {t('compare.count', { n: picked.length, max: COMPARE_MAX })}
        </p>
        {picked.length > 0 && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copy}
              className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-xs font-medium shadow-xs transition-colors hover:bg-accent"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="size-3.5" aria-hidden="true">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
              {copied ? t('compare.copied') : t('compare.share')}
            </button>
            <button
              type="button"
              onClick={() => setSlugs([])}
              className="inline-flex h-8 items-center rounded-md px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {t('compare.clear')}
            </button>
          </div>
        )}
      </div>

      {!facts ? (
        <div className="mt-4 h-96 animate-pulse rounded-xl border border-border bg-muted/40" aria-label={t('compare.loading')} />
      ) : picked.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border bg-card px-6 py-12 text-center">
          <p className="font-medium">{t('compare.empty')}</p>
          <p className="mx-auto mt-1.5 max-w-md text-sm text-muted-foreground">{t('compare.emptyBody')}</p>
          <div className="mx-auto mt-6 max-w-sm text-left">{search}</div>
          <Suggestions title={t('compare.popular')} items={suggestions} onAdd={add} />
        </div>
      ) : (
        <>
          <div className="mt-4 overflow-x-auto rounded-xl border border-border bg-card shadow-xs">
            <table className="w-full min-w-[640px] border-collapse text-sm" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col className="w-36 sm:w-44" />
                {Array.from({ length: cols }, (_, i) => (
                  <col key={i} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b border-border">
                  <th scope="col" className="sticky left-0 z-10 bg-card" />
                  {picked.map((f) => (
                    <th key={f.s} scope="col" className="relative p-4 text-left align-top font-normal">
                      <button
                        type="button"
                        onClick={() => remove(f.s)}
                        aria-label={t('compare.remove', { title: f.t })}
                        className="absolute top-2 right-2 grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="size-3.5" aria-hidden="true">
                          <path d="M18 6 6 18M6 6l12 12" />
                        </svg>
                      </button>
                      <Avatar fact={f} size={36} />
                      <a href={localePath(lang, `/plugins/${f.s}`)} className="mt-2.5 block truncate pr-5 font-semibold hover:underline">
                        {f.t}
                      </a>
                      <span className="block truncate font-mono text-xs text-muted-foreground">{f.n}</span>
                      {f.d && <span className="mt-1.5 line-clamp-2 text-xs leading-5 text-muted-foreground">{f.d}</span>}
                    </th>
                  ))}
                  {!full && (
                    <th scope="col" className="p-4 text-left align-top font-normal">
                      <span className="mb-2 block text-xs font-medium text-muted-foreground">{t('compare.add')}</span>
                      {search}
                    </th>
                  )}
                </tr>
              </thead>
              {groups.map((g) => (
                <tbody key={g.title}>
                  <tr>
                    <th
                      scope="colgroup"
                      colSpan={cols + 1}
                      className="sticky left-0 bg-muted/50 px-4 py-2 text-left text-xs font-medium tracking-wide text-muted-foreground"
                    >
                      {g.title}
                    </th>
                  </tr>
                  {g.rows.map((row) => {
                    const winners = best(row);
                    return (
                      <tr key={row.key} className="border-t border-border">
                        <th scope="row" className="sticky left-0 z-10 bg-card px-4 py-3 text-left text-xs font-normal text-muted-foreground">
                          {row.label}
                        </th>
                        {picked.map((f) => (
                          <td
                            key={f.s}
                            className={cn('tabular px-4 py-3', winners.has(f.s) && 'bg-ok-bg/60 font-semibold text-ok')}
                            title={winners.has(f.s) ? t('compare.best') : undefined}
                          >
                            <span className="inline-flex items-center gap-1.5">
                              {row.show(f)}
                              {winners.has(f.s) && (
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="size-3" aria-label={t('compare.best')}>
                                  <path d="M20 6 9 17l-5-5" />
                                </svg>
                              )}
                            </span>
                          </td>
                        ))}
                        {!full && <td />}
                      </tr>
                    );
                  })}
                </tbody>
              ))}
            </table>
          </div>
          {!full && (
            <Suggestions
              title={t('compare.suggest', { category: categoryLabels[picked[0].c] ?? picked[0].c })}
              items={suggestions}
              onAdd={add}
            />
          )}
        </>
      )}
    </div>
  );
}

function Suggestions({ title, items, onAdd }: { title: string; items: Fact[]; onAdd: (slug: string) => void }) {
  if (!items.length) return null;
  return (
    <div className="mt-6 text-left">
      <p className="text-xs font-medium text-muted-foreground">{title}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((f) => (
          <button
            key={f.s}
            type="button"
            onClick={() => onAdd(f.s)}
            className="inline-flex h-8 max-w-full items-center gap-2 rounded-full border border-border bg-background pr-3 pl-1 text-xs font-medium shadow-xs transition-colors hover:bg-accent"
          >
            <Avatar fact={f} size={22} />
            <span className="truncate">{f.t}</span>
            <span aria-hidden="true" className="text-muted-foreground">
              +
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Avatar({ fact: f, size }: { fact: Fact; size: number }) {
  const style = { width: size, height: size };
  if (f.a) {
    const src = f.a.startsWith('http') ? f.a : `${AVATAR_HOST}${f.a}`;
    return <img src={avatarUrl(src, size)} alt="" width={size} height={size} style={style} className="shrink-0 rounded-md border border-border object-cover" loading="lazy" />;
  }
  const { letter, color } = letterAvatar(f.t);
  return (
    <span style={{ ...style, background: color, fontSize: size * 0.4 }} className="grid shrink-0 place-items-center rounded-md font-medium text-white">
      {letter}
    </span>
  );
}
