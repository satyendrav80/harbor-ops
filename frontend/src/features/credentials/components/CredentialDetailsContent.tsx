import { useState } from 'react';
import { useCredential } from '../hooks/useCredentials';
import { revealCredentialData } from '../../../services/credentials';
import { CredentialModal } from './CredentialModal';
import { Key, Edit, Server, Cloud, Tag as TagIcon } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';
import { Loading } from '../../../components/common/Loading';
import { useQueryClient } from '@tanstack/react-query';
import type { Credential } from '../../../services/credentials';
import { RevealButton } from '../../../components/common/RevealButton';

type CredentialDetailsContentProps = {
  credentialId: number;
  onCredentialClick?: (credentialId: number) => void;
  onServerClick?: (serverId: number) => void;
  onServiceClick?: (serviceId: number) => void;
};

export function CredentialDetailsContent({ 
  credentialId, 
  onCredentialClick,
  onServerClick,
  onServiceClick 
}: CredentialDetailsContentProps) {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [revealedData, setRevealedData] = useState<any>(null);
  const [revealingData, setRevealingData] = useState(false);

  const { data: credential, isLoading } = useCredential(credentialId);

  const handleRevealData = async () => {
    if (revealedData !== null) {
      setRevealedData(null);
      return;
    }

    setRevealingData(true);
    try {
      const response = await revealCredentialData(credentialId);
      setRevealedData(response.data);
      // Update cache
      queryClient.setQueryData(['credential', credentialId], (old: Credential | undefined) => {
        if (!old) return old;
        return { ...old, data: response.data };
      });
    } catch (error) {
      console.error('Failed to reveal credential data:', error);
    } finally {
      setRevealingData(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loading className="w-6 h-6" />
      </div>
    );
  }

  if (!credential) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Credential not found</p>
      </div>
    );
  }

  // Safely parse credential data to get keys
  let parsedData: Record<string, any> = {};
  try {
    parsedData = typeof credential.data === 'string' ? JSON.parse(credential.data) : (credential.data || {});
  } catch (e) {
    console.error(`Failed to parse credential data for credential ${credential.id}:`, e);
    parsedData = {};
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Key className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{credential.name}</h1>
              <span className="inline-flex items-center rounded-md bg-gray-50 dark:bg-gray-700 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 ring-1 ring-inset ring-gray-500/10">
                {credential.type}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasPermission('credentials:update') && (
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
        {/* Credential Data */}
        <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Credential Data</h2>
            {hasPermission('credentials:reveal') && (
              <RevealButton
                isRevealed={revealedData !== null}
                isLoading={revealingData}
                onToggle={handleRevealData}
                title="Reveal data (requires credentials:reveal permission)"
              />
            )}
          </div>
          <div className="space-y-3">
            {revealedData !== null ? (
              <div className="space-y-2">
                {Object.entries(revealedData).map(([key, value]) => {
                  const valueStr = String(value);
                  const isMultiline = valueStr.includes('\n');
                  return (
                    <div key={key} className={isMultiline ? "flex flex-col gap-1" : "flex items-center gap-2"}>
                      <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[120px] font-medium">{key}:</span>
                      {isMultiline ? (
                        <pre className="flex-1 text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded break-all whitespace-pre-wrap overflow-x-auto">
                          {valueStr}
                        </pre>
                      ) : (
                        <code className="flex-1 text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded break-all">
                          {valueStr}
                        </code>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                {Object.keys(parsedData).length > 0 ? (
                  Object.keys(parsedData).map((key) => (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[120px] font-medium">{key}:</span>
                      <code className="flex-1 text-sm font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                        ••••••••
                      </code>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400">No credential data available</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Servers */}
        {credential.servers && credential.servers.length > 0 && (
          <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Server className="w-4 h-4" />
              Servers ({credential.servers.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {credential.servers.map((sc) => (
                <button
                  key={sc.server.id}
                  onClick={() => onServerClick?.(sc.server.id)}
                  className="inline-flex items-center rounded-md bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 text-xs font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors cursor-pointer"
                  title={`Click to view server ${sc.server.name}`}
                >
                  {sc.server.name} ({sc.server.type})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Services */}
        {credential.services && credential.services.length > 0 && (
          <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Cloud className="w-4 h-4" />
              Services ({credential.services.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {credential.services.map((sc) => (
                <button
                  key={sc.service.id}
                  onClick={() => onServiceClick?.(sc.service.id)}
                  className="inline-flex items-center rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 text-xs font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors cursor-pointer"
                  title={`Click to view service ${sc.service.name}`}
                >
                  {sc.service.name} (:{sc.service.port})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Tags */}
        {credential.tags && credential.tags.length > 0 && (
          <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <TagIcon className="w-4 h-4" />
              Tags ({credential.tags.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {credential.tags.map((tag) => (
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
      <CredentialModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        credential={credential}
      />
    </div>
  );
}
