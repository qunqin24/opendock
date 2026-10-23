/**
 * Translated READMEs. Many repos ship `README.zh-CN.md`, `docs/README_JA.md`
 * and so on, and link them from the top of the main README
 * ("English · 简体中文 · 日本語"). The pipeline fetches the variants those
 * links point at; the detail page renders them and turns the links into an
 * in-page language switch instead of a trip to GitHub.
 *
 * Shared by scripts/fetch-plugins.mjs and src/lib/readme.ts, so it stays
 * dependency-free plain JS.
 */

/** Languages we can label. A code outside this list is not a language ("README.dev.md"). */
export const LANG_NAMES = {
  en: 'English',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  ja: '日本語',
  ko: '한국어',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  ru: 'Русский',
  pt: 'Português',
  'pt-BR': 'Português (BR)',
  it: 'Italiano',
  vi: 'Tiếng Việt',
  tr: 'Türkçe',
  fa: 'فارسی',
  ar: 'العربية',
  he: 'עברית',
  uk: 'Українська',
  pl: 'Polski',
  nl: 'Nederlands',
  id: 'Bahasa Indonesia',
  ms: 'Bahasa Melayu',
  th: 'ไทย',
  hi: 'हिन्दी',
  bn: 'বাংলা',
  el: 'Ελληνικά',
  cs: 'Čeština',
  sv: 'Svenska',
  no: 'Norsk',
  da: 'Dansk',
  fi: 'Suomi',
  hu: 'Magyar',
  ro: 'Română',
};

/** Codes repos actually use for the same language, mapped onto one key. */
const ALIASES = {
  zh: 'zh-CN',
  cn: 'zh-CN',
  'zh-cn': 'zh-CN',
  'zh-hans': 'zh-CN',
  'zh-sg': 'zh-CN',
  'zh-tw': 'zh-TW',
  'zh-hk': 'zh-TW',
  'zh-hant': 'zh-TW',
  tw: 'zh-TW',
  jp: 'ja',
  kr: 'ko',
  'pt-br': 'pt-BR',
  br: 'pt-BR',
  gr: 'el',
  ua: 'uk',
  vn: 'vi',
  cz: 'cs',
  se: 'sv',
  dk: 'da',
  ir: 'fa',
};

const VARIANT_FILE = /^readme[._-]([a-z]{2,3}(?:[-_][a-z]{2,4})?)\.(?:md|markdown)$/i;

/** `zh_CN` / `JA-jp` / `pt-br` → a LANG_NAMES key, or null. */
export function normalizeLang(code) {
  const c = String(code).toLowerCase().replace(/_/g, '-');
  if (ALIASES[c]) return ALIASES[c];
  const [base] = c.split('-');
  const lang = ALIASES[base] ?? base;
  return lang in LANG_NAMES ? lang : null;
}

/**
 * The repo-relative path a README link points at, or null when it leaves the
 * repo. `baseDir` is the linking file's directory ('' for the root README),
 * since `docs/README.zh.md` links back with `../README.md`.
 */
export function repoPath(href, repoSlug, baseDir = '') {
  if (!href) return null;
  const url = href.trim().replace(/[?#].*$/, '');
  if (!url) return null;

  const gh = url.match(/^https?:\/\/github\.com\/([^/]+\/[^/]+)\/(?:blob|tree|raw)\/[^/]+\/(.+)$/i);
  const raw = url.match(/^https?:\/\/raw\.githubusercontent\.com\/([^/]+\/[^/]+)\/[^/]+\/(.+)$/i);
  const abs = gh ?? raw;
  if (abs) return repoSlug && abs[1].toLowerCase() === repoSlug.toLowerCase() ? decode(abs[2]) : null;
  if (/^([a-z][a-z0-9+.-]*:|\/\/)/i.test(url)) return null;

  // Resolve against the linking file the way GitHub does; a leading slash is the repo root.
  const resolved = new URL(url, `https://repo.invalid/${baseDir ? `${baseDir}/` : ''}`).pathname.slice(1);
  return decode(resolved) || null;
}

function decode(s) {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

/** Every href in a README, markdown and HTML alike. */
function hrefs(markdown) {
  const out = [];
  for (const m of markdown.matchAll(/\]\(\s*<?([^)\s>]+)/g)) out.push(m[1]);
  for (const m of markdown.matchAll(/\bhref\s*=\s*["']([^"']+)["']/gi)) out.push(m[1]);
  // Reference-style: [简体中文]: ./README.zh-CN.md
  for (const m of markdown.matchAll(/^\s*\[[^\]]+\]:\s*<?(\S+?)>?(?:\s|$)/gm)) out.push(m[1]);
  return out;
}

/**
 * Translated READMEs this one links to, first link per language wins:
 * `[{ lang: 'zh-CN', path: 'README.zh-CN.md' }, …]`.
 */
export function findReadmeVariants(markdown, repoSlug, max = 10) {
  const found = new Map();
  for (const href of hrefs(markdown)) {
    const path = repoPath(href, repoSlug);
    if (!path) continue;
    const m = path.split('/').pop().match(VARIANT_FILE);
    const lang = m && normalizeLang(m[1]);
    if (lang && !found.has(lang)) found.set(lang, path);
    if (found.size >= max) break;
  }
  return [...found].map(([lang, path]) => ({ lang, path }));
}

/**
 * Rough language of a README, by script: the main README is not always the
 * English one, and it needs a label in the switcher. Code and links are
 * stripped first since they are Latin in every language.
 */
export function guessLang(markdown) {
  const text = markdown
    .replace(/```[\s\S]*?```/g, '')
    .replace(/`[^`]*`/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\]\([^)]*\)/g, ']');
  const count = (re) => (text.match(re) ?? []).length;
  const latin = count(/[A-Za-z]/g);
  const kana = count(/[぀-ヿ]/g);
  const han = count(/\p{Script=Han}/gu);
  const hangul = count(/\p{Script=Hangul}/gu);
  const cyrillic = count(/\p{Script=Cyrillic}/gu);
  // CJK packs a word into one or two characters, English into ~5 letters.
  const share = (n) => (n * 3) / (n * 3 + latin || 1);
  if (share(kana) > 0.15) return 'ja';
  if (share(hangul) > 0.3) return 'ko';
  if (share(han) > 0.3) return 'zh-CN';
  if (cyrillic > latin) return 'ru';
  return 'en';
}
