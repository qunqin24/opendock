/**
 * Day-by-day series for the home page's small charts, computed at build time.
 * Everything is measured back from the snapshot date, not the build date,
 * so a rebuild of an old snapshot draws the same picture.
 */
import history from '../../data/history.json';
import { generatedAt, plugins } from './plugins';

const DAY = 864e5;
const iso = (t: number) => new Date(t).toISOString().slice(0, 10);
const snapshotDay = Date.parse(generatedAt.slice(0, 10));

export interface Point {
  date: string;
  value: number;
}

/** The last `days` calendar days, oldest first, ending on the snapshot day. */
function window(days: number): string[] {
  return Array.from({ length: days }, (_, i) => iso(snapshotDay - (days - 1 - i) * DAY));
}

/** Plugins first published on each day. */
export function newPluginsPerDay(days = 30): Point[] {
  const counts = new Map<string, number>();
  for (const p of plugins) {
    if (!p.createdAt) continue;
    const d = p.createdAt.slice(0, 10);
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }
  return window(days).map((date) => ({ date, value: counts.get(date) ?? 0 }));
}

/**
 * Stars gained across the ecosystem each day, from the daily star history.
 * Only packages recorded on both days count, so a newly tracked repository
 * doesn't show up as a spike.
 */
export function starsGainedPerDay(days = 30): Point[] {
  const series = history as Record<string, Record<string, number>>;
  const dates = window(days + 1);
  const gained = new Map<string, number>();
  for (const points of Object.values(series)) {
    for (let i = 1; i < dates.length; i++) {
      const before = points[dates[i - 1]];
      const after = points[dates[i]];
      if (before == null || after == null || after <= before) continue;
      gained.set(dates[i], (gained.get(dates[i]) ?? 0) + after - before);
    }
  }
  return dates.slice(1).map((date) => ({ date, value: gained.get(date) ?? 0 }));
}

/**
 * SVG path data for a small chart in a `width`×`height` box: the line, and
 * the same line closed down to the baseline for an area fill.
 */
export function sparkline(points: Point[], width: number, height: number, pad = 2) {
  const max = Math.max(1, ...points.map((p) => p.value));
  const step = points.length > 1 ? width / (points.length - 1) : width;
  const coords = points.map((p, i) => [i * step, pad + (height - pad * 2) * (1 - p.value / max)] as const);
  // Catmull-Rom through every point, as cubic Béziers: the curve still
  // passes through each day's value, it just doesn't zig-zag between them.
  const f = (n: number) => n.toFixed(1);
  let line = `M${f(coords[0][0])},${f(coords[0][1])}`;
  for (let i = 0; i < coords.length - 1; i++) {
    const [x0, y0] = coords[Math.max(0, i - 1)];
    const [x1, y1] = coords[i];
    const [x2, y2] = coords[i + 1];
    const [x3, y3] = coords[Math.min(coords.length - 1, i + 2)];
    const clamp = (y: number) => Math.min(height, Math.max(0, y));
    line += `C${f(x1 + (x2 - x0) / 6)},${f(clamp(y1 + (y2 - y0) / 6))} ${f(x2 - (x3 - x1) / 6)},${f(clamp(y2 - (y3 - y1) / 6))} ${f(x2)},${f(y2)}`;
  }
  const area = `${line}L${width},${height}L0,${height}Z`;
  return { line, area, max };
}
