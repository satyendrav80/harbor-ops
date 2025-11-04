import { useState, useEffect } from 'react';
import { Link } from 'lucide-react';

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

  useEffect(() => {
    if (isOpen) {
      setText(initialText);
      setUrl(initialUrl);
    }
  }, [isOpen, initialText, initialUrl]);

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#1C252E] rounded-lg border border-gray-200 dark:border-gray-700/50 p-4 min-w-[320px] shadow-lg"
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

