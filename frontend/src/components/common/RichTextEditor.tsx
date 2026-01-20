import { useState, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu } from '@tiptap/react/menus';
import { getMarkRange, type Editor } from '@tiptap/core';
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
  submitShortcut?: 'mod-enter' | null; // 'mod-enter' enables Cmd/Ctrl+Enter to submit
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

const NonInclusiveLink = Link.extend({
  inclusive: false,
});

const selectionHasAnyLink = (editor: Editor): boolean => {
  const { from, to, empty } = editor.state.selection;

  // Collapsed selection: TipTap can reliably tell us if the cursor is in a link.
  if (empty) {
    return editor.isActive('link');
  }

  // Range selection: show bubble if *any* part of selection contains a link mark.
  let found = false;
  editor.state.doc.nodesBetween(from, to, (node) => {
    if (found) return false;
    if (!node.isText) return;
    if (node.marks.some((mark) => mark.type.name === 'link')) {
      found = true;
      return false;
    }
  });

  return found || editor.isActive('link');
};

type LinkMarkContext = {
  href: string;
  text: string;
  range: { from: number; to: number } | null;
};

const getLinkContextForSelection = (editor: Editor): LinkMarkContext => {
  const { state } = editor;
  const { selection } = state;
  const linkType = state.schema.marks.link;

  // Collapsed selection: try to resolve the full mark range (handles boundary cases).
  if (selection.empty) {
    const range = getMarkRange(selection.$from, linkType);
    if (!range) {
      return { href: '', text: '', range: null };
    }

    let href = '';
    state.doc.nodesBetween(range.from, range.to, (node) => {
      if (href) return false;
      if (!node.isText) return;
      const linkMark = node.marks.find((m) => m.type === linkType);
      if (linkMark?.attrs?.href) {
        href = linkMark.attrs.href as string;
        return false;
      }
    });

    const text = state.doc.textBetween(range.from, range.to);
    return { href, text, range: { from: range.from, to: range.to } };
  }

  // Range selection: find the first link mark within the selection and use its href.
  let href = '';
  let foundRange: { from: number; to: number } | null = null;

  state.doc.nodesBetween(selection.from, selection.to, (node, pos) => {
    if (href) return false;
    if (!node.isText) return;

    const linkMark = node.marks.find((m) => m.type === linkType);
    if (!linkMark?.attrs?.href) return;

    href = linkMark.attrs.href as string;
    const $pos = state.doc.resolve(Math.min(pos + 1, state.doc.content.size));
    const range = getMarkRange($pos, linkType, linkMark.attrs);
    if (range) {
      foundRange = { from: range.from, to: range.to };
    }
    return false;
  });

  const text = selection.empty ? '' : state.doc.textBetween(selection.from, selection.to);
  return { href, text, range: foundRange };
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
  submitShortcut = null,
}: RichTextEditorProps) {
  const { isDark } = useTheme();
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [linkModalInitialText, setLinkModalInitialText] = useState('');
  const [linkModalInitialUrl, setLinkModalInitialUrl] = useState('');
  const [linkModalRange, setLinkModalRange] = useState<{ from: number; to: number } | null>(null);
  const [bubbleHref, setBubbleHref] = useState('');
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
      NonInclusiveLink.configure({
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
        // Don't interfere with IME composition
        if ((event as any).isComposing) {
          return false;
        }

        const isMod = event.metaKey || event.ctrlKey;

        // Handle Cmd/Ctrl+Enter - submit (only when submitShortcut is enabled)
        if (submitShortcut === 'mod-enter' && event.key === 'Enter' && isMod && !event.shiftKey && !event.altKey) {
          event.preventDefault();
          if (onSend && !sendButtonDisabled) {
            onSend();
          }
          return true;
        }

        // Handle Shift+Enter - insert soft line break (multi-line within same bullet item)
        if (event.key === 'Enter' && event.shiftKey) {
          event.preventDefault();
          const { state, dispatch } = view;
          const hardBreak = state.schema.nodes.hardBreak;
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

        // Let normal Enter work as default (creates new paragraph/bullet item)
        // TipTap/ProseMirror will handle it correctly for lists
        return false;
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());

      // Keep link bubble content in sync even when selection changes don’t trigger a render.
      const nextHref = getLinkContextForSelection(editor).href;
      setBubbleHref((prev) => (prev === nextHref ? prev : nextHref));

      // Update current font size state
      const fontSize = editor.getAttributes('textStyle').fontSize;
      setCurrentFontSize(fontSize || '10');
    },
    onSelectionUpdate: ({ editor }) => {
      const nextHref = getLinkContextForSelection(editor).href;
      setBubbleHref((prev) => (prev === nextHref ? prev : nextHref));

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
        const previousScrollTop = editorElement.scrollTop;
        const previousScrollableHeight = editorElement.scrollHeight - editorElement.clientHeight;
        const wasAtBottom = previousScrollableHeight > 0
          ? previousScrollTop >= previousScrollableHeight - 2
          : true;
        
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
        
        const maxScrollTop = Math.max(editorElement.scrollHeight - editorElement.clientHeight, 0);
        editorElement.scrollTop = wasAtBottom
          ? maxScrollTop
          : Math.min(previousScrollTop, maxScrollTop);
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

  const openLinkModal = () => {
    const ctx = getLinkContextForSelection(editor);
    setLinkModalInitialUrl(ctx.href);
    setLinkModalInitialText(ctx.text);
    setLinkModalRange(ctx.range);
    setLinkModalOpen(true);
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium leading-normal pb-2 text-gray-900 dark:text-white">
          {label}
        </label>
      )}
      <div 
        className={`bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg flex flex-col w-full`}
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
                  openLinkModal();
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
            overflowX: 'hidden',
            overflowY: 'auto',
          }}
        >
          <BubbleMenu
            editor={editor}
            shouldShow={({ editor }) => selectionHasAnyLink(editor)}
            options={{
              placement: 'bottom-start',
            }}
          >
            <div className="flex items-center gap-2 px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] shadow-md">
              <span className="max-w-[220px] truncate text-xs text-gray-700 dark:text-gray-300">
                {bubbleHref || 'Link'}
              </span>
              <div className="w-px h-4 bg-gray-200 dark:bg-gray-700/50" />
              <button
                type="button"
                onClick={openLinkModal}
                disabled={disabled}
                className="text-xs font-medium text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => editor.chain().focus().extendMarkRange('link').unsetLink().run()}
                disabled={disabled}
                className="text-xs font-medium text-gray-700 dark:text-gray-300 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Remove
              </button>
            </div>
          </BubbleMenu>
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
        onClose={() => {
          setLinkModalOpen(false);
          setLinkModalRange(null);
        }}
        onApply={(text, url) => {
          const trimmedUrl = url.trim();
          const trimmedText = (text.trim() || trimmedUrl);

          if (linkModalRange) {
            // Edit the link we captured when opening the modal (selection may have moved while modal is open).
            if (trimmedText !== linkModalInitialText) {
              editor
                .chain()
                .focus()
                .setTextSelection(linkModalRange)
                .insertContent([
                  {
                    type: 'text',
                    text: trimmedText,
                    marks: [{ type: 'link', attrs: { href: trimmedUrl } }],
                  },
                ])
                .run();
            } else {
              editor
                .chain()
                .focus()
                .setTextSelection(linkModalRange)
                .setLink({ href: trimmedUrl })
                .run();
            }
          } else if (editor.state.selection.empty) {
            // Insert a new link, then a trailing space so typing continues as plain text.
            editor
              .chain()
              .focus()
              .insertContent([
                {
                  type: 'text',
                  text: trimmedText,
                  marks: [{ type: 'link', attrs: { href: trimmedUrl } }],
                },
                { type: 'text', text: ' ' },
              ])
              .run();
          } else {
            // Wrap selected text in link.
            editor.chain().focus().setLink({ href: trimmedUrl }).run();
          }
          setLinkModalOpen(false);
          setLinkModalRange(null);
        }}
        initialText={linkModalInitialText}
        initialUrl={linkModalInitialUrl}
      />
    </div>
  );
}

