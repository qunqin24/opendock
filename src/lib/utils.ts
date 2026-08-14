import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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

/** Relative time in Chinese, e.g. "3 天前". */
export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '未知';
  const diff = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(diff)) return '未知';

  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return mins <= 1 ? '刚刚' : `${mins} 分钟前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} 个月前`;
  return `${Math.floor(months / 12)} 年前`;
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

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '未知';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '未知';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
