import { Loading } from '../../../components/common/Loading';
import { EmptyState } from '../../../components/common/EmptyState';
import { Activity } from 'lucide-react';
import type { ServiceHealth } from '../types';

type ServiceHealthBarProps = {
  services: ServiceHealth[];
  loading?: boolean;
};

/**
 * ServiceHealthBar component displaying service health as progress bars
 */
export function ServiceHealthBar({ services, loading }: ServiceHealthBarProps) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-xl p-6">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded animate-pulse mb-4" />
        <div className="space-y-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="space-y-1">
              <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
              <div className="h-2.5 w-full bg-gray-200 dark:bg-gray-700 rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (services.length === 0) {
    return (
      <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-xl p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Service Health</h3>
        <EmptyState icon={Activity} title="No services" description="No services available to display" />
      </div>
    );
  }

  const getHealthColor = (health: number) => {
    if (health >= 90) return 'bg-[#28A745]';
    if (health >= 70) return 'bg-[#FFC107]';
    return 'bg-[#DC3545]';
  };

  return (
    <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-xl p-6">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Service Health</h3>
      <div className="space-y-4">
        {services.map((service) => (
          <div key={service.id} className="space-y-1">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{service.name}</p>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
              <div className={`${getHealthColor(service.health)} h-2.5 rounded-full transition-all`} style={{ width: `${service.health}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

