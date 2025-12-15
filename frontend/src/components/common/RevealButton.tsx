import { Eye, EyeOff } from 'lucide-react';

type RevealButtonProps = {
  /**
   * Whether the content is currently revealed
   */
  isRevealed: boolean;
  
  /**
   * Whether the reveal action is in progress (loading state)
   */
  isLoading?: boolean;
  
  /**
   * Click handler for the button
   */
  onToggle: (e: React.MouseEvent<HTMLButtonElement>) => void;
  
  /**
   * Label text when not revealed (default: "Reveal")
   */
  revealLabel?: string;
  
  /**
   * Label text when revealed (default: "Hide")
   */
  hideLabel?: string;
  
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
   * Show only icon without text (default: false)
   */
  iconOnly?: boolean;
  
  /**
   * ARIA label override
   */
  ariaLabel?: string;
  
  /**
   * Title/tooltip text
   */
  title?: string;
};

/**
 * Reusable reveal/hide button component with consistent styling.
 * Matches the design used in Credentials and Servers pages.
 * Automatically stops event propagation to prevent parent click handlers.
 */
export function RevealButton({
  isRevealed,
  isLoading = false,
  onToggle,
  revealLabel = 'Reveal',
  hideLabel = 'Hide',
  className = '',
  stopPropagation = true,
  size = 'sm',
  disabled = false,
  iconOnly = false,
  ariaLabel,
  title,
}: RevealButtonProps) {
  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (stopPropagation) {
      e.stopPropagation();
    }
    onToggle(e);
  };

  const sizeClasses = size === 'xs' 
    ? 'px-2 py-1 text-xs' 
    : 'px-3 py-1.5 text-xs';
  
  const iconSize = size === 'xs' ? 'w-3.5 h-3.5' : 'w-3.5 h-3.5';

  // Icon-only variant styling
  if (iconOnly) {
    return (
      <button
        onClick={handleClick}
        disabled={disabled || isLoading}
        className={`text-gray-400 dark:text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 rounded p-1 disabled:opacity-50 ${className}`}
        aria-label={ariaLabel || (isRevealed ? hideLabel : revealLabel)}
        title={title || (isRevealed ? hideLabel : revealLabel)}
      >
        {isLoading ? (
          <div className={`${iconSize} border-2 border-gray-400 border-t-transparent rounded-full animate-spin`} />
        ) : isRevealed ? (
          <EyeOff className={iconSize} />
        ) : (
          <Eye className={iconSize} />
        )}
      </button>
    );
  }

  // Button variant with text
  return (
    <button
      onClick={handleClick}
      disabled={disabled || isLoading}
      className={`inline-flex items-center gap-1 ${sizeClasses} font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      aria-label={ariaLabel || (isRevealed ? hideLabel : revealLabel)}
      title={title || (isRevealed ? hideLabel : revealLabel)}
    >
      {isLoading ? (
        <>
          <div className={`${iconSize} border-2 border-gray-400 border-t-transparent rounded-full animate-spin`} />
          {size === 'sm' ? 'Revealing...' : '...'}
        </>
      ) : isRevealed ? (
        <>
          <EyeOff className={iconSize} />
          {hideLabel}
        </>
      ) : (
        <>
          <Eye className={iconSize} />
          {revealLabel}
        </>
      )}
    </button>
  );
}

