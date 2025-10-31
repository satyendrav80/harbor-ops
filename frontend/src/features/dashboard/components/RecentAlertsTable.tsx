import { Loading } from '../../../components/common/Loading';
import { EmptyState } from '../../../components/common/EmptyState';
import { AlertCircle } from 'lucide-react';
import { memo } from 'react';
import type { RecentAlert } from '../types';

type RecentAlertsTableProps = {
  alerts: RecentAlert[];
  loading?: boolean;
};

/**
 * RecentAlertsTable component displaying recent alerts/activity
 * Memoized to prevent unnecessary re-renders
 */
export const RecentAlertsTable = memo(function RecentAlertsTable({ alerts, loading }: RecentAlertsTableProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-xl p-6">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Alerts</h3>
        <EmptyState icon={AlertCircle} title="No alerts" description="No recent alerts to display" />
      </div>
    );
  }

  const getStatusBadge = (status: RecentAlert['status']) => {
    const styles = {
      high: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
      degraded: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400',
      expiring: 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-600 dark:text-yellow-400',
      recovered: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400',
    };
    const labels = {
      high: 'High CPU',
      degraded: 'Degraded',
      expiring: 'Expiring',
      recovered: 'Recovered',
    };
    return { className: styles[status], label: labels[status] };
  };

  return (
    <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Alerts</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 dark:text-gray-400 uppercase border-b border-gray-200 dark:border-gray-700">
            <tr>
              <th className="py-3 pr-6" scope="col">
                Timestamp
              </th>
              <th className="py-3 px-6" scope="col">
                Item
              </th>
              <th className="py-3 px-6" scope="col">
                Status
              </th>
              <th className="py-3 pl-6" scope="col">
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {alerts.map((alert) => {
              const badge = getStatusBadge(alert.status);
              return (
                <tr key={alert.id} className="border-b border-gray-200 dark:border-gray-700 last:border-0">
                  <td className="py-4 pr-6 text-gray-500 dark:text-gray-400 whitespace-nowrap">{alert.timestamp}</td>
                  <td className="py-4 px-6 font-medium text-gray-900 dark:text-white whitespace-nowrap">{alert.item}</td>
                  <td className="py-4 px-6">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${badge.className}`}>{badge.label}</span>
                  </td>
                  <td className="py-4 pl-6">
                    <button className="font-medium text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary/50 rounded">
                      {alert.action || 'Details'}
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}, (prevProps, nextProps) => {
  // Only re-render if props actually change
  if (prevProps.loading !== nextProps.loading) return false;
  if (prevProps.alerts.length !== nextProps.alerts.length) return false;
  
  // Check if any alert data changed
  for (let i = 0; i < prevProps.alerts.length; i++) {
    const prev = prevProps.alerts[i];
    const next = nextProps.alerts[i];
    if (!next || prev.id !== next.id || prev.status !== next.status || prev.item !== next.item) {
      return false;
    }
  }
  
  return true;
});

