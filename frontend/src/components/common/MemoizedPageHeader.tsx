import { memo } from 'react';

/**
 * Memoized page header component - prevents re-renders when data changes
 */
export const MemoizedPageHeader = memo(({
  title,
  description,
  searchQuery,
  onSearchChange,
  searchPlaceholder,
  onCreateClick,
  hasCreatePermission,
  createPermission,
  children,
}: {
  title: string;
  description: string;
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  searchPlaceholder?: string;
  onCreateClick: () => void;
  hasCreatePermission: (permission: string) => boolean;
  createPermission: string;
  children?: React.ReactNode;
}) => {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
      <div className="flex flex-col">
        <p className="text-gray-900 dark:text-white text-3xl font-bold leading-tight">{title}</p>
        <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">
          {description}
        </p>
      </div>
      <div className="flex items-center gap-4 flex-1 justify-end min-w-[300px]">
        {children}
        <label className="flex flex-col h-12 w-full max-w-sm">
          <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
            <div className="text-gray-400 dark:text-gray-500 flex bg-white dark:bg-[#1C252E] items-center justify-center pl-4 rounded-l-lg border border-gray-200 dark:border-gray-700/50 border-r-0">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={onSearchChange}
              placeholder={searchPlaceholder || 'Search...'}
              className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-full placeholder:text-gray-400 dark:placeholder:text-gray-500 px-4 text-sm font-normal leading-normal"
            />
          </div>
        </label>
        {hasCreatePermission(createPermission) && (
          <button
            onClick={onCreateClick}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create {title}
          </button>
        )}
      </div>
    </header>
  );
}, (prevProps, nextProps) => {
  // Return true if props are equal (skip re-render)
  return (
    prevProps.searchQuery === nextProps.searchQuery &&
    prevProps.title === nextProps.title &&
    prevProps.description === nextProps.description &&
    prevProps.searchPlaceholder === nextProps.searchPlaceholder &&
    prevProps.createPermission === nextProps.createPermission &&
    prevProps.hasCreatePermission === nextProps.hasCreatePermission
  );
});
MemoizedPageHeader.displayName = 'MemoizedPageHeader';

