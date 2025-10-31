import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { useCredentials } from '../hooks/useCredentials';
import { useCreateCredential, useUpdateCredential, useDeleteCredential } from '../hooks/useCredentialMutations';
import { revealCredentialData } from '../../../services/credentials';
import { Loading } from '../../../components/common/Loading';
import { EmptyState } from '../../../components/common/EmptyState';
import { CredentialModal } from '../components/CredentialModal';
import { Search, Plus, Edit, Trash2, Key, X, Eye, EyeOff } from 'lucide-react';
import type { Credential } from '../../../services/credentials';
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
 * CredentialsPage component for managing credentials
 */
export function CredentialsPage() {
  usePageTitle('Credentials');
  const { hasPermission } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [credentialModalOpen, setCredentialModalOpen] = useState(false);
  const [selectedCredentialForEdit, setSelectedCredentialForEdit] = useState<Credential | null>(null);
  const [revealedData, setRevealedData] = useState<Record<number, any>>({});
  const [revealingData, setRevealingData] = useState<Record<number, boolean>>({});

  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Fetch credentials with infinite scroll
  const {
    data: credentialsData,
    isLoading: credentialsLoading,
    error: credentialsError,
    fetchNextPage: fetchNextCredentialsPage,
    hasNextPage: hasNextCredentialsPage,
    isFetchingNextPage: isFetchingNextCredentialsPage,
  } = useCredentials(debouncedSearch, 20);

  const deleteCredential = useDeleteCredential();

  // Flatten credentials from all pages
  const credentials = useMemo(() => {
    return credentialsData?.pages.flatMap((page) => page.data) ?? [];
  }, [credentialsData]);

  // Infinite scroll observer
  const credentialsObserverTarget = useInfiniteScroll({
    hasNextPage: hasNextCredentialsPage ?? false,
    isFetchingNextPage: isFetchingNextCredentialsPage,
    fetchNextPage: fetchNextCredentialsPage,
  });

  const handleCreateCredential = () => {
    setSelectedCredentialForEdit(null);
    setCredentialModalOpen(true);
  };

  const handleEditCredential = (credential: Credential) => {
    setSelectedCredentialForEdit(credential);
    setCredentialModalOpen(true);
  };

  const handleDeleteCredential = async (credentialId: number) => {
    try {
      await deleteCredential.mutateAsync(credentialId);
    } catch (err) {
      // Error handled by global error handler
    }
  };

  const handleRevealData = async (credentialId: number) => {
    // If already revealed, hide it
    if (revealedData[credentialId] !== undefined) {
      setRevealedData((prev) => {
        const newState = { ...prev };
        delete newState[credentialId];
        return newState;
      });
      return;
    }

    // Reveal data
    setRevealingData((prev) => ({ ...prev, [credentialId]: true }));
    try {
      const response = await revealCredentialData(credentialId);
      setRevealedData((prev) => ({ ...prev, [credentialId]: response.data }));
    } catch (err) {
      // Error handled by global error handler
    } finally {
      setRevealingData((prev) => {
        const newState = { ...prev };
        delete newState[credentialId];
        return newState;
      });
    }
  };

  if (credentialsLoading && credentials.length === 0) {
    return (
      <div className="max-w-7xl mx-auto">
        <Loading className="h-64" />
      </div>
    );
  }

  if (credentialsError) {
    return (
      <div className="max-w-7xl mx-auto">
        <EmptyState
          icon={Key}
          title="Failed to load credentials"
          description="Unable to fetch credentials. Please try again later."
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex flex-col">
          <p className="text-gray-900 dark:text-white text-3xl font-bold leading-tight">Credentials</p>
          <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">
            Manage your credentials and API keys securely.
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
                placeholder="Search credentials..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </label>
          {hasPermission('credentials:create') && (
            <button
              onClick={handleCreateCredential}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <Plus className="w-4 h-4" />
              Create Credential
            </button>
          )}
        </div>
      </header>

      {/* Credentials List */}
      {credentials.length === 0 ? (
        <EmptyState
          icon={Key}
          title={searchQuery ? 'No credentials found' : 'No credentials yet'}
          description={
            searchQuery
              ? 'Try adjusting your search query.'
              : 'Create your first credential to start managing your API keys and secrets.'
          }
          action={
            hasPermission('credentials:create') && !searchQuery ? (
              <button
                onClick={handleCreateCredential}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
              >
                Create Credential
              </button>
            ) : null
          }
        />
      ) : (
        <div className="space-y-4">
          {credentials.map((credential) => {
            const isRevealed = revealedData[credential.id] !== undefined;
            const revealed = isRevealed ? revealedData[credential.id] : null;
            const parsedData = typeof credential.data === 'string' ? JSON.parse(credential.data) : credential.data;

            return (
              <div
                key={credential.id}
                className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-xl p-6"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Key className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{credential.name}</h3>
                      <span className="inline-flex items-center rounded-md bg-gray-50 dark:bg-gray-700 px-2 py-1 text-xs font-medium text-gray-600 dark:text-gray-300 ring-1 ring-inset ring-gray-500/10">
                        {credential.type}
                      </span>
                    </div>
                    
                    <div className="mt-4 space-y-2">
                      {isRevealed && revealed ? (
                        <div className="space-y-2">
                          {Object.entries(revealed).map(([key, value]) => (
                            <div key={key} className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[100px]">{key}:</span>
                              <code className="flex-1 text-sm font-mono text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded break-all">
                                {String(value)}
                              </code>
                            </div>
                          ))}
                          {hasPermission('credentials:reveal') && (
                            <button
                              onClick={() => handleRevealData(credential.id)}
                              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 focus:outline-none focus:ring-2 focus:ring-primary/50 rounded p-1 text-sm"
                              aria-label="Hide data"
                            >
                              <EyeOff className="w-4 h-4 inline mr-1" />
                              Hide
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {Object.keys(parsedData || {}).map((key) => (
                            <div key={key} className="flex items-center gap-2">
                              <span className="text-xs text-gray-500 dark:text-gray-400 min-w-[100px]">{key}:</span>
                              <code className="flex-1 text-sm font-mono text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                                ••••••••
                              </code>
                            </div>
                          ))}
                          {hasPermission('credentials:reveal') && (
                            <button
                              onClick={() => handleRevealData(credential.id)}
                              disabled={revealingData[credential.id]}
                              className="text-gray-400 dark:text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 rounded p-1 text-sm disabled:opacity-50"
                              aria-label="Reveal data"
                              title="Reveal credential data (requires credentials:reveal permission)"
                            >
                              {revealingData[credential.id] ? (
                                <>
                                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin inline-block mr-1" />
                                  Revealing...
                                </>
                              ) : (
                                <>
                                  <Eye className="w-4 h-4 inline mr-1" />
                                  Reveal
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {credential.createdAt && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                        Created {new Date(credential.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {hasPermission('credentials:update') && (
                      <button
                        onClick={() => handleEditCredential(credential)}
                        className="text-gray-400 dark:text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 rounded p-1"
                        aria-label="Edit credential"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    )}
                    {hasPermission('credentials:delete') && (
                      <button
                        onClick={() => handleDeleteCredential(credential.id)}
                        disabled={deleteCredential.isPending}
                        className="text-gray-400 dark:text-gray-500 hover:text-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/50 rounded p-1 disabled:opacity-50"
                        aria-label="Delete credential"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={credentialsObserverTarget} className="h-4" />
          {isFetchingNextCredentialsPage && (
            <div className="p-4 text-center">
              <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      )}

      {/* Credential Modal */}
      <CredentialModal
        isOpen={credentialModalOpen}
        onClose={() => {
          setCredentialModalOpen(false);
          setSelectedCredentialForEdit(null);
        }}
        credential={selectedCredentialForEdit}
      />
    </div>
  );
}
