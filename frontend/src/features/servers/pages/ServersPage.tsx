import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { useServers } from '../hooks/useServers';
import { useCreateServer, useUpdateServer, useDeleteServer } from '../hooks/useServerMutations';
import { revealServerPassword } from '../../../services/servers';
import { Loading } from '../../../components/common/Loading';
import { EmptyState } from '../../../components/common/EmptyState';
import { ServerModal } from '../components/ServerModal';
import { Search, Plus, Edit, Trash2, Server as ServerIcon, X, Eye, EyeOff } from 'lucide-react';
import type { Server } from '../../../services/servers';
import { useInfiniteScroll } from '../../../components/common/useInfiniteScroll';
import { usePageTitle } from '../../../hooks/usePageTitle';

/**
 * Debounce hook to delay search input
 */
function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * ServersPage component for managing servers
 */
export function ServersPage() {
  usePageTitle('Servers');
  const { hasPermission } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [serverModalOpen, setServerModalOpen] = useState(false);
  const [selectedServerForEdit, setSelectedServerForEdit] = useState<Server | null>(null);
  const [revealedPasswords, setRevealedPasswords] = useState<Record<number, string | null>>({});
  const [revealingPasswords, setRevealingPasswords] = useState<Record<number, boolean>>({});

  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Fetch servers with infinite scroll
  const {
    data: serversData,
    isLoading: serversLoading,
    error: serversError,
    fetchNextPage: fetchNextServersPage,
    hasNextPage: hasNextServersPage,
    isFetchingNextPage: isFetchingNextServersPage,
  } = useServers(debouncedSearch, 20);

  const deleteServer = useDeleteServer();

  // Flatten servers from all pages
  const servers = useMemo(() => {
    return serversData?.pages.flatMap((page) => page.data) ?? [];
  }, [serversData]);

  // Infinite scroll observer
  const serversObserverTarget = useInfiniteScroll({
    hasNextPage: hasNextServersPage ?? false,
    isFetchingNextPage: isFetchingNextServersPage,
    fetchNextPage: fetchNextServersPage,
  });

  const handleCreateServer = () => {
    setSelectedServerForEdit(null);
    setServerModalOpen(true);
  };

  const handleEditServer = (server: Server) => {
    setSelectedServerForEdit(server);
    setServerModalOpen(true);
  };

  const handleDeleteServer = async (serverId: number) => {
    try {
      await deleteServer.mutateAsync(serverId);
    } catch (err) {
      // Error handled by global error handler
    }
  };

  const handleRevealPassword = async (serverId: number) => {
    // If already revealed, hide it
    if (revealedPasswords[serverId] !== undefined) {
      setRevealedPasswords((prev) => {
        const newState = { ...prev };
        delete newState[serverId];
        return newState;
      });
      return;
    }

    // Reveal password
    setRevealingPasswords((prev) => ({ ...prev, [serverId]: true }));
    try {
      const response = await revealServerPassword(serverId);
      setRevealedPasswords((prev) => ({ ...prev, [serverId]: response.password }));
    } catch (err) {
      // Error handled by global error handler
    } finally {
      setRevealingPasswords((prev) => {
        const newState = { ...prev };
        delete newState[serverId];
        return newState;
      });
    }
  };

  if (serversLoading && servers.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <Loading className="h-64" />
      </div>
    );
  }

  if (serversError) {
    return (
      <div className="max-w-7xl mx-auto">
        <EmptyState
          icon={ServerIcon}
          title="Failed to load servers"
          description="Unable to fetch servers. Please try again later."
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex flex-col">
          <p className="text-gray-900 dark:text-white text-3xl font-bold leading-tight">Servers</p>
          <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">
            Manage your server infrastructure and SSH connections.
          </p>
        </div>
        <div className="flex items-center gap-4 flex-1 justify-end min-w-[300px]">
          <label className="flex flex-col h-12 w-full max-w-sm">
            <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
              <div className="text-gray-400 dark:text-gray-500 flex bg-white dark:bg-[#1C252E] items-center justify-center pl-4 rounded-l-lg border border-gray-200 dark:border-gray-700/50 border-r-0">
                <Search className="w-5 h-5" />
              </div>
              <input
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-full placeholder:text-gray-400 dark:placeholder:text-gray-500 px-4 text-sm font-normal leading-normal"
                placeholder="Search servers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </label>
          {hasPermission('servers:create') && (
            <button
              onClick={handleCreateServer}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <Plus className="w-4 h-4" />
              Create Server
            </button>
          )}
        </div>
      </header>

      {/* Servers List */}
      {servers.length === 0 ? (
        <EmptyState
          icon={ServerIcon}
          title={searchQuery ? 'No servers found' : 'No servers yet'}
          description={
            searchQuery
              ? 'Try adjusting your search query.'
              : 'Create your first server to start managing your infrastructure.'
          }
          action={
            hasPermission('servers:create') && !searchQuery ? (
              <button
                onClick={handleCreateServer}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
              >
                Create Server
              </button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-4">
          {servers.map((server) => (
            <div
              key={server.id}
              className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-xl p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <ServerIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{server.name}</h3>
                    {server.type && (
                      <span className="inline-flex items-center rounded-md bg-gray-50 dark:bg-gray-700 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 ring-1 ring-inset ring-gray-500/10">
                        {server.type.toUpperCase()}
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">

                    {/* OS/EC2 fields */}
                    {(server.type === 'os' || server.type === 'ec2') && (
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
                    {server.type === 'rds' && (
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

                    {/* Cloud services (Amplify/Lambda/ECS/Other) fields */}
                    {['amplify', 'lambda', 'ecs', 'other'].includes(server.type || '') && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Endpoint</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{server.endpoint || '-'}</p>
                      </div>
                    )}

                    {/* Username field (optional) */}
                    {server.username && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Username</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{server.username}</p>
                      </div>
                    )}

                    {/* Password field (always shown if password exists) */}
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Password</p>
                      <div className="flex items-center gap-2">
                        {revealedPasswords[server.id] !== undefined ? (
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              {revealedPasswords[server.id] || '(no password)'}
                            </code>
                            {hasPermission('credentials:reveal') && (
                              <button
                                onClick={() => handleRevealPassword(server.id)}
                                className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded p-1"
                                aria-label="Hide password"
                                title="Hide password"
                              >
                                <EyeOff className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                              ••••••••
                            </code>
                            {hasPermission('credentials:reveal') && (
                              <button
                                onClick={() => handleRevealPassword(server.id)}
                                disabled={revealingPasswords[server.id]}
                                className="text-gray-400 dark:text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 rounded p-1 disabled:opacity-50"
                                aria-label="Reveal password"
                                title="Reveal password (requires credentials:reveal permission)"
                              >
                                {revealingPasswords[server.id] ? (
                                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Credentials */}
                    {server.credentials && server.credentials.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Credentials</p>
                        <div className="flex flex-wrap gap-2">
                          {server.credentials.map((sc) => (
                            <span
                              key={sc.credential.id}
                              className="inline-flex items-center rounded-md bg-primary/10 text-primary px-2 py-1 text-xs font-medium"
                            >
                              {sc.credential.name} ({sc.credential.type})
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  {/* Tags */}
                  {server.tags && server.tags.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Tags</p>
                      <div className="flex flex-wrap gap-2">
                        {server.tags.map((serverTag) => (
                          <span
                            key={serverTag.tag.id}
                            className="inline-flex items-center rounded-md bg-primary/10 text-primary px-2 py-1 text-xs font-medium"
                          >
                            {serverTag.tag.name}
                            {serverTag.tag.value && `: ${serverTag.tag.value}`}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {server.createdAt && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                      Created {new Date(server.createdAt).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 ml-4">
                  {hasPermission('servers:update') && (
                    <button
                      onClick={() => handleEditServer(server)}
                      className="text-gray-400 dark:text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 rounded p-1"
                      aria-label="Edit server"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                  )}
                  {hasPermission('servers:delete') && (
                    <button
                      onClick={() => handleDeleteServer(server.id)}
                      disabled={deleteServer.isPending}
                      className="text-gray-400 dark:text-gray-500 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 rounded p-1 disabled:opacity-50"
                      aria-label="Delete server"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          <div ref={serversObserverTarget} className="h-4" />
          {isFetchingNextServersPage && (
            <div className="p-4 text-center">
              <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Server Modal */}
      <ServerModal
        isOpen={serverModalOpen}
        onClose={() => {
          setServerModalOpen(false);
          setSelectedServerForEdit(null);
        }}
        server={selectedServerForEdit}
      />
    </div>
  );
}

