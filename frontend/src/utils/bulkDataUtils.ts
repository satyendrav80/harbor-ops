/**
 * Utility functions for bulk import/export of key-value data
 * Supports JSON and Properties file formats
 */

export type BulkDataFormat = 'json' | 'properties';

export interface ParseResult {
  success: boolean;
  data?: Record<string, string>;
  error?: string;
}

/**
 * Parse JSON format to key-value object
 * @param text - JSON string to parse
 * @returns ParseResult with data or error
 */
export function parseJSON(text: string): ParseResult {
  try {
    const trimmed = text.trim();
    if (!trimmed) {
      return { success: false, error: 'Input is empty' };
    }

    const parsed = JSON.parse(trimmed);

    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return { success: false, error: 'JSON must be an object with key-value pairs' };
    }

    // Convert all values to strings
    const data: Record<string, string> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof key !== 'string' || !key.trim()) {
        return { success: false, error: 'All keys must be non-empty strings' };
      }
      data[key] = String(value);
    }

    if (Object.keys(data).length === 0) {
      return { success: false, error: 'JSON object is empty' };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: `Invalid JSON format: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Parse properties format to key-value object
 * Supports formats: key=value, key:value, key value
 * Supports multiline values when enclosed in quotes (single or double)
 * @param text - Properties string to parse
 * @returns ParseResult with data or error
 */
export function parseProperties(text: string): ParseResult {
  try {
    const trimmed = text.trim();
    if (!trimmed) {
      return { success: false, error: 'Input is empty' };
    }

    const data: Record<string, string> = {};
    const lines = trimmed.split('\n');
    let lineNumber = 0;
    let i = 0;

    while (i < lines.length) {
      lineNumber++;
      const line = lines[i];
      const trimmedLine = line.trim();

      // Skip empty lines and comments
      if (!trimmedLine || trimmedLine.startsWith('#') || trimmedLine.startsWith('!')) {
        i++;
        continue;
      }

      // Try to split by = or : or space
      let key: string | undefined;
      let value: string | undefined;
      let separator: string | undefined;

      // First try = separator
      if (trimmedLine.includes('=')) {
        const equalIndex = trimmedLine.indexOf('=');
        key = trimmedLine.substring(0, equalIndex).trim();
        value = trimmedLine.substring(equalIndex + 1).trim();
        separator = '=';
      }
      // Then try : separator
      else if (trimmedLine.includes(':')) {
        const colonIndex = trimmedLine.indexOf(':');
        key = trimmedLine.substring(0, colonIndex).trim();
        value = trimmedLine.substring(colonIndex + 1).trim();
        separator = ':';
      }
      // Finally try space separator
      else {
        const parts = trimmedLine.split(/\s+/);
        if (parts.length >= 2) {
          key = parts[0];
          value = parts.slice(1).join(' ');
          separator = ' ';
        }
      }

      if (!key || key === '') {
        return {
          success: false,
          error: `Line ${lineNumber}: Invalid format. Expected "key=value" or "key:value"`
        };
      }

      // Check if value is quoted (supports multiline)
      if (value && ((value.startsWith('"') && !value.endsWith('"')) ||
        (value.startsWith("'") && !value.endsWith("'")))) {
        // Multiline quoted value
        const quoteChar = value[0];
        let multilineValue = value.substring(1); // Remove opening quote
        i++;

        // Continue reading lines until we find the closing quote
        while (i < lines.length) {
          const nextLine = lines[i];
          multilineValue += '\n' + nextLine;

          if (nextLine.trim().endsWith(quoteChar)) {
            // Found closing quote
            multilineValue = multilineValue.substring(0, multilineValue.length - 1); // Remove closing quote
            break;
          }
          i++;
        }

        // Unescape common escape sequences
        value = multilineValue
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\\\/g, '\\');
      } else if (value && ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'")))) {
        // Single-line quoted value - remove quotes and unescape
        value = value.substring(1, value.length - 1)
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t')
          .replace(/\\\\/g, '\\');
      } else if (value) {
        // Unquoted value - unescape basic sequences
        value = value
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '\r');
      }

      // Value can be empty string
      data[key] = value || '';
      i++;
    }

    if (Object.keys(data).length === 0) {
      return { success: false, error: 'No valid key-value pairs found' };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: `Error parsing properties: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Convert key-value object to JSON string
 * @param data - Key-value object to export
 * @returns Formatted JSON string
 */
export function exportToJSON(data: Record<string, string>): string {
  return JSON.stringify(data, null, 2);
}

/**
 * Convert key-value object to properties string
 * Automatically quotes multiline values
 * @param data - Key-value object to export
 * @returns Formatted properties string
 */
export function exportToProperties(data: Record<string, string>): string {
  const lines: string[] = [];

  for (const [key, value] of Object.entries(data)) {
    // Check if value contains newlines (multiline)
    if (value.includes('\n') || value.includes('\r')) {
      // Quote multiline values and escape special characters
      const escapedValue = value
        .replace(/\\/g, '\\\\')  // Escape backslashes first
        .replace(/"/g, '\\"');   // Escape quotes
      lines.push(`${key}="${escapedValue}"`);
    } else {
      // Single-line value - no quotes needed unless it contains special characters
      if (value.includes('=') || value.includes(':') || value.includes('#') || value.includes('!')) {
        // Quote values with special characters
        const escapedValue = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        lines.push(`${key}="${escapedValue}"`);
      } else {
        // Simple value - no quotes needed
        lines.push(`${key}=${value}`);
      }
    }
  }

  return lines.join('\n');
}

/**
 * Download data as a file
 * @param content - File content
 * @param filename - Name of the file to download
 * @param mimeType - MIME type of the file
 */
export function downloadFile(content: string, filename: string, mimeType: string = 'text/plain'): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Copy text to clipboard
 * @param text - Text to copy
 * @returns Promise that resolves when text is copied
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(text);
  } else {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}
