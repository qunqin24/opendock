import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';

/** "50", "50px" or "40%" → a CSS length, or null. */
function length(v: string | undefined): string | null {
  const m = v?.trim().match(/^(\d+(?:\.\d+)?)(px|%)?$/);
  return m ? `${m[1]}${m[2] ?? 'px'}` : null;
}

/**
 * README authors size images with width/height attributes (logo rows,
 * badges). The base stylesheet sets `height: auto` on every image, which
 * beats those attributes, so carry the size over as an inline style. With a
 * width the height follows it, so images shrunk by max-width keep their shape.
 */
function sizeStyle(attribs: Record<string, string>): string {
  const w = length(attribs.width);
  const h = length(attribs.height);
  if (w) return `width:${w}`;
  if (h) return `height:${h};width:auto`;
  return '';
}

const absolute = (url: string) => /^(?:[a-z][a-z0-9+.-]*:|#|\/\/)/i.test(url);

/** README Markdown → safe HTML, with repo-relative links resolved on GitHub. */
export function renderReadme(markdown: string, repoSlug: string | null): string {
  const html = marked.parse(markdown, { async: false, gfm: true });
  const raw = repoSlug ? `https://raw.githubusercontent.com/${repoSlug}/HEAD/` : null;
  const blob = repoSlug ? `https://github.com/${repoSlug}/blob/HEAD/` : null;
  const resolve = (url: string | undefined, base: string | null) =>
    !url || absolute(url) || !base ? url : base + url.replace(/^\.?\//, '');

  return sanitizeHtml(html, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img', 'h1', 'h2', 'details', 'summary', 'picture', 'source']),
    allowedAttributes: {
      a: ['href', 'title'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading', 'style'],
      source: ['srcset', 'media'],
      code: ['class'],
      th: ['align'],
      td: ['align'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    // Only the sizes set by sizeStyle survive; any other inline style is dropped.
    allowedStyles: { img: { width: [/^\d+(\.\d+)?(px|%)$/], height: [/^\d+(\.\d+)?px$/] } },
    transformTags: {
      a: (tag, attribs) => ({
        tagName: tag,
        attribs: { ...attribs, href: resolve(attribs.href, blob) ?? '', rel: 'nofollow noopener' },
      }),
      img: (tag, attribs) => ({
        tagName: tag,
        attribs: { ...attribs, src: resolve(attribs.src, raw) ?? '', loading: 'lazy', style: sizeStyle(attribs) },
      }),
    },
  });
}
