import { Loading } from '../../../components/common/Loading';
import { memo } from 'react';

type ServerStatusChartProps = {
  total: number;
  online: number;
  warning: number;
  offline: number;
  loading?: boolean;
};

/**
 * ServerStatusChart component displaying server status as a donut chart
 * Memoized to prevent unnecessary re-renders
 */
export const ServerStatusChart = memo(function ServerStatusChart({ total, online, warning, offline, loading }: ServerStatusChartProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-xl p-6">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
        <div className="flex items-center justify-center h-48">
          <Loading className="w-48 h-48 rounded-full" />
        </div>
      </div>
    );
  }

  const totalAngle = 100;
  const onlinePercent = total > 0 ? (online / total) * 100 : 0;
  const warningPercent = total > 0 ? (warning / total) * 100 : 0;
  const offlinePercent = total > 0 ? (offline / total) * 100 : 0;

  const onlineDash = onlinePercent;
  const warningDash = warningPercent;
  const offlineDash = offlinePercent;
  const warningOffset = -onlineDash;
  const offlineOffset = -(onlineDash + warningDash);

  return (
    <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Server Status</h3>
      <div className="flex items-center justify-center">
        <div className="relative w-48 h-48">
          <svg className="w-full h-full" viewBox="0 0 36 36">
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#28A745"
              strokeDasharray={`${onlineDash}, 100`}
              strokeWidth="3"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#FFC107"
              strokeDasharray={`${warningDash}, 100`}
              strokeDashoffset={warningOffset}
              strokeWidth="3"
            />
            <path
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              fill="none"
              stroke="#DC3545"
              strokeDasharray={`${offlineDash}, 100`}
              strokeDashoffset={offlineOffset}
              strokeWidth="3"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-bold text-gray-900 dark:text-white">{total}</span>
            <span className="text-sm text-gray-500 dark:text-gray-400">Total</span>
          </div>
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-4 text-sm flex-wrap">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#28A745]" />
          <span className="text-gray-700 dark:text-gray-300">Online</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">{online}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#FFC107]" />
          <span className="text-gray-700 dark:text-gray-300">Warning</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">{warning}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-[#DC3545]" />
          <span className="text-gray-700 dark:text-gray-300">Offline</span>
          <span className="font-medium text-gray-700 dark:text-gray-300">{offline}</span>
        </div>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if props actually change
  return (
    prevProps.total === nextProps.total &&
    prevProps.online === nextProps.online &&
    prevProps.warning === nextProps.warning &&
    prevProps.offline === nextProps.offline &&
    prevProps.loading === nextProps.loading
  );
});

