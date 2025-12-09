import { useState } from 'react';
import { useService } from '../hooks/useServices';
import { ServiceModal } from './ServiceModal';
import { ServiceDependencies } from './ServiceDependencies';
import { ServerIcon, Edit, Key, Globe, Tag as TagIcon, FolderOpen, ExternalLink, Cloud, GitBranch, Link2 } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import { Loading } from '../../../components/common/Loading';
import { useConstants } from '../../constants/hooks/useConstants';

type ServiceDetailsContentProps = {
  serviceId: number;
  onServiceClick?: (serviceId: number) => void;
  onServerClick?: (serverId: number) => void;
  onCredentialClick?: (credentialId: number) => void;
};

export function ServiceDetailsContent({ 
  serviceId, 
  onServiceClick,
  onServerClick,
  onCredentialClick 
}: ServiceDetailsContentProps) {
  const { hasPermission } = useAuth();
  const { data: constants } = useConstants();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const { data: service, isLoading } = useService(serviceId);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loading className="w-6 h-6" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Service not found</p>
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
              <Cloud className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{service.name}</h1>
              {service.external && (
                <span className="inline-flex items-center rounded-md bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-2 py-1 text-xs font-medium">
                  External
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasPermission('services:update') && (
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
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Port</p>
              <p className="text-sm font-medium text-gray-900 dark:text-white">{service.port}</p>
            </div>
            {service.sourceRepo && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Source Repository</p>
                <a
                  href={service.sourceRepo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:text-primary/80 inline-flex items-center gap-1"
                >
                  {service.sourceRepo}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
            {service.appId && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">App ID</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{service.appId}</p>
              </div>
            )}
            {service.functionName && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Function Name</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{service.functionName}</p>
              </div>
            )}
            {service.deploymentUrl && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Deployment URL</p>
                <a
                  href={service.deploymentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:text-primary/80 inline-flex items-center gap-1"
                >
                  {service.deploymentUrl}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Servers */}
        {service.servers && service.servers.length > 0 && (
          <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <ServerIcon className="w-4 h-4" />
              Servers ({service.servers.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {service.servers.map((ss) => (
                <button
                  key={ss.server.id}
                  onClick={() => onServerClick?.(ss.server.id)}
                  className="inline-flex items-center rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                  title={`Click to view server ${ss.server.name}`}
                >
                  {ss.server.name}
                  {ss.server.type && (
                    <span className="ml-2 text-xs">
                      ({constants?.serverTypeLabels[ss.server.type] || ss.server.type})
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Credentials */}
        {service.credentials && service.credentials.length > 0 && (
          <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Key className="w-4 h-4" />
              Credentials ({service.credentials.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {service.credentials.map((sc) => (
                <button
                  key={sc.credential.id}
                  onClick={() => onCredentialClick?.(sc.credential.id)}
                  className="inline-flex items-center rounded-md bg-primary/10 text-primary px-2 py-1 text-xs font-medium hover:bg-primary/20 transition-colors cursor-pointer"
                  title={`Click to view credential ${sc.credential.name}`}
                >
                  {sc.credential.name} ({sc.credential.type})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Domains */}
        {service.domains && service.domains.length > 0 && (
          <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Domains ({service.domains.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {service.domains.map((sd) => (
                <a
                  key={sd.domain.id}
                  href={`https://${sd.domain.name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors cursor-pointer underline"
                  title={`Open ${sd.domain.name} in new tab`}
                >
                  {sd.domain.name}
                  <ExternalLink className="w-3 h-3" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Dependencies */}
        {service.dependencies && service.dependencies.length > 0 && (
          <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <GitBranch className="w-4 h-4" />
              Dependencies ({service.dependencies.length})
            </h3>
            <div className="space-y-2">
              {service.dependencies.map((dep) => (
                <div
                  key={dep.id}
                  className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {dep.dependencyService && (
                      <>
                        <Link2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                        {onServiceClick ? (
                          <button
                            onClick={() => onServiceClick(dep.dependencyService!.id)}
                            className="text-sm text-gray-900 dark:text-white hover:text-primary transition-colors truncate text-left"
                          >
                            {dep.dependencyService.name} (:{dep.dependencyService.port})
                            {dep.dependencyService.external && (
                              <span className="ml-2 text-xs text-purple-500">[External]</span>
                            )}
                          </button>
                        ) : (
                          <span className="text-sm text-gray-900 dark:text-white truncate">
                            {dep.dependencyService.name} (:{dep.dependencyService.port})
                            {dep.dependencyService.external && (
                              <span className="ml-2 text-xs text-purple-500">[External]</span>
                            )}
                          </span>
                        )}
                      </>
                    )}
                    {dep.description && (
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 truncate">{dep.description}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Documentation */}
        {(service.documentationUrl || service.documentation) && (
          <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Documentation & Rules
            </h3>
            {service.documentationUrl && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">External Documentation</p>
                <a
                  href={service.documentationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline break-all inline-flex items-center gap-1"
                >
                  <span>{service.documentationUrl}</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
            {service.documentation && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Inline Documentation</p>
                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-sm text-gray-700 dark:text-gray-300 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-xs [&_ul]:list-disc [&_ol]:list-decimal [&_ul]:ml-4 [&_ol]:ml-4 [&_a]:text-primary [&_a]:hover:underline"
                  dangerouslySetInnerHTML={{ __html: service.documentation }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <ServiceModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        service={service}
      />
    </div>
  );
}
