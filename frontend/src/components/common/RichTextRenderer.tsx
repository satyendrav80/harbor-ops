import { useMemo } from 'react';
import { sanitizeRichTextHtml, stripCommentQuotePrefix, isEmptyHtml } from '../../utils/richText';

type RichTextRendererProps = {
  /**
   * HTML content to render (from TipTap editor)
   */
  html?: string | null;
  /**
   * Additional CSS classes to apply to the wrapper
   */
  className?: string;
  /**
   * Visual variant for different contexts
   * - default: Standard rich text display
   * - compact: Smaller text, tighter spacing (for cards/previews)
   * - muted: Muted colors (for secondary content)
   */
  variant?: 'default' | 'compact' | 'muted';
  /**
   * Whether to strip comment quote prefix ([[quote:123]])
   * Set to true when rendering comment content
   */
  stripQuotePrefix?: boolean;
};

/**
 * Shared component for rendering rich text content from TipTap editor.
 * 
 * Features:
 * - Sanitizes HTML to prevent XSS attacks
 * - Applies consistent formatting (lists, links, spacing)
 * - Supports dark mode
 * - Handles comment quote prefix removal
 * 
 * This component should be used everywhere rich text is displayed
 * to ensure consistent rendering across the application.
 */
export function RichTextRenderer({
  html,
  className = '',
  variant = 'default',
  stripQuotePrefix = false,
}: RichTextRendererProps) {
  const sanitizedHtml = useMemo(() => {
    if (!html) {
      return '';
    }

    let content = html;

    // Strip quote prefix if requested (for comments)
    if (stripQuotePrefix) {
      content = stripCommentQuotePrefix(content);
    }

    // Check if content is empty BEFORE sanitization (handles DB edge cases)
    // This catches empty paragraphs that might already be in the database
    if (isEmptyHtml(content)) {
      return '';
    }

    // Sanitize HTML
    const sanitized = sanitizeRichTextHtml(content);

    // Check if the sanitized HTML is effectively empty (e.g., <p></p> or <p><br></p>)
    // This is a second check in case sanitization changes the structure
    if (isEmptyHtml(sanitized)) {
      return '';
    }

    return sanitized;
  }, [html, stripQuotePrefix]);

  // Don't render anything if no content
  if (!sanitizedHtml) {
    return null;
  }

  // Base classes for consistent formatting
  const baseClasses = [
    'prose',
    'prose-sm',
    'dark:prose-invert',
    'max-w-none',
    'break-words',
    'whitespace-pre-wrap',
    // Lists - ensure bullets/numbers always show
    '[&_ul]:list-disc',
    '[&_ol]:list-decimal',
    '[&_ul]:ml-5',
    '[&_ol]:ml-5',
    '[&_li]:my-1',
    // Links
    '[&_a]:text-primary',
    '[&_a]:hover:underline',
    // Headings sizing
    '[&_h1]:text-base',
    '[&_h2]:text-sm',
    '[&_h3]:text-xs',
  ];

  // Variant-specific classes
  const variantClasses = {
    default: 'text-gray-700 dark:text-gray-300',
    compact: 'text-xs text-gray-600 dark:text-gray-400',
    muted: 'text-sm text-gray-600 dark:text-gray-400',
  };

  const finalClassName = [
    ...baseClasses,
    variantClasses[variant],
    className,
  ].filter(Boolean).join(' ');

  return (
    <div
      className={finalClassName}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
}

