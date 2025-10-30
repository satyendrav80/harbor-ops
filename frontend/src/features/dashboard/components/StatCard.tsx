import { TrendingUp, TrendingDown } from 'lucide-react';

type StatCardProps = {
  title: string;
  value: number | string;
  change?: {
    value: number;
    isPositive: boolean;
  };
  loading?: boolean;
};

/**
 * StatCard component for displaying dashboard statistics
 */
export function StatCard({ title, value, change, loading }: StatCardProps) {
  if (loading) {
    return (
      <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50">
        <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-10 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
        <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2 rounded-xl p-6 bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50">
      <p className="text-gray-500 dark:text-gray-400 text-base font-medium">{title}</p>
      <p className="text-gray-900 dark:text-white tracking-light text-4xl font-bold">{value}</p>
      {change && (
        <p className={`text-sm font-medium flex items-center gap-1 ${change.isPositive ? 'text-green-500' : 'text-red-500'}`}>
          {change.isPositive ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {change.isPositive ? '+' : ''}{change.value}%
        </p>
      )}
    </div>
  );
}

