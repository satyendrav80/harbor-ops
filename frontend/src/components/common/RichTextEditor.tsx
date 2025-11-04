import { useState, useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Link } from '@tiptap/extension-link';
import { LinkModal } from '../../features/services/components/LinkModal';
import { FontSize } from '../../features/services/components/FontSizeExtension';
import { SmartListInputRules } from '../../features/services/components/SmartListInputRules';

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  maxHeight?: string;
  className?: string;
};

// Helper function to convert RGB to hex
const rgbToHex = (rgb: string): string => {
  if (rgb.startsWith('#')) {
    return rgb; // Already hex
  }
  
  // Match rgb(r, g, b) or rgba(r, g, b, a)
  const match = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*[\d.]+)?\)$/);
  if (match) {
    const r = parseInt(match[1], 10);
    const g = parseInt(match[2], 10);
    const b = parseInt(match[3], 10);
    return `#${[r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('')}`;
  }
  
  return '#000000'; // Default fallback
};

export function RichTextEditor({
  value,
  onChange,
  placeholder = '',
  label,
  error,
  disabled = false,
  maxHeight = '400px',
  className = '',
}: RichTextEditorProps) {
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [currentFontSize, setCurrentFontSize] = useState<string>('default');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: {
          keepMarks: true,
          keepAttributes: false,
        },
        orderedList: {
          keepMarks: true,
          keepAttributes: false,
        },
        // Disable link in StarterKit since we're using our own configured version
        link: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary hover:underline cursor-pointer',
        },
      }),
      TextStyle,
      FontSize,
      Color,
      Highlight,
      SmartListInputRules,
    ],
    content: value,
    editorProps: {
      attributes: {
        class: 'prose prose-sm dark:prose-invert max-w-none focus:outline-none min-h-[200px] px-4 py-2 text-sm text-gray-900 dark:text-white',
        style: 'white-space: pre-wrap; overflow-y: auto;',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      // Update current font size state
      const fontSize = editor.getAttributes('textStyle').fontSize;
      setCurrentFontSize(fontSize || 'default');
    },
    onSelectionUpdate: ({ editor }) => {
      // Update current font size when selection changes
      const fontSize = editor.getAttributes('textStyle').fontSize;
      setCurrentFontSize(fontSize || 'default');
    },
    editable: !disabled,
  });

  // Update editor content when value prop changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  if (!editor) {
    return null;
  }

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">
          {label}
        </label>
      )}
      <div 
        className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg overflow-hidden flex flex-col"
        style={maxHeight === '100%' ? { height: '100%', minHeight: 0 } : { maxHeight }}
      >
        {/* Toolbar */}
        <div className="border-b border-gray-200 dark:border-gray-700/50 p-2 flex flex-wrap gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            disabled={!editor.can().chain().focus().toggleBold().run() || disabled}
            className={`px-2 py-1 text-xs rounded border ${
              editor.isActive('bold')
                ? 'bg-primary text-white border-primary'
                : 'bg-white dark:bg-[#1C252E] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <strong>B</strong>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            disabled={!editor.can().chain().focus().toggleItalic().run() || disabled}
            className={`px-2 py-1 text-xs rounded border ${
              editor.isActive('italic')
                ? 'bg-primary text-white border-primary'
                : 'bg-white dark:bg-[#1C252E] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <em>I</em>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            disabled={!editor.can().chain().focus().toggleUnderline().run() || disabled}
            className={`px-2 py-1 text-xs rounded border ${
              editor.isActive('underline')
                ? 'bg-primary text-white border-primary'
                : 'bg-white dark:bg-[#1C252E] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <u>U</u>
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleStrike().run()}
            disabled={!editor.can().chain().focus().toggleStrike().run() || disabled}
            className={`px-2 py-1 text-xs rounded border ${
              editor.isActive('strike')
                ? 'bg-primary text-white border-primary'
                : 'bg-white dark:bg-[#1C252E] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <s>S</s>
          </button>
          <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />
          {/* Font Size Dropdown */}
          <div className="relative">
            <select
              onChange={(e) => {
                const size = e.target.value;
                setCurrentFontSize(size);
                if (size === 'default') {
                  editor.chain().focus().unsetFontSize().run();
                } else {
                  editor.chain().focus().setFontSize(size).run();
                }
              }}
              value={currentFontSize}
              disabled={disabled}
              className="px-2 py-1 text-xs rounded border bg-white dark:bg-[#1C252E] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer pr-6 pl-8 min-w-[65px] disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ 
                backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23666\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")', 
                backgroundRepeat: 'no-repeat', 
                backgroundPosition: 'right 0.5rem center',
                color: 'transparent'
              }}
              title="Font Size"
            >
              <option value="default">Default</option>
              <option value="10">10px</option>
              <option value="12">12px</option>
              <option value="14">14px</option>
              <option value="16">16px</option>
              <option value="18">18px</option>
              <option value="20">20px</option>
              <option value="24">24px</option>
              <option value="28">28px</option>
              <option value="32">32px</option>
              <option value="36">36px</option>
            </select>
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-gray-700 dark:text-gray-300 pointer-events-none select-none">
              {currentFontSize === 'default' ? 'A' : `${currentFontSize}px`}
            </span>
          </div>
          <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />
          {/* Font Color Picker */}
          <div className="relative">
            <input
              type="color"
              value={(() => {
                const color = editor.getAttributes('textStyle').color;
                if (!color) return '#000000';
                // Convert RGB to hex if needed
                return rgbToHex(color);
              })()}
              onChange={(e) => {
                const color = e.target.value;
                if (color === '#000000' || !color) {
                  editor.chain().focus().unsetColor().run();
                } else {
                  editor.chain().focus().setColor(color).run();
                }
              }}
              disabled={disabled}
              className="w-8 h-8 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#1C252E] cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Font Color"
            />
          </div>
          <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              editor.chain().focus().toggleBulletList().run();
            }}
            disabled={!editor.can().chain().focus().toggleBulletList().run() || disabled}
            className={`px-2 py-1 text-xs rounded border ${
              editor.isActive('bulletList')
                ? 'bg-primary text-white border-primary'
                : 'bg-white dark:bg-[#1C252E] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Bullet List"
          >
            •
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              editor.chain().focus().toggleOrderedList().run();
            }}
            disabled={!editor.can().chain().focus().toggleOrderedList().run() || disabled}
            className={`px-2 py-1 text-xs rounded border ${
              editor.isActive('orderedList')
                ? 'bg-primary text-white border-primary'
                : 'bg-white dark:bg-[#1C252E] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
            title="Numbered List"
          >
            1.
          </button>
          <div className="w-px bg-gray-300 dark:border-gray-600 mx-1" />
          <button
            type="button"
            onClick={() => {
              setLinkModalOpen(true);
            }}
            disabled={disabled}
            className={`px-2 py-1 text-xs rounded border ${
              editor.isActive('link')
                ? 'bg-primary text-white border-primary'
                : 'bg-white dark:bg-[#1C252E] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Link
          </button>
        </div>
        {/* Editor Content */}
        <div className="flex-1 overflow-y-auto min-h-0">
          <EditorContent editor={editor} className="min-h-[200px]" />
        </div>
      </div>
      {error && (
        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
      {placeholder && !value && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {placeholder}
        </p>
      )}
      <LinkModal
        isOpen={linkModalOpen}
        onClose={() => setLinkModalOpen(false)}
        onApply={(text, url) => {
          const attrs = editor.getAttributes('link');
          if (attrs.href) {
            // Update existing link
            editor.chain().focus().setLink({ href: url }).run();
          } else if (editor.state.selection.empty) {
            // Insert link with text
            editor.chain().focus().insertContent(`<a href="${url}">${text}</a>`).run();
          } else {
            // Wrap selected text in link
            editor.chain().focus().setLink({ href: url }).run();
          }
          setLinkModalOpen(false);
        }}
        initialText={editor.state.selection.empty ? '' : editor.state.doc.textBetween(editor.state.selection.from, editor.state.selection.to)}
        initialUrl={editor.getAttributes('link').href || ''}
      />
    </div>
  );
}

