export const PRODUCT_DESCRIPTION_MAX_LENGTH = 4000;

const BLOCK_TAGS = [
  'address',
  'article',
  'aside',
  'blockquote',
  'dd',
  'div',
  'dl',
  'dt',
  'figcaption',
  'figure',
  'footer',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'li',
  'main',
  'nav',
  'ol',
  'p',
  'pre',
  'section',
  'table',
  'tbody',
  'td',
  'tfoot',
  'th',
  'thead',
  'tr',
  'ul'
].join('|');

const BLOCK_TAG_PATTERN = new RegExp(`<\\/?(?:${BLOCK_TAGS})\\b[^>]*>`, 'gi');
const BULLET_SEPARATOR_PATTERN = /[ \t]*[,;]?[ \t]*[\u00b7\u2022\u2023\u2043\u2219\u25aa\u25ab\u25cf\u25cb\u25e6][ \t]*/g;

/**
 * Turns imported HTML and compact bullet-separated copy into readable plain text.
 * It deliberately keeps ordinary newlines so seller-written formatting is not lost.
 */
export function normalizeProductDescription(value: unknown): string {
  const normalized = String(value || '')
    .replace(/\r\n?/g, '\n')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/&(?:bull|bullet);/gi, '\u2022')
    .replace(/&middot;/gi, '\u00b7')
    .replace(/<br\b[^>]*>/gi, '\n')
    .replace(/<li\b[^>]*>/gi, '\n\u2022 ')
    .replace(BLOCK_TAG_PATTERN, '\n')
    .replace(/<\/?[a-z][^>]*>/gi, ' ')
    .replace(/&newline;/gi, '\n')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&(?:bull|bullet);/gi, '\u2022')
    .replace(/&middot;/gi, '\u00b7')
    .replace(/&quot;/gi, '"')
    .replace(/&(?:apos|#39);/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x([0-9a-f]+);/gi, (match, code: string) => decodeNumericEntity(match, code, 16))
    .replace(/&#([0-9]+);/g, (match, code: string) => decodeNumericEntity(match, code, 10))
    // Common UTF-8 bullet and middle-dot mojibake from scraped product pages.
    .replace(/\u00e2(?:\u20ac|\u0080)[\u00a2\u02d8]/g, '\u2022')
    .replace(/\u00c2\u00b7/g, '\u00b7')
    .replace(BULLET_SEPARATOR_PATTERN, '\n\u2022 ')
    .replace(/[^\S\n]+/g, ' ')
    .replace(/[ \t]*\n[ \t]*/g, '\n')
    .replace(/\n{2,}(?=\u2022 )/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map(normalizeDescriptionLine)
    .join('\n')
    .trim();

  if (normalized.length <= PRODUCT_DESCRIPTION_MAX_LENGTH) return normalized;
  return normalized.slice(0, PRODUCT_DESCRIPTION_MAX_LENGTH).trimEnd();
}

function normalizeDescriptionLine(value: string) {
  const line = value.trim();
  if (!line.startsWith('\u2022')) return line;

  return line
    .replace(/^\u2022\s*/, '\u2022 ')
    .replace(/^\u2022 ([^:\n]{1,80}):[ \t]*/, (_, label: string) => `\u2022 ${label.trim()}: `)
    .trimEnd();
}

function decodeNumericEntity(match: string, code: string, radix: number) {
  const codePoint = Number.parseInt(code, radix);
  if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > 0x10ffff) return match;

  try {
    return String.fromCodePoint(codePoint);
  } catch {
    return match;
  }
}
