/**
 * Ranking score + health signals.
 *
 * Star count alone is a cumulative metric: it permanently favours old
 * projects and buries good new plugins. The composite score blends four
 * normalised signals so a fresh, actively-maintained, well-downloaded
 * plugin can outrank a stale one with more historical stars.
 */

const DAY = 86_400_000;

/** Compresses long-tail counts into a 0..1 range. */
function logNorm(value, ceiling) {
  if (!value || value <= 0) return 0;
  return Math.min(1, Math.log10(value + 1) / Math.log10(ceiling + 1));
}

/** 1.0 when touched today, decaying to 0 at ~1 year stale. */
export function freshness(pushedAt, now = Date.now()) {
  if (!pushedAt) return 0;
  const days = (now - new Date(pushedAt).getTime()) / DAY;
  if (days <= 7) return 1;
  if (days >= 365) return 0;
  return 1 - (days - 7) / (365 - 7);
}

/**
 * Stars belong to a repository; downloads belong to a package. When a plugin
 * is published out of a large project's monorepo it inherits that repo's
 * entire star count — `@mem0/opencode-plugin` shows 63k stars because
 * `mem0ai/mem0` has 63k stars, not because the plugin is popular. Left
 * uncorrected this puts packages with 49 monthly downloads at the top of the
 * board.
 *
 * So stars are only credited up to what the package's own adoption supports.
 * A plugin people actually install will clear the ceiling easily; one that
 * merely lives next to a famous README will not. The floor keeps genuinely
 * new plugins from being zeroed before they have downloads.
 */
export function credibleStars(stars = 0, downloadsMonth = 0) {
  return Math.min(stars, Math.max(downloadsMonth * 8, 1000));
}

/**
 * @param {object} p
 * @param {number} p.stars
 * @param {number} p.downloadsMonth  last-month npm downloads
 * @param {string|null} p.pushedAt
 * @param {number} p.starsDelta30d   stars gained since the oldest snapshot in window
 * @param {boolean} p.archived
 * @param {number} [p.now]
 */
export function computeScore({
  stars = 0,
  downloadsMonth = 0,
  pushedAt = null,
  starsDelta30d = 0,
  archived = false,
  now = Date.now(),
}) {
  const popularity = logNorm(credibleStars(stars, downloadsMonth), 20_000);
  const adoption = logNorm(downloadsMonth, 500_000);
  const active = freshness(pushedAt, now);
  // Growth is relative: +50 stars on a 100-star repo matters more than on a 5k one.
  // Inherited stars are excluded here too, or a monorepo's growth would leak in.
  const growth = Math.min(
    1,
    logNorm(archived ? 0 : starsDelta30d, 500) * (1 + 1 / Math.log10(credibleStars(stars, downloadsMonth) + 10)),
  );

  let score = popularity * 0.35 + adoption * 0.35 + active * 0.2 + growth * 0.1;
  if (archived) score *= 0.35;

  return Math.round(score * 10_000) / 100; // 0..100, 2dp
}

/**
 * Warning badges. These are the main reason to use this site over a
 * hand-maintained awesome-list: they tell you what to avoid.
 */
export function healthSignals(p, now = Date.now()) {
  const signals = [];
  const days = p.pushedAt ? (now - new Date(p.pushedAt).getTime()) / DAY : null;

  if (p.archived) signals.push({ id: 'archived', level: 'danger', label: '仓库已归档' });
  if (p.deprecated) signals.push({ id: 'deprecated', level: 'danger', label: 'npm 已标记废弃' });
  if (days !== null && days > 365) signals.push({ id: 'stale-year', level: 'danger', label: '超过一年未更新' });
  else if (days !== null && days > 180) signals.push({ id: 'stale', level: 'warn', label: '半年未更新' });
  if (!p.repoUrl) signals.push({ id: 'no-repo', level: 'warn', label: '未提供源码仓库' });
  if (!p.readme || p.readme.length < 200) signals.push({ id: 'no-readme', level: 'warn', label: '缺少文档' });
  if (!p.license) signals.push({ id: 'no-license', level: 'warn', label: '未声明开源协议' });

  if (!signals.length) {
    signals.push({ id: 'healthy', level: 'ok', label: '维护活跃' });
  }
  return signals;
}
