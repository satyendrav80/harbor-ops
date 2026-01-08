import { JSDOM } from 'jsdom';
import createDOMPurify from 'dompurify';

const { window } = new JSDOM('');
const DOMPurifyInstance = createDOMPurify(window as unknown as any);

const ALLOWED_TAGS = [
  'p',
  'br',
  'strong',
  'em',
  'u',
  's',
  'span',
  'ul',
  'ol',
  'li',
  'a',
  'code',
  'pre',
  'h1',
  'h2',
  'h3',
  'blockquote',
  'mark',
];

const ALLOWED_ATTRIBUTES = ['href', 'target', 'rel', 'class', 'style'];

export function sanitizeRichTextHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  let sanitized = DOMPurifyInstance.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR: ALLOWED_ATTRIBUTES,
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto):|[#/])/i,
  });

  sanitized = (typeof sanitized === 'string' ? sanitized : sanitized.toString()).replace(
    /<a\s+([^>]*\s+)?target=["']_blank["']([^>]*)>/gi,
    (match: string) => {
      if (/rel\s*=/i.test(match)) {
        return match.replace(
          /rel\s*=\s*["']([^"']*)["']/i,
          (_relMatch: string, relValue: string) => {
            const hasNoopener = /noopener/i.test(relValue);
            const hasNoreferrer = /noreferrer/i.test(relValue);

            let newRelValue = relValue.trim();
            if (!hasNoopener) {
              newRelValue = newRelValue ? `${newRelValue} noopener` : 'noopener';
            }
            if (!hasNoreferrer) {
              newRelValue = newRelValue ? `${newRelValue} noreferrer` : 'noreferrer';
            }

            return `rel="${newRelValue}"`;
          }
        );
      }

      return match.replace(/(<a\s+[^>]*)(>)/i, '$1 rel="noopener noreferrer"$2');
    }
  );

  return sanitized;
}

export function htmlToPlainText(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const fragment = JSDOM.fragment(html);
  const textContent = fragment.textContent || '';

  return textContent.replace(/\s+/g, ' ').trim();
}
