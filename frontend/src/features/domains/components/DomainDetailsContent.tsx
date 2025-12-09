import { useState } from 'react';
import { useDomain } from '../hooks/useDomains';
import { DomainModal } from './DomainModal';
import { Globe, Edit, Tag as TagIcon, ExternalLink } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import { Loading } from '../../../components/common/Loading';

type DomainDetailsContentProps = {
  domainId: number;
};

export function DomainDetailsContent({ domainId }: DomainDetailsContentProps) {
  const { hasPermission } = useAuth();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data: domain, isLoading } = useDomain(domainId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loading className="w-6 h-6" />
      </div>
    );
  }

  if (!domain) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Domain not found</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Globe className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{domain.name}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasPermission('domains:update') && (
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
              >
                <Edit className="w-4 h-4" />
                Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Domain Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Domain Name</p>
              <a
                href={`https://${domain.name}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-primary hover:text-primary/80 inline-flex items-center gap-1"
              >
                {domain.name}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Created</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                {domain.createdAt ? new Date(domain.createdAt).toLocaleString() : '-'}
              </p>
              {domain.createdByUser && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  by {domain.createdByUser.name || domain.createdByUser.email}
                </p>
              )}
            </div>
            {domain.updatedAt && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Updated</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {new Date(domain.updatedAt).toLocaleString()}
                </p>
                {domain.updatedByUser && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    by {domain.updatedByUser.name || domain.updatedByUser.email}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Tags */}
        {domain.tags && domain.tags.length > 0 && (
          <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <TagIcon className="w-4 h-4" />
              Tags ({domain.tags.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {domain.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium rounded dark:bg-opacity-20"
                  style={{
                    backgroundColor: tag.color ? `${tag.color}20` : undefined,
                    color: tag.color || undefined,
                  }}
                >
                  {tag.value ? `${tag.name}:${tag.value}` : tag.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <DomainModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        domain={domain}
      />
    </div>
  );
}
