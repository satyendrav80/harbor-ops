import { useState } from 'react';
import { useServer } from '../hooks/useServers';
import { revealServerPassword } from '../../../services/servers';
import { ServerModal } from './ServerModal';
import { ServerIcon, Edit, Key, Globe, Tag as TagIcon, FolderOpen, ExternalLink, Cloud } from 'lucide-react';
import { RevealButton } from '../../../components/common/RevealButton';
import { useAuth } from '../../auth/context/AuthContext';
import { Loading } from '../../../components/common/Loading';
import { RichTextRenderer } from '../../../components/common/RichTextRenderer';
import { useQueryClient } from '@tanstack/react-query';
import type { Server } from '../../../services/servers';

type ServerDetailsContentProps = {
  serverId: number;
  onServerClick?: (serverId: number) => void;
  onServiceClick?: (serviceId: number) => void;
  onCredentialClick?: (credentialId: number) => void;
};

export function ServerDetailsContent({ 
  serverId, 
  onServerClick,
  onServiceClick,
  onCredentialClick 
}: ServerDetailsContentProps) {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [revealingPassword, setRevealingPassword] = useState(false);

  const { data: server, isLoading } = useServer(serverId);

  const handleRevealPassword = async () => {
    if (revealedPassword !== null) {
      setRevealedPassword(null);
      return;
    }

    setRevealingPassword(true);
    try {
      const response = await revealServerPassword(serverId);
      setRevealedPassword(response.password);
      // Update cache
      queryClient.setQueryData(['server', serverId], (old: Server | undefined) => {
        if (!old) return old;
        return { ...old, password: response.password || undefined };
      });
    } catch (error) {
      console.error('Failed to reveal password:', error);
    } finally {
      setRevealingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loading className="w-6 h-6" />
      </div>
    );
  }

  if (!server) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-gray-500 dark:text-gray-400 mb-4">Server not found</p>
      </div>
    );
  }

  const isOsOrEc2 = server.type === 'os' || server.type === 'ec2';
  const isRds = server.type === 'rds';
  const isCloudService = ['amplify', 'lambda', 'ecs', 'other'].includes(server.type || '');

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <ServerIcon className="w-6 h-6 text-gray-500 dark:text-gray-400" />
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{server.name}</h1>
              {server.type && (
                <span className="inline-flex items-center rounded-md bg-gray-50 dark:bg-gray-700 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 ring-1 ring-inset ring-gray-500/10">
                  {server.type.toUpperCase()}
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {hasPermission('servers:update') && (
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
        {/* Connection Details */}
        <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Connection Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* OS/EC2 fields */}
            {isOsOrEc2 && (
              <>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Public IP</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{server.publicIp || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Private IP</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{server.privateIp || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">SSH Port</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{server.sshPort || '-'}</p>
                </div>
              </>
            )}

            {/* RDS fields */}
            {isRds && (
              <>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Endpoint</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{server.endpoint || '-'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Port</p>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{server.port || '-'}</p>
                </div>
              </>
            )}

            {/* Cloud services fields */}
            {isCloudService && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Endpoint</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{server.endpoint || '-'}</p>
              </div>
            )}

            {/* Username */}
            {server.username && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Username</p>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{server.username}</p>
              </div>
            )}

            {/* Password */}
            <div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Password</p>
              <div className="flex items-center gap-2">
                {revealedPassword !== null ? (
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      {revealedPassword || '(no password)'}
                    </code>
                    {hasPermission('credentials:reveal') && (
                      <RevealButton
                        isRevealed={true}
                        onToggle={handleRevealPassword}
                        iconOnly={true}
                        size="xs"
                        title="Hide password"
                      />
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <code className="text-sm font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                      ••••••••
                    </code>
                    {hasPermission('credentials:reveal') && (
                      <RevealButton
                        isRevealed={false}
                        isLoading={revealingPassword}
                        onToggle={handleRevealPassword}
                        iconOnly={true}
                        size="xs"
                        title="Reveal password (requires credentials:reveal permission)"
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Credentials */}
        {server.credentials && server.credentials.length > 0 && (
          <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Key className="w-4 h-4" />
              Credentials ({server.credentials.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {server.credentials.map((sc) => (
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

        {/* Services */}
        {server.services && server.services.length > 0 && (
          <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Cloud className="w-4 h-4" />
              Services ({server.services.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {server.services.map((ss) => (
                <button
                  key={ss.service.id}
                  onClick={() => onServiceClick?.(ss.service.id)}
                  className="inline-flex items-center gap-1 rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 text-xs font-medium hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors cursor-pointer"
                  title={`Click to view service ${ss.service.name}`}
                >
                  <Cloud className="w-3 h-3" />
                  {ss.service.name} (:{ss.service.port})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Domains */}
        {server.domains && server.domains.length > 0 && (
          <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <Globe className="w-4 h-4" />
              Domains ({server.domains.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {server.domains.map((sd) => (
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

        {/* Tags */}
        {server.tags && server.tags.length > 0 && (
          <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <TagIcon className="w-4 h-4" />
              Tags ({server.tags.length})
            </h3>
            <div className="flex flex-wrap gap-2">
              {server.tags.map((st) => (
                <span
                  key={st.tag.id}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium rounded dark:bg-opacity-20"
                  style={{
                    backgroundColor: st.tag.color ? `${st.tag.color}20` : undefined,
                    color: st.tag.color || undefined,
                  }}
                >
                  {st.tag.value ? `${st.tag.name}:${st.tag.value}` : st.tag.name}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Documentation */}
        {(server.documentationUrl || server.documentation) && (
          <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <FolderOpen className="w-4 h-4" />
              Documentation & Rules
            </h3>
            {server.documentationUrl && (
              <div className="mb-3">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">External Documentation</p>
                <a
                  href={server.documentationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-primary hover:underline break-all inline-flex items-center gap-1"
                >
                  <span>{server.documentationUrl}</span>
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>
            )}
            {server.documentation && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Inline Documentation</p>
                <RichTextRenderer html={server.documentation} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      <ServerModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        server={server}
      />
    </div>
  );
}
