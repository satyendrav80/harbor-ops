import { useEffect, useRef, useState } from 'react';
import { Link } from 'lucide-react';
import { useOverlayStack } from '../../../components/common/overlay/OverlayStackProvider';

type LinkModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onApply: (text: string, url: string) => void;
  initialText?: string;
  initialUrl?: string;
};

export function LinkModal({ isOpen, onClose, onApply, initialText = '', initialUrl = '' }: LinkModalProps) {
  const [text, setText] = useState(initialText);
  const [url, setUrl] = useState(initialUrl);
  const { register } = useOverlayStack();
  const unregisterRef = useRef<(() => void) | null>(null);
  const [zBackdrop, setZBackdrop] = useState<number | null>(null);
  const [zContent, setZContent] = useState<number | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      setText(initialText);
      setUrl(initialUrl);
    }
  }, [isOpen, initialText, initialUrl]);

  // Register with overlay stack so Escape closes ONLY this modal (top-most overlay).
  useEffect(() => {
    if (!isOpen) {
      unregisterRef.current?.();
      unregisterRef.current = null;
      setZBackdrop(null);
      setZContent(null);
      return;
    }

    const reg = register('overlay', {
      closeOnEscape: true,
      onClose: () => onCloseRef.current(),
    });

    unregisterRef.current = reg.unregister;
    setZBackdrop(reg.zIndexBackdrop ?? null);
    setZContent(reg.zIndexContent);

    return () => {
      reg.unregister();
      unregisterRef.current = null;
      setZBackdrop(null);
      setZContent(null);
    };
  }, [isOpen, register]);

  if (!isOpen) return null;

  const handleApply = () => {
    if (url.trim()) {
      onApply(text.trim() || url.trim(), url.trim());
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleApply();
    }
  };

  return (
    <div
      className="fixed inset-0 flex items-center justify-center bg-black/50"
      style={{ zIndex: zBackdrop ?? 60 }}
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1C252E] rounded-lg border border-gray-200 dark:border-gray-700/50 p-4 min-w-[320px] shadow-lg"
        style={{ zIndex: zContent ?? 61 }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="space-y-3">
          <div>
            <input
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Text"
              className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
              autoFocus
            />
          </div>
          <div className="relative">
            <Link className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-gray-500 pointer-events-none" />
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type or paste a link"
              className="w-full pl-10 pr-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={handleApply}
              disabled={!url.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

