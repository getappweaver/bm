// ---------------------------------------------------------------------------
// plugins/bm/format/favicon.ts — client-side favicon URLs (DuckDuckGo)
// ---------------------------------------------------------------------------

import type { WebNode } from '@src/web/ui-schema';

const DUCKDUCKGO_FAVICON_BASE = 'https://icons.duckduckgo.com/ip3';

/**
 * Resolve a bookmark URL to a DuckDuckGo favicon URL the browser loads
 * directly. Returns null for empty, unparseable, or non-http(s) URLs so
 * renderers can skip the icon entirely. No image bytes are stored server-side;
 * the browser fetches the icon from DuckDuckGo at render time.
 */
export function bookmarkFaviconUrl(
  url: string | null | undefined,
): string | null {
  if (url === null || url === undefined || url.length === 0) {
    return null;
  }

  let host: string;

  try {
    const parsed = new URL(url);

    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return null;
    }

    host = parsed.hostname.replace(/^www\./, '');
  } catch {
    return null;
  }

  if (host.length === 0) {
    return null;
  }

  return `${DUCKDUCKGO_FAVICON_BASE}/${host}.ico`;
}

/**
 * WebNode `<image>` for a bookmark's favicon, or null when the URL does not
 * support one. Decorative (`alt: ''`) because the adjacent title link already
 * carries the label; broken/missing icons degrade to nothing visible.
 */
export function bookmarkFaviconNode(
  url: string | null | undefined,
): WebNode | null {
  const src = bookmarkFaviconUrl(url);

  if (src === null) {
    return null;
  }

  return {
    type: 'element',
    tag: 'image',
    props: {
      src,
      alt: '',
      className: 'bm-favicon',
    },
    children: [],
  };
}
