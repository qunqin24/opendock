import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Locale } from './i18n';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 12345 → "12.3k", 1234567 → "1.2M" */
export function compactNumber(n: number): string {
  if (!n) return '0';
  if (n < 1000) return String(n);
  if (n < 1_000_000) {
    const v = n / 1000;
    return `${v < 10 ? v.toFixed(1).replace(/\.0$/, '') : Math.round(v)}k`;
  }
  const v = n / 1_000_000;
  return `${v < 10 ? v.toFixed(1).replace(/\.0$/, '') : Math.round(v)}M`;
}

export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n ?? 0);
}

/** Relative time, e.g. "3 days ago" / "3 天前". */
export function timeAgo(iso: string | null | undefined, lang: Locale = 'en'): string {
  const zh = lang === 'zh';
  if (!iso) return zh ? '未知' : 'unknown';
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return zh ? '未知' : 'unknown';

  const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? '' : 's'} ago`;

  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return mins <= 1 ? (zh ? '刚刚' : 'just now') : zh ? `${mins} 分钟前` : plural(mins, 'minute');
  const hours = Math.floor(mins / 60);
  if (hours < 24) return zh ? `${hours} 小时前` : plural(hours, 'hour');
  const days = Math.floor(hours / 24);
  if (days < 30) return zh ? `${days} 天前` : plural(days, 'day');
  const months = Math.floor(days / 30);
  if (months < 12) return zh ? `${months} 个月前` : plural(months, 'month');
  const years = Math.floor(months / 12);
  return zh ? `${years} 年前` : plural(years, 'year');
}

/**
 * Deterministic PRNG (mulberry32) so build-time art — e.g. the hero's berth
 * grid — looks the same on every render instead of reshuffling per request
 * in dev mode.
 */
function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Seeded Fisher-Yates shuffle — same input + seed always yields the same order. */
export function seededShuffle<T>(items: T[], seed = 1): T[] {
  const rng = mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

export function formatDate(iso: string | null | undefined, lang: Locale = 'en'): string {
  if (!iso) return lang === 'zh' ? '未知' : 'unknown';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return lang === 'zh' ? '未知' : 'unknown';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * GitHub serves avatars at ~460px by default, which is ten times the size any
 * slot on this site renders them at. `s=` is honoured on every avatar URL the
 * crawler stores, and a list page paints 60 of them at once.
 */
export function avatarUrl(url: string, size: number): string {
  return `${url}${url.includes('?') ? '&' : '?'}s=${size * 2}`;
}
