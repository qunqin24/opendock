import { useEffect, useMemo, useRef, useState } from 'react';
import type { Fact } from '../lib/facts';
import { cn } from '../lib/utils';
import { localePath, useTranslations, type Locale } from '../lib/i18n';

type Tone = 'error' | 'warn' | 'info' | 'ok';
type Target = 'v1' | 'v2';

interface Finding {
  tone: Tone;
  text: string;
}

interface Entry {
  /** As written in the config. */
  raw: string;
  /** npm name, or null for a local path / URL. */
  name: string | null;
  /** Version or range after the name, if any. */
  version: string | null;
}

/** What npm says about a package we don't list (abbreviated metadata). */
interface NpmInfo {
  exists: boolean;
  latest: string | null;
  deprecated: boolean;
}

const STORAGE_KEY = 'opendock:config-check';
const SAMPLE = `{
  "$schema": "https://opencode.ai/config.json",
  // Plugins load in order; pin a version with @x.y.z
  "plugin": [
    "oh-my-opencode-slim",
    "@dietrichgebert/ponytail@1.0.0",
    "opencode-some-unknown-plugin",
    "oh-my-opencode-slim",
    "./plugins/local-helper.ts"
  ]
}`;

/** opencode.json may be JSONC: drop comments and trailing commas, leaving strings alone. */
export function stripJsonc(src: string): string {
  let out = '';
  let inString = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inString) {
      out += c;
      if (c === '\\') out += src[++i] ?? '';
      else if (c === '"') inString = false;
    } else if (c === '"') {
      inString = true;
      out += c;
    } else if (c === '/' && src[i + 1] === '/') {
      while (i < src.length && src[i] !== '\n') i++;
      out += '\n';
    } else if (c === '/' && src[i + 1] === '*') {
      i += 2;
      while (i < src.length && !(src[i] === '*' && src[i + 1] === '/')) out += src[i++] === '\n' ? '\n' : ' ';
      i++;
    } else out += c;
  }
  return out.replace(/,(\s*[}\]])/g, '$1');
}

/** `@scope/name@1.2.3` → name + version; paths and URLs have no npm name. */
export function parseSpec(raw: string): Entry {
  const spec = raw.trim();
  if (/^(\.{0,2}\/|~|file:|https?:|git[+:]|github:)/i.test(spec) || /^[A-Za-z]:\\/.test(spec)) {
    return { raw, name: null, version: null };
  }
  const at = spec.indexOf('@', spec.startsWith('@') ? 1 : 0);
  return at > 0 ? { raw, name: spec.slice(0, at), version: spec.slice(at + 1) || null } : { raw, name: spec, version: null };
}

const isExact = (v: string) => /^\d+\.\d+\.\d+(?:[-+].*)?$/.test(v);

export default function ConfigChecker({ lang }: { lang: Locale }) {
  const t = useTranslations(lang);
  const [text, setText] = useState('');
  const [target, setTarget] = useState<Target>('v2');
  const [facts, setFacts] = useState<Map<string, Fact> | null>(null);
  const [npm, setNpm] = useState<Map<string, NpmInfo | 'loading' | 'failed'>>(new Map());
  const [copied, setCopied] = useState(false);
  const restored = useRef(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) setText(saved);
      const v = new URLSearchParams(window.location.search).get('opencode');
      if (v === 'v1' || v === 'v2') setTarget(v);
    } catch {
      // Storage blocked: start empty.
    }
    restored.current = true;
    fetch('/facts.json')
      .then((r) => r.json())
      .then((data: Fact[]) => setFacts(new Map(data.map((f) => [f.n, f]))))
      .catch(() => setFacts(new Map()));
  }, [lang]);

  useEffect(() => {
    if (!restored.current) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, text);
    } catch {
      // Storage blocked: the paste just won't survive a reload.
    }
  }, [text]);

  // Parse: JSON errors first, then the plugin list.
  const parsed = useMemo((): { error: string | null; entries: Entry[]; hasPluginKey: boolean } => {
    if (!text.trim()) return { error: null, entries: [], hasPluginKey: false };
    let json: unknown;
    try {
      json = JSON.parse(stripJsonc(text));
    } catch (e) {
      return { error: (e as Error).message, entries: [], hasPluginKey: false };
    }
    if (!json || typeof json !== 'object' || Array.isArray(json)) return { error: t('config.notObject'), entries: [], hasPluginKey: false };
    const list = (json as Record<string, unknown>).plugin;
    if (list === undefined) return { error: null, entries: [], hasPluginKey: false };
    if (!Array.isArray(list)) return { error: t('config.pluginNotArray'), entries: [], hasPluginKey: true };
    // Entries are strings, or [spec, options] tuples.
    const entries = list
      .map((x) => (typeof x === 'string' ? x : Array.isArray(x) && typeof x[0] === 'string' ? x[0] : null))
      .filter((x): x is string => x !== null)
      .map(parseSpec);
    return { error: null, entries, hasPluginKey: true };
  }, [text, t]);

  // Look up packages we don't list straight from npm (the registry allows CORS).
  useEffect(() => {
    if (!facts) return;
    const unknown = [...new Set(parsed.entries.map((e) => e.name).filter((n): n is string => Boolean(n) && !facts.has(n!)))];
    const todo = unknown.filter((n) => !npm.has(n));
    if (!todo.length) return;
    setNpm((m) => new Map([...m, ...todo.map((n) => [n, 'loading'] as const)]));
    for (const name of todo) {
      fetch(`https://registry.npmjs.org/${name.replace('/', '%2f')}`, { headers: { accept: 'application/vnd.npm.install-v1+json' } })
        .then(async (r) => {
          if (r.status === 404) return { exists: false, latest: null, deprecated: false };
          if (!r.ok) throw new Error(String(r.status));
          const doc = await r.json();
          const latest: string | null = doc['dist-tags']?.latest ?? null;
          return { exists: true, latest, deprecated: Boolean(latest && doc.versions?.[latest]?.deprecated) };
        })
        .then((info: NpmInfo) => setNpm((m) => new Map(m).set(name, info)))
        .catch(() => setNpm((m) => new Map(m).set(name, 'failed')));
    }
  }, [parsed.entries, facts, npm]);

  const results = useMemo(() => {
    if (!facts) return [];
    const seen = new Map<string, number>();
    for (const e of parsed.entries) if (e.name) seen.set(e.name, (seen.get(e.name) ?? 0) + 1);

    return parsed.entries.map((e) => {
      const findings: Finding[] = [];
      if (!e.name) {
        findings.push({ tone: 'info', text: t('config.local') });
        return { entry: e, fact: null, findings };
      }
      if ((seen.get(e.name) ?? 0) > 1) findings.push({ tone: 'error', text: t('config.duplicate') });

      const fact = facts.get(e.name) ?? null;
      const info = npm.get(e.name);
      const latest = fact?.v ?? (info && typeof info === 'object' ? info.latest : null);

      if (fact) {
        if (fact.dp) findings.push({ tone: 'error', text: t('config.deprecated') });
        if (fact.ar) findings.push({ tone: 'warn', text: t('config.archived') });
        if (fact.h === 'danger' && !fact.dp && !fact.ar) findings.push({ tone: 'warn', text: t('config.unmaintained') });
        if (fact.oc === null) findings.push({ tone: 'info', text: t('config.compatUnknown') });
        else if (fact.oc !== 'both' && fact.oc !== target) {
          findings.push({ tone: 'error', text: t('config.compatMismatch', { want: target.toUpperCase(), has: fact.oc.toUpperCase() }) });
        }
      } else if (info === 'loading' || info === undefined) {
        findings.push({ tone: 'info', text: t('config.looking') });
      } else if (info === 'failed') {
        findings.push({ tone: 'warn', text: t('config.lookupFailed') });
      } else if (!info.exists) {
        findings.push({ tone: 'error', text: t('config.notOnNpm') });
      } else {
        findings.push({ tone: 'info', text: t('config.notListed') });
        if (info.deprecated) findings.push({ tone: 'error', text: t('config.deprecated') });
      }

      if (e.version && latest && e.version !== 'latest') {
        if (isExact(e.version) && e.version !== latest) findings.push({ tone: 'warn', text: t('config.outdated', { pinned: e.version, latest }) });
      }

      if (!findings.some((f) => f.tone !== 'info') && (fact || (info && typeof info === 'object' && info.exists))) {
        findings.unshift({ tone: 'ok', text: t('config.fine') });
      }
      return { entry: e, fact, findings };
    });
  }, [parsed.entries, facts, npm, target, t]);

  const totals = useMemo(() => {
    const all = results.flatMap((r) => r.findings);
    return { error: all.filter((f) => f.tone === 'error').length, warn: all.filter((f) => f.tone === 'warn').length };
  }, [results]);

  // The fixable part: duplicates dropped (first kept) and exact pins moved to latest.
  const fixed = useMemo(() => {
    if (!facts || !parsed.entries.length) return null;
    const kept = new Set<string>();
    const out: string[] = [];
    let changed = false;
    for (const e of parsed.entries) {
      if (!e.name) {
        out.push(e.raw);
        continue;
      }
      if (kept.has(e.name)) {
        changed = true;
        continue;
      }
      kept.add(e.name);
      const info = npm.get(e.name);
      const latest = facts.get(e.name)?.v ?? (info && typeof info === 'object' ? info.latest : null);
      if (e.version && isExact(e.version) && latest && e.version !== latest) {
        out.push(`${e.name}@${latest}`);
        changed = true;
      } else out.push(e.raw);
    }
    return changed ? JSON.stringify({ plugin: out }, null, 2) : null;
  }, [parsed.entries, facts, npm]);

  const copyFixed = async () => {
    if (!fixed) return;
    try {
      await navigator.clipboard.writeText(fixed);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked: the text is on screen to select.
    }
  };

  const tone = {
    error: 'text-danger bg-danger-bg',
    warn: 'text-warn bg-warn-bg',
    info: 'text-muted-foreground bg-muted',
    ok: 'text-ok bg-ok-bg',
  } as const;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      {/* Input */}
      <section className="min-w-0 rounded-xl border border-border bg-card shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3">
          <span className="font-mono text-sm font-medium">opencode.json</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setText(SAMPLE)}
              className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {t('config.sample')}
            </button>
            {text && (
              <button
                type="button"
                onClick={() => setText('')}
                className="rounded-md px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                {t('config.clear')}
              </button>
            )}
          </div>
        </div>
        <label className="sr-only" htmlFor="config-input">
          {t('config.inputLabel')}
        </label>
        <textarea
          id="config-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          spellCheck={false}
          placeholder={t('config.placeholder')}
          className="block h-80 w-full resize-y bg-transparent px-5 py-4 font-mono text-[0.8125rem] leading-6 placeholder:text-muted-foreground focus:outline-none lg:h-[28rem]"
        />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
          <span className="text-xs text-muted-foreground">{t('config.target')}</span>
          <div role="radiogroup" aria-label={t('config.target')} className="inline-flex h-8 items-center rounded-lg bg-muted p-[3px] text-muted-foreground">
            {(['v2', 'v1'] as const).map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={target === v}
                onClick={() => setTarget(v)}
                className="inline-flex h-full items-center rounded-md px-3 text-xs font-medium transition-[color,box-shadow] hover:text-foreground aria-checked:bg-background aria-checked:text-foreground aria-checked:shadow-sm"
              >
                OpenCode {v.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* Report */}
      <section className="min-w-0" aria-live="polite">
        {!text.trim() ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center">
            <p className="font-medium">{t('config.emptyTitle')}</p>
            <p className="mx-auto mt-1.5 max-w-sm text-sm text-muted-foreground">{t('config.emptyBody')}</p>
          </div>
        ) : parsed.error ? (
          <div className="rounded-xl border border-danger/30 bg-danger-bg p-5">
            <p className="font-medium text-danger">{t('config.invalid')}</p>
            <p className="mt-1.5 font-mono text-xs break-words text-danger/90">{parsed.error}</p>
          </div>
        ) : !parsed.entries.length ? (
          <div className="rounded-xl border border-border bg-card p-5">
            <p className="font-medium">{t(parsed.hasPluginKey ? 'config.noPlugins' : 'config.noPluginKey')}</p>
            <p className="mt-1.5 text-sm text-muted-foreground">{t('config.noPluginsBody')}</p>
          </div>
        ) : (
          <>
            <div
              className={cn(
                'flex items-center gap-3 rounded-xl border p-4',
                totals.error ? 'border-danger/30 bg-danger-bg' : totals.warn ? 'border-warn/30 bg-warn-bg' : 'border-ok/30 bg-ok-bg',
              )}
            >
              <span
                className={cn(
                  'grid size-9 shrink-0 place-items-center rounded-full text-base font-semibold',
                  totals.error ? 'bg-danger text-white' : totals.warn ? 'bg-warn text-white' : 'bg-ok text-white',
                )}
                aria-hidden="true"
              >
                {totals.error ? '!' : totals.warn ? '!' : '✓'}
              </span>
              <div className="min-w-0">
                <p className="font-medium">
                  {totals.error || totals.warn
                    ? t('config.summaryIssues', { errors: totals.error, warnings: totals.warn })
                    : t('config.summaryOk')}
                </p>
                <p className="text-xs text-muted-foreground">{t('config.summaryCount', { n: parsed.entries.length })}</p>
              </div>
            </div>

            <ol className="mt-4 space-y-3">
              {results.map(({ entry, fact, findings }, i) => (
                <li key={i} className="rounded-xl border border-border bg-card p-4 shadow-xs">
                  <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                    <code className="min-w-0 font-mono text-sm font-medium break-all">{entry.raw}</code>
                    {fact && (
                      <a href={localePath(lang, `/plugins/${fact.s}`)} className="shrink-0 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline">
                        {fact.t} →
                      </a>
                    )}
                  </div>
                  <ul className="mt-2.5 space-y-1.5">
                    {findings.map((f, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm">
                        <span className={cn('mt-0.5 grid size-4 shrink-0 place-items-center rounded-full text-[0.625rem] font-bold', tone[f.tone])} aria-hidden="true">
                          {f.tone === 'ok' ? '✓' : f.tone === 'info' ? 'i' : '!'}
                        </span>
                        <span className={cn(f.tone === 'error' ? 'text-danger' : f.tone === 'warn' ? 'text-warn' : f.tone === 'ok' ? 'text-foreground/80' : 'text-muted-foreground')}>
                          {f.text}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ol>

            {fixed && (
              <div className="mt-6 rounded-xl border border-border bg-card shadow-xs">
                <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-2.5">
                  <div>
                    <p className="text-sm font-medium">{t('config.fixedTitle')}</p>
                    <p className="text-xs text-muted-foreground">{t('config.fixedDesc')}</p>
                  </div>
                  <button
                    type="button"
                    onClick={copyFixed}
                    className="inline-flex h-8 shrink-0 items-center rounded-md border border-border bg-background px-3 text-xs font-medium shadow-xs transition-colors hover:bg-accent"
                  >
                    {copied ? t('config.copied') : t('config.copy')}
                  </button>
                </div>
                <pre className="overflow-x-auto px-4 py-3 font-mono text-xs leading-5">{fixed}</pre>
              </div>
            )}
          </>
        )}
      </section>
    </div>
  );
}
