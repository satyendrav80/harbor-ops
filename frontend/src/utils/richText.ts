import DOMPurify from 'dompurify';

/**
 * Sanitizes HTML content from TipTap editor to prevent XSS attacks.
 * Allows only safe tags and attributes that TipTap uses.
 * 
 * @param html - Raw HTML string from TipTap editor
 * @returns Sanitized HTML string safe for rendering
 */
export function sanitizeRichTextHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  // First sanitize with DOMPurify
  let sanitized = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      // Text formatting
      'p', 'br', 'strong', 'em', 'u', 's', 'span',
      // Lists
      'ul', 'ol', 'li',
      // Links
      'a',
      // Code
      'code', 'pre',
      // Headings
      'h1', 'h2', 'h3',
      // Blockquote
      'blockquote',
      // Highlight
      'mark',
    ],
    ALLOWED_ATTR: [
      'href', 'target', 'rel', 'class', 'style',
    ],
    ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto):|[#/])/i,
    SAFE_FOR_TEMPLATES: false,
    RETURN_DOM: false,
    RETURN_DOM_FRAGMENT: false,
    RETURN_TRUSTED_TYPE: false,
  });

  // Post-process to ensure external links have proper rel attributes
  // DOMPurify doesn't automatically add rel="noopener noreferrer" for target="_blank"
  sanitized = sanitized.replace(
    /<a\s+([^>]*\s+)?target=["']_blank["']([^>]*)>/gi,
    (match: string, _before: string, _after: string) => {
      // Check if rel already exists
      if (/rel\s*=/i.test(match)) {
        // Add noopener and noreferrer to existing rel if not present
        return match.replace(
          /rel\s*=\s*["']([^"']*)["']/i,
          (relMatch: string, relValue: string) => {
            const hasNoopener = /noopener/i.test(relValue);
            const hasNoreferrer = /noreferrer/i.test(relValue);
            
            // Build new rel value with only missing attributes
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
      } else {
        // Add rel attribute if it doesn't exist
        return match.replace(/(<a\s+[^>]*)(>)/i, '$1 rel="noopener noreferrer"$2');
      }
    }
  );

  return sanitized;
}

/**
 * Strips the comment quote prefix from content.
 * Removes patterns like "[[quote:123]]\n" from the beginning of content.
 * 
 * @param content - Content string that may contain quote prefix
 * @returns Content with quote prefix removed
 */
export function stripCommentQuotePrefix(content: string): string {
  if (!content || typeof content !== 'string') {
    return '';
  }

  // Remove [[quote:ID]] pattern at the start, optionally followed by whitespace
  return content.replace(/^\[\[quote:\d+\]\]\s*/s, '');
}

/**
 * Checks if HTML content is effectively empty (only whitespace, empty tags, or just <br> tags).
 * TipTap returns <p></p> or <p><br></p> for empty content, which we should not render.
 * 
 * @param html - HTML string to check
 * @returns true if the HTML is effectively empty
 */
export function isEmptyHtml(html: string): boolean {
  if (!html || typeof html !== 'string') {
    return true;
  }

  // Normalize the HTML string (trim whitespace)
  const normalized = html.trim();

  // Check for common empty HTML patterns from TipTap
  const emptyPatterns = [
    /^<p><\/p>$/i,           // <p></p>
    /^<p><br><\/p>$/i,       // <p><br></p>
    /^<p><br\/><\/p>$/i,     // <p><br/></p>
    /^<p>\s*<\/p>$/i,        // <p> </p> (whitespace only)
    /^<p>\s*<br>\s*<\/p>$/i, // <p> <br> </p>
    /^<p>\s*<br\/>\s*<\/p>$/i, // <p> <br/> </p>
  ];

  // Check if it matches any empty pattern
  if (emptyPatterns.some(pattern => pattern.test(normalized))) {
    return true;
  }

  // Remove all HTML tags and check if only whitespace remains
  const textOnly = normalized
    .replace(/<[^>]*>/g, '') // Remove all HTML tags
    .replace(/&nbsp;/g, ' ') // Replace &nbsp; with regular space
    .replace(/&#160;/g, ' ') // Replace &#160; (non-breaking space) with regular space
    .replace(/&#8203;/g, '') // Remove zero-width spaces
    .replace(/&amp;/g, '&')  // Decode &amp; (though this shouldn't be in empty content)
    .trim();

  // If no meaningful text remains, it's empty
  return textOnly.length === 0;
}

