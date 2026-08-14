import { Marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

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
  opts: { repoSlug?: string | null; branch?: string } = {},
): Promise<string> {
  const { repoSlug, branch = 'HEAD' } = opts;

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
      a: ['href', 'title'],
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
      // Every README link leaves the site, so harden the target.
      a: (tagName, attribs) => ({
        tagName,
        attribs: {
          ...attribs,
          href: absolutize(attribs.href, repoSlug, branch, 'blob'),
          target: '_blank',
          rel: 'noopener noreferrer nofollow ugc',
        },
      }),
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
            src: absolutize(attribs.src, repoSlug, branch, 'raw'),
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
): string {
  if (!url) return '';
  if (/^(https?:|mailto:|#)/i.test(url)) return url;
  if (!repoSlug) return '';

  const clean = url.replace(/^\.?\//, '');
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
