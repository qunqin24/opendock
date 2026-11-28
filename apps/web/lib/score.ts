/**
 * The ranking score split into its parts, for the scorecard. Mirrors
 * scripts/lib/score.mjs (the pipeline computes the stored score); keep the
 * two in step until the pipeline moves into packages/core.
 */
import type { Plugin } from './data';

const DAY = 86_400_000;

function logNorm(value: number, ceiling: number): number {
  if (!value || value <= 0) return 0;
  return Math.min(1, Math.log10(value + 1) / Math.log10(ceiling + 1));
}

function freshness(pushedAt: string | null, now = Date.now()): number {
  if (!pushedAt) return 0;
  const days = (now - new Date(pushedAt).getTime()) / DAY;
  if (days <= 7) return 1;
  if (days >= 365) return 0;
  return 1 - (days - 7) / (365 - 7);
}

const credibleStars = (stars: number, downloadsMonth: number) => Math.min(stars, Math.max(downloadsMonth * 8, 1000));

export interface ScorePart {
  id: 'downloads' | 'stars' | 'activity' | 'momentum';
  label: string;
  weight: number;
  /** 0..1 */
  value: number;
}

export function scoreParts(p: Plugin): ScorePart[] {
  const credited = credibleStars(p.stars, p.downloadsMonth);
  return [
    { id: 'downloads', label: 'Downloads', weight: 0.35, value: logNorm(p.downloadsMonth, 500_000) },
    { id: 'stars', label: 'Stars', weight: 0.35, value: logNorm(credited, 20_000) },
    { id: 'activity', label: 'Recent work', weight: 0.2, value: freshness(p.pushedAt) },
    {
      id: 'momentum',
      label: 'Momentum',
      weight: 0.1,
      value: Math.min(1, logNorm(p.archived ? 0 : p.starsDelta30d, 500) * (1 + 1 / Math.log10(credited + 10))),
    },
  ];
}
