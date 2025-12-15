import { ChevronDown, ChevronUp } from 'lucide-react';

type ExpandCollapseButtonProps = {
  /**
   * Whether the content is currently expanded
   */
  isExpanded: boolean;
  
  /**
   * Click handler for the button
   */
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  
  /**
   * Label text when collapsed (default: "Expand")
   */
  expandLabel?: string;
  
  /**
   * Label text when expanded (default: "Collapse")
   */
  collapseLabel?: string;
  
  /**
   * Additional CSS classes
   */
  className?: string;
  
  /**
   * Whether to stop event propagation (default: true)
   */
  stopPropagation?: boolean;
  
  /**
   * Size variant (default: "sm")
   */
  size?: 'xs' | 'sm';
  
  /**
   * Disabled state
   */
  disabled?: boolean;
  
  /**
   * ARIA label override
   */
  ariaLabel?: string;
};

/**
 * Reusable expand/collapse button component with consistent styling.
 * Matches the design used in Credentials page for a clear, button-like CTA.
 */
export function ExpandCollapseButton({
  isExpanded,
  onClick,
  expandLabel = 'Expand',
  collapseLabel = 'Collapse',
  className = '',
  stopPropagation = true,
  size = 'sm',
  disabled = false,
  ariaLabel,
}: ExpandCollapseButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (stopPropagation) {
      e.stopPropagation();
    }
    onClick(e);
  };

  const sizeClasses = size === 'xs' 
    ? 'px-2 py-1 text-xs' 
    : 'px-3 py-1.5 text-xs';
  
  const iconSize = size === 'xs' ? 'w-3 h-3' : 'w-3.5 h-3.5';

  return (
    <button
      onClick={handleClick}
      disabled={disabled}
      className={`inline-flex items-center gap-1 ${sizeClasses} font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      aria-label={ariaLabel || (isExpanded ? collapseLabel : expandLabel)}
    >
      {isExpanded ? (
        <>
          <ChevronUp className={iconSize} />
          {collapseLabel}
        </>
      ) : (
        <>
          <ChevronDown className={iconSize} />
          {expandLabel}
        </>
      )}
    </button>
  );
}

