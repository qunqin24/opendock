import { Marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { repoPath } from '../../scripts/lib/readme-langs.mjs';

const marked = new Marked({ gfm: true, breaks: false });

/**
 * READMEs are third-party markdown, so the pipeline is:
 *   1. drop the leading H1 (the page already shows the plugin name)
 *   2. render to HTML
 *   3. rewrite relative links/images to absolute GitHub URLs
 *   4. sanitize — this is untrusted content and must never emit script/style
 */
export async function renderReadme(
  markdown: string,
  opts: {
    repoSlug?: string | null;
    branch?: string;
    /** Directory of this file in the repo, for a translated README under docs/. */
    baseDir?: string;
    /** Repo path (lowercased) → language, for READMEs we render in-page. */
    langLinks?: Map<string, string>;
  } = {},
): Promise<string> {
  const { repoSlug, branch = 'HEAD', baseDir = '', langLinks } = opts;

  const body = markdown.replace(/^\s*#\s+.+\n+/, '');
  const raw = await marked.parse(body);

  const clean = sanitizeHtml(raw, {
    allowedTags: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'a', 'ul', 'ol', 'li', 'blockquote', 'pre', 'code',
      'em', 'strong', 'del', 'hr', 'br', 'img',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'details', 'summary', 'kbd', 'sup', 'sub', 'div', 'span',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'data-readme-lang'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'style'],
      code: ['class'],
      th: ['align'],
      td: ['align'],
      // READMEs centre their banners with <p align="center">, as GitHub renders it.
      p: ['align'],
      div: ['align'],
    },
    // The only styles that survive, and only in the shapes emitted below.
    // Note `max-width` accepts nothing but 100%, so no README can widen
    // itself past the column.
    allowedStyles: {
      img: {
        height: [/^\d{1,4}px$/],
        width: [/^auto$/],
        'max-width': [/^100%$/],
      },
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      // The page owns the H1. Shift README headings down so imported content
      // cannot create a second page-level heading.
      h1: 'h2',
      h2: 'h3',
      h3: 'h4',
      h4: 'h5',
      h5: 'h6',
      // A link to a translation we have stays on the page and switches the
      // README; every other link leaves the site, so harden the target.
      a: (tagName, attribs) => {
        const path = langLinks?.size ? repoPath(attribs.href, repoSlug, baseDir) : null;
        const lang = path ? langLinks!.get(path.toLowerCase()) : undefined;
        if (lang) {
          const switched: sanitizeHtml.Attributes = { href: '#readme', 'data-readme-lang': lang };
          if (attribs.title) switched.title = attribs.title;
          return { tagName, attribs: switched };
        }
        return {
          tagName,
          attribs: {
            ...attribs,
            href: absolutize(attribs.href, repoSlug, branch, 'blob', baseDir),
            target: '_blank',
            rel: 'noopener noreferrer nofollow ugc',
          },
        };
      },
      img: (tagName, attribs) => {
        // Only `height` needs restating. Tailwind's preflight sets
        // `img { height: auto }`, and a CSS rule beats an HTML presentational
        // attribute, so `height="28"` on a README icon is ignored and an SVG
        // with no intrinsic size stretches to the full column width.
        //
        // `width` is deliberately left alone: preflight doesn't override it,
        // so the attribute already works — and emitting an inline max-width
        // would outrank the `max-width:100%` that keeps wide images inside
        // the column, letting an 860px chart spill over the sidebar.
        const h = /^\d{1,4}$/.test(attribs.height ?? '') ? attribs.height : null;
        const style = h ? `height:${h}px;width:auto;max-width:100%` : null;

        return {
          tagName,
          attribs: {
            ...attribs,
            src: absolutize(attribs.src, repoSlug, branch, 'raw', baseDir),
            loading: 'lazy',
            ...(style ? { style } : {}),
          },
        };
      },
    },
  });

  return clean;
}

/** Relative README paths only resolve against the source repo, not our domain. */
function absolutize(
  url: string | undefined,
  repoSlug: string | null | undefined,
  branch: string,
  kind: 'blob' | 'raw',
  baseDir = '',
): string {
  if (!url) return '';
  if (/^(https?:|mailto:|#)/i.test(url)) return url;
  if (!repoSlug) return '';

  const clean = baseDir
    ? new URL(url, `https://repo.invalid/${baseDir}/`).pathname.slice(1)
    : url.replace(/^\.?\//, '');
  return kind === 'raw'
    ? `https://raw.githubusercontent.com/${repoSlug}/${branch}/${clean}`
    : `https://github.com/${repoSlug}/blob/${branch}/${clean}`;
}

/** First meaningful paragraph, used as a fallback meta description. */
export function readmeExcerpt(markdown: string, max = 200): string | null {
  const text = markdown
    .replace(/^\s*#.*$/gm, '')
    .replace(/```[\s\S]*?```/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/[*_`>#|-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text ? text.slice(0, max) : null;
}

export interface TocEntry {
  id: string;
  text: string;
  /** 2 for top-level README sections, 3 for their subsections. */
  level: 2 | 3;
}

/**
 * Gives the rendered README's section headings ids and returns them as a
 * table of contents. README headings arrive shifted down a level (the
 * page owns the h1), so the README's own h1/h2 sections are h2/h3 here.
 * Runs after sanitizing: the ids are ours, built from plain text.
 */
export function withHeadingIds(html: string, prefix = ''): { html: string; toc: TocEntry[] } {
  const toc: TocEntry[] = [];
  const used = new Map<string, number>();
  const out = html.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (_, level: string, inner: string) => {
    const text = inner
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();
    const base =
      text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '') || 'section';
    const n = used.get(base) ?? 0;
    used.set(base, n + 1);
    const id = `readme-${prefix}${n ? `${base}-${n}` : base}`;
    if (text) toc.push({ id, text, level: Number(level) as 2 | 3 });
    return `<h${level} id="${id}">${inner}</h${level}>`;
  });
  return { html: out, toc };
}

export interface FaqEntry {
  question: string;
  /** Markdown; render with `renderReadme`. */
  answer: string;
}

const FAQ_HEADING =
  /\b(faq|f\.a\.q|frequently asked|troubleshoot(?:ing)?|common (?:issues|problems|questions|errors)|known (?:issues|limitations)|q\s*&\s*a)\b|常见问题|常見問題|疑难解答|故障排[除查]|问题排查|已知问题|よくある質問|トラブルシューティング|자주 묻는 질문|문제 해결/i;

/** Strips markdown emphasis/links/code from a heading or summary. */
function plain(s: string): string {
  return s
    .replace(/<[^>]+>/g, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`~]/g, '')
    .replace(/^#+\s*/, '')
    .trim();
}

/**
 * The README's FAQ / troubleshooting section as question–answer pairs, for
 * the detail page's community card. Questions come from sub-headings, then
 * `<details><summary>` blocks, then bold-only lines; failing all three the
 * whole section is one entry. Fenced code is skipped when looking for
 * headings, since `# comment` lines in shell snippets look like them.
 */
export function extractFaq(markdown: string, max = 8): FaqEntry[] {
  const lines = markdown.split('\n');
  const headings: { i: number; level: number; text: string }[] = [];
  let fenced = false;
  lines.forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) fenced = !fenced;
    const m = !fenced && line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
    if (m) headings.push({ i, level: m[1].length, text: plain(m[2]) });
  });

  const start = headings.findIndex((h) => FAQ_HEADING.test(h.text));
  if (start < 0) return [];
  const head = headings[start];
  const end = headings.slice(start + 1).find((h) => h.level <= head.level);
  const sectionEnd = end ? end.i : lines.length;
  const body = lines.slice(head.i + 1, sectionEnd).join('\n');

  const entries: FaqEntry[] = [];
  const subs = headings.filter((h) => h.i > head.i && h.i < sectionEnd && h.level > head.level);
  if (subs.length) {
    const level = Math.min(...subs.map((h) => h.level));
    const qs = subs.filter((h) => h.level === level);
    qs.forEach((h, n) => {
      const stop = n + 1 < qs.length ? qs[n + 1].i : sectionEnd;
      entries.push({ question: h.text, answer: lines.slice(h.i + 1, stop).join('\n').trim() });
    });
  } else if (/<details[\s>]/i.test(body)) {
    for (const m of body.matchAll(/<details[^>]*>\s*<summary[^>]*>([\s\S]*?)<\/summary>([\s\S]*?)<\/details>/gi)) {
      entries.push({ question: plain(m[1]), answer: m[2].trim() });
    }
  } else {
    // **Why does X happen?** on a line of its own, answer below it.
    const bold = [...body.matchAll(/^\s*(?:[-*]\s+)?(?:\*\*|__)(.+?)(?:\*\*|__)\s*:?\s*$/gm)];
    bold.forEach((m, n) => {
      const from = m.index! + m[0].length;
      const to = n + 1 < bold.length ? bold[n + 1].index! : body.length;
      entries.push({ question: plain(m[1]), answer: body.slice(from, to).trim() });
    });
  }
  if (!entries.length && body.trim()) entries.push({ question: head.text, answer: body.trim() });

  return entries
    .map((e) => ({ ...e, question: e.question.replace(/^(?:Q\s*\d*|问)\s*[:：.、]\s*/i, '') }))
    .filter((e) => e.question && e.answer)
    .slice(0, max);
}
