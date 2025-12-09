import { useState, ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

type ExpandableContentProps = {
  /**
   * Label text to display (e.g., "Content", "Documentation & Rules")
   */
  label: string;
  
  /**
   * The content to display when expanded
   */
  children: ReactNode;
  
  /**
   * Placeholder text to show when collapsed
   * @default 'Click "Expand" to view full content'
   */
  placeholder?: string;
  
  /**
   * Whether the content is initially expanded (uncontrolled)
   * @default false
   */
  defaultExpanded?: boolean;
  
  /**
   * Controlled expanded state. If provided, component is controlled.
   */
  isExpanded?: boolean;
  
  /**
   * HTML element type for the label
   * @default 'p'
   */
  labelAs?: 'p' | 'h4' | 'h3' | 'h2' | 'h1' | 'span';
  
  /**
   * Additional CSS classes for the label
   */
  labelClassName?: string;
  
  /**
   * Additional CSS classes for the container
   */
  className?: string;
  
  /**
   * Callback when expand state changes
   */
  onToggle?: (isExpanded: boolean) => void;
};

/**
 * Reusable component for expandable/collapsible content sections.
 * The expand button is positioned next to the label for better UX.
 */
export function ExpandableContent({
  label,
  children,
  placeholder = 'Click "Expand" to view full content',
  defaultExpanded = false,
  isExpanded: controlledIsExpanded,
  labelAs = 'p',
  labelClassName = 'text-xs text-gray-500 dark:text-gray-400',
  className = '',
  onToggle,
}: ExpandableContentProps) {
  const [internalIsExpanded, setInternalIsExpanded] = useState(defaultExpanded);
  
  // Use controlled state if provided, otherwise use internal state
  const isExpanded = controlledIsExpanded !== undefined ? controlledIsExpanded : internalIsExpanded;

  const handleToggle = () => {
    const newExpanded = !isExpanded;
    if (controlledIsExpanded === undefined) {
      setInternalIsExpanded(newExpanded);
    }
    onToggle?.(newExpanded);
  };

  const LabelComponent = labelAs;

  return (
    <div className={className}>
      <div className="flex items-center gap-2 mb-2">
        <LabelComponent className={labelClassName}>{label}</LabelComponent>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
          className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          aria-label={isExpanded ? 'Collapse content' : 'Expand content'}
        >
          {isExpanded ? (
            <>
              <ChevronUp className="w-4 h-4" />
              Collapse
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              Expand
            </>
          )}
        </button>
      </div>
      {isExpanded ? (
        <div>{children}</div>
      ) : (
        <div className="text-sm text-gray-500 dark:text-gray-400 italic">
          {placeholder}
        </div>
      )}
    </div>
  );
}

