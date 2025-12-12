import { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { TextStyle } from '@tiptap/extension-text-style';
import { Color } from '@tiptap/extension-color';
import { Highlight } from '@tiptap/extension-highlight';
import { Link } from '@tiptap/extension-link';
import { Settings, Link2, Send } from 'lucide-react';
import { LinkModal } from '../../features/services/components/LinkModal';
import { FontSize } from '../../features/services/components/FontSizeExtension';
import { SmartListInputRules } from '../../features/services/components/SmartListInputRules';
import { useTheme } from './ThemeProvider';

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  label?: string;
  error?: string;
  disabled?: boolean;
  maxHeight?: string;
  minHeight?: string;
  className?: string;
  autoFocus?: boolean;
  compactMode?: boolean;
  onToolbarToggle?: (expanded: boolean) => void;
  showToolbar?: boolean;
  showSendButton?: boolean;
  onSend?: () => void;
  sendButtonDisabled?: boolean;
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
  minHeight,
  className = '',
  autoFocus = false,
  compactMode = false,
  onToolbarToggle,
  showToolbar = true,
  showSendButton = false,
  onSend,
  sendButtonDisabled = false,
}: RichTextEditorProps) {
  const { isDark } = useTheme();
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [currentFontSize, setCurrentFontSize] = useState<string>('10');
  const [isToolbarExpanded, setIsToolbarExpanded] = useState(false);
  const colorInputRef = useRef<HTMLInputElement>(null);

  const handleToolbarToggle = (expanded: boolean) => {
    setIsToolbarExpanded(expanded);
    onToolbarToggle?.(expanded);
  };

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
        class: `prose prose-sm dark:prose-invert max-w-none focus:outline-none px-4 py-2 text-sm text-gray-900 dark:text-white`,
        style: `white-space: pre-wrap; overflow-y: auto; overflow-x: hidden; width: 100%; max-width: 100%; word-wrap: break-word; word-break: break-word; box-sizing: border-box; ${minHeight ? `min-height: ${minHeight};` : compactMode ? 'min-height: 40px;' : 'min-height: 200px;'} height: auto; ${showSendButton ? 'padding-right: 2.25rem; padding-bottom: 2.25rem;' : ''}`,
      },
      handleKeyDown: (view, event) => {
        // Handle Enter key (without Shift) - trigger form submission
        if (event.key === 'Enter' && !event.shiftKey) {
          const editorElement = view.dom.closest('form');
          if (editorElement) {
            event.preventDefault();
            // Find the submit button in the form
            const submitButton = editorElement.querySelector('button[type="submit"]') as HTMLButtonElement;
            if (submitButton && !submitButton.disabled) {
              submitButton.click();
            } else {
              // If no submit button found, try to submit the form directly
              const form = editorElement as HTMLFormElement;
              if (form.requestSubmit) {
                form.requestSubmit();
              } else {
                form.submit();
              }
            }
            return true;
          }
        }
        // Handle Shift+Enter - insert new line
        if (event.key === 'Enter' && event.shiftKey) {
          event.preventDefault();
          // Use view dispatch to insert a hard break
          const { state, dispatch } = view;
          const { schema } = state;
          const hardBreak = schema.nodes.hardBreak;
          if (hardBreak) {
            const tr = state.tr.replaceSelectionWith(hardBreak.create());
            dispatch(tr);
          } else {
            // Fallback: insert newline character
            const tr = state.tr.insertText('\n');
            dispatch(tr);
          }
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
      // Update current font size state
      const fontSize = editor.getAttributes('textStyle').fontSize;
      setCurrentFontSize(fontSize || '10');
    },
    onSelectionUpdate: ({ editor }) => {
      // Update current font size when selection changes
      const fontSize = editor.getAttributes('textStyle').fontSize;
      setCurrentFontSize(fontSize || '10');
    },
    editable: !disabled,
  });

  // Update editor content when value prop changes
  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '');
    }
  }, [value, editor]);

  // Auto-focus the editor when autoFocus prop is true
  useEffect(() => {
    if (editor && autoFocus) {
      // Small delay to ensure the editor is fully rendered
      const timer = setTimeout(() => {
        // If there's content, move cursor to the end
        const hasContent = editor.state.doc.textContent.length > 0;
        if (hasContent) {
          // Set cursor to the end of the document
          // TipTap: doc.content.size gives us the position after all content
          const endPos = editor.state.doc.content.size;
          editor.commands.setTextSelection(endPos);
        }
        editor.commands.focus();
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [editor, autoFocus]);

  // Auto-resize editor based on content
  useEffect(() => {
    if (!editor) return;

    const updateHeight = () => {
      const editorElement = editor.view.dom as HTMLElement;
      if (editorElement) {
        // Reset height to auto to get the correct scrollHeight
        editorElement.style.height = 'auto';
        const scrollHeight = editorElement.scrollHeight;
        const minHeightValue = minHeight ? parseInt(minHeight) : (compactMode ? 40 : 200);
        const maxHeightValue = maxHeight && maxHeight !== '100%' && maxHeight !== 'auto' ? parseInt(maxHeight) : null;
        
        // Set height based on content, respecting min and max
        let newHeight = Math.max(scrollHeight, minHeightValue);
        if (maxHeightValue) {
          newHeight = Math.min(newHeight, maxHeightValue);
        }
        editorElement.style.height = `${newHeight}px`;
      }
    };

    // Update height on content changes
    const handleUpdate = () => {
      updateHeight();
    };

    editor.on('update', handleUpdate);
    editor.on('selectionUpdate', handleUpdate);

    // Initial height update
    updateHeight();

    return () => {
      editor.off('update', handleUpdate);
      editor.off('selectionUpdate', handleUpdate);
    };
  }, [editor, minHeight, maxHeight, compactMode]);

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
        className={`bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg overflow-hidden flex flex-col w-full`}
        style={{
          width: '100%',
          height: 'auto',
          minHeight: minHeight || (compactMode ? '40px' : '200px'),
          maxHeight: maxHeight && maxHeight !== '100%' && maxHeight !== 'auto' ? maxHeight : undefined,
        }}
      >
        {/* Toolbar */}
        {showToolbar && (
        <div className="border-b border-gray-200 dark:border-gray-700/50 p-2 flex flex-wrap gap-1 flex-shrink-0">
          {/* Collapse/Expand CTA Button - Three Dot Menu */}
          <button
            type="button"
            onClick={() => handleToolbarToggle(!isToolbarExpanded)}
            disabled={disabled}
            className={`px-2 py-1 text-xs rounded border bg-white dark:bg-[#1C252E] border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors ${
              isToolbarExpanded ? 'bg-primary text-white border-primary' : ''
            }`}
            title={isToolbarExpanded ? 'Hide formatting options' : 'Show formatting options'}
          >
            <Settings 
              className={`w-4 h-4 ${
                isToolbarExpanded 
                  ? 'text-white' 
                  : 'text-gray-600 dark:text-gray-400'
              }`} 
            />
          </button>
          
          {/* Expanded Toolbar Options */}
          {isToolbarExpanded && (
            <>
              <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleBold().run()}
                disabled={!editor.can().chain().focus().toggleBold().run() || disabled}
                className={`px-2 py-1 text-xs rounded border flex items-center justify-center ${
                  editor.isActive('bold')
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white dark:bg-[#1C252E] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title="Bold"
              >
                <span className="font-bold">B</span>
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                disabled={!editor.can().chain().focus().toggleItalic().run() || disabled}
                className={`px-2 py-1 text-xs rounded border flex items-center justify-center ${
                  editor.isActive('italic')
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white dark:bg-[#1C252E] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title="Italic"
              >
                <span className="italic">I</span>
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                disabled={!editor.can().chain().focus().toggleUnderline().run() || disabled}
                className={`px-2 py-1 text-xs rounded border flex items-center justify-center ${
                  editor.isActive('underline')
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white dark:bg-[#1C252E] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title="Underline"
              >
                <span className="underline">U</span>
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().toggleStrike().run()}
                disabled={!editor.can().chain().focus().toggleStrike().run() || disabled}
                className={`px-2 py-1 text-xs rounded border flex items-center justify-center ${
                  editor.isActive('strike')
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white dark:bg-[#1C252E] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title="Strikethrough"
              >
                <span className="line-through">S</span>
              </button>
              <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />
              {/* Font Size Dropdown */}
              <div className="relative">
                <select
                  onChange={(e) => {
                    const size = e.target.value;
                    setCurrentFontSize(size);
                    editor.chain().focus().setFontSize(size).run();
                  }}
                  value={currentFontSize}
                  disabled={disabled}
                  className="px-1 py-1 text-xs rounded border bg-gray-300 dark:bg-gray-600 border-gray-400 dark:border-gray-500 hover:bg-gray-400 dark:hover:bg-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50 appearance-none cursor-pointer pr-3 pl-1 w-auto disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ 
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'8\' height=\'8\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23666\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")', 
                    backgroundRepeat: 'no-repeat', 
                    backgroundPosition: 'right 0.2rem center',
                    color: 'transparent',
                    width: 'fit-content',
                    minWidth: 'auto'
                  }}
                  title="Font Size"
                >
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
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center px-1">
                  <div className="bg-white dark:bg-gray-800 rounded px-1.5 py-0.5 flex items-center justify-center">
                    <span className="text-xs text-gray-900 dark:text-gray-100 font-medium whitespace-nowrap">
                      {currentFontSize}px
                    </span>
                  </div>
                </div>
              </div>
              <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />
              {/* Font Color Picker */}
              <div className="relative group">
                <input
                  ref={colorInputRef}
                  type="color"
                  value={(() => {
                    const color = editor.getAttributes('textStyle').color;
                    if (!color) {
                      // Use theme-appropriate default color
                      // In light mode: black, in dark mode: white
                      return isDark ? '#ffffff' : '#000000';
                    }
                    // Convert RGB to hex if needed
                    return rgbToHex(color);
                  })()}
                  onChange={(e) => {
                    const color = e.target.value;
                    // Get theme default colors
                    const defaultColor = isDark ? '#ffffff' : '#000000';
                    
                    if (color === defaultColor || !color) {
                      editor.chain().focus().unsetColor().run();
                    } else {
                      editor.chain().focus().setColor(color).run();
                    }
                  }}
                  disabled={disabled}
                  className="absolute opacity-0 w-0 h-0 pointer-events-none"
                  title="Font Color"
                />
                <button
                  type="button"
                  onClick={() => {
                    colorInputRef.current?.click();
                  }}
                  disabled={disabled}
                  className={`px-2 py-1 text-xs rounded border flex items-center justify-center ${
                    editor.isActive('textStyle') && editor.getAttributes('textStyle').color
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white dark:bg-[#1C252E] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  title="Font Color"
                >
                  <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                    <text x="4" y="12" fontSize="10" fontFamily="system-ui, sans-serif" fontWeight="600" fill="currentColor">A</text>
                    <line x1="2" y1="13" x2="14" y2="13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  editor.chain().focus().toggleBulletList().run();
                }}
                disabled={!editor.can().chain().focus().toggleBulletList().run() || disabled}
                className={`px-2 py-1 text-xs rounded border flex items-center justify-center ${
                  editor.isActive('bulletList')
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white dark:bg-[#1C252E] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title="Bullet List"
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="2.5" cy="4" r="1" fill="currentColor"/>
                  <line x1="5.5" y1="4" x2="13" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="2.5" cy="8" r="1" fill="currentColor"/>
                  <line x1="5.5" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <circle cx="2.5" cy="12" r="1" fill="currentColor"/>
                  <line x1="5.5" y1="12" x2="13" y2="12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  editor.chain().focus().toggleOrderedList().run();
                }}
                disabled={!editor.can().chain().focus().toggleOrderedList().run() || disabled}
                className={`px-2 py-1 text-xs rounded border flex items-center justify-center ${
                  editor.isActive('orderedList')
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white dark:bg-[#1C252E] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title="Numbered List"
              >
                <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none">
                  <text x="1" y="5.5" fontSize="7" fill="currentColor" fontFamily="system-ui, sans-serif" fontWeight="500">1.</text>
                  <line x1="5.5" y1="5.5" x2="13" y2="5.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <text x="1" y="9.5" fontSize="7" fill="currentColor" fontFamily="system-ui, sans-serif" fontWeight="500">2.</text>
                  <line x1="5.5" y1="9.5" x2="13" y2="9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  <text x="1" y="13.5" fontSize="7" fill="currentColor" fontFamily="system-ui, sans-serif" fontWeight="500">3.</text>
                  <line x1="5.5" y1="13.5" x2="13" y2="13.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </button>
              <div className="w-px bg-gray-300 dark:bg-gray-600 mx-1" />
              <button
                type="button"
                onClick={() => {
                  setLinkModalOpen(true);
                }}
                disabled={disabled}
                className={`px-2 py-1 text-xs rounded border flex items-center justify-center ${
                  editor.isActive('link')
                    ? 'bg-primary text-white border-primary'
                    : 'bg-white dark:bg-[#1C252E] text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
                title="Link"
              >
                <Link2 className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
        )}
        {/* Editor Content */}
        <div 
          className="flex-1 min-h-0 w-full relative"
          style={{
            width: '100%',
            overflow: 'hidden',
          }}
        >
          <EditorContent 
            editor={editor} 
            style={{
              width: '100%',
            }}
          />
          {showSendButton && (
            <button
              type="button"
              onClick={onSend}
              disabled={sendButtonDisabled || disabled}
              className="absolute bottom-2 right-2 w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center flex-shrink-0 z-10"
              title="Post"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
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

