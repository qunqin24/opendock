/**
 * IndexNow: tells Bing (and Yandex, Seznam, Naver…) which URLs changed, so a
 * refreshed snapshot shows up in results in days rather than whenever the
 * crawler next happens by. https://www.indexnow.org/documentation
 */

export const INDEXNOW_ENDPOINT = 'https://api.indexnow.org/indexnow';
/** The protocol's per-request limit. */
export const MAX_URLS = 10_000;

const LOCALES = ['', '/zh'];

/** Fields that change what a plugin page says. Stars and installs move daily on every page and don't count. */
const CONTENT_FIELDS = [
  'title',
  'version',
  'description',
  'descriptionZh',
  'category',
  'healthLevel',
  'deprecated',
  'archived',
  'license',
  'opencode',
  'hasReadme',
];

/**
 * URLs to submit for a refresh: the listing pages, which change every day,
 * and the detail pages of plugins that were added, removed (so engines drop
 * them) or whose content changed — in both locales.
 */
export function changedUrls(previous, next, site) {
  const base = site.replace(/\/$/, '');
  const prev = new Map((previous?.plugins ?? []).map((p) => [p.slug, p]));
  const curr = new Map((next?.plugins ?? []).map((p) => [p.slug, p]));

  const slugs = new Set();
  for (const [slug, p] of curr) {
    const old = prev.get(slug);
    if (!old || CONTENT_FIELDS.some((f) => JSON.stringify(old[f] ?? null) !== JSON.stringify(p[f] ?? null))) slugs.add(slug);
  }
  for (const slug of prev.keys()) if (!curr.has(slug)) slugs.add(slug);

  const paths = [
    '/',
    '/plugins/',
    '/rankings/',
    '/categories/',
    ...(next?.categories ?? []).map((c) => `/categories/${c.id}/`),
    ...[...slugs].map((s) => `/plugins/${s}/`),
  ];
  return LOCALES.flatMap((l) => paths.map((p) => `${base}${l}${p}`)).slice(0, MAX_URLS);
}

/** The IndexNow request body. The key file must be served at `keyLocation`. */
export function payload(site, key, urlList) {
  const url = new URL(site);
  return { host: url.host, key, keyLocation: `${url.origin}/${key}.txt`, urlList };
}
