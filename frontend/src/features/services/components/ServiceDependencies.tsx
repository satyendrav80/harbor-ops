import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getService, addServiceDependency, removeServiceDependency, type ServiceDependency } from '../../../services/services';
import { getServices } from '../../../services/services';
import { Plus, Trash2, Link2, ExternalLink } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';

type ServiceDependenciesProps = {
  serviceId: number;
  dependencies?: ServiceDependency[];
};

export function ServiceDependencies({ serviceId, dependencies: initialDependencies }: ServiceDependenciesProps) {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [dependencyType, setDependencyType] = useState<'internal' | 'external'>('internal');
  const [selectedServiceId, setSelectedServiceId] = useState<number>(0);
  const [externalServiceName, setExternalServiceName] = useState('');
  const [externalServiceType, setExternalServiceType] = useState('');
  const [externalServiceUrl, setExternalServiceUrl] = useState('');
  const [description, setDescription] = useState('');

  // Fetch current service to get latest dependencies
  const { data: service } = useQuery({
    queryKey: ['services', serviceId],
    queryFn: () => getService(serviceId),
    enabled: !!serviceId,
  });

  // Fetch all services for internal dependency selection
  const { data: servicesData } = useQuery({
    queryKey: ['services', 'all', 'dependencies'],
    queryFn: async () => {
      const response = await getServices(1, 1000);
      return response.data; // Return just the array of services
    },
    staleTime: 5 * 60 * 1000,
    enabled: showAddForm, // Fetch when form is open
  });

  const dependencies = service?.dependencies || initialDependencies || [];

  const addDependency = useMutation({
    mutationFn: (data: {
      dependencyServiceId?: number;
      externalServiceName?: string;
      externalServiceType?: string;
      externalServiceUrl?: string;
      description?: string;
    }) => addServiceDependency(serviceId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', serviceId] });
      resetForm();
      setDependencyType('internal'); // Reset to default when successfully adding
      setShowAddForm(false);
    },
  });

  const removeDependency = useMutation({
    mutationFn: (dependencyId: number) => removeServiceDependency(serviceId, dependencyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', serviceId] });
    },
  });

  const resetForm = () => {
    setSelectedServiceId(0);
    setExternalServiceName('');
    setExternalServiceType('');
    setExternalServiceUrl('');
    setDescription('');
    // Don't reset dependencyType here - it should only be reset when closing/canceling
  };

  const handleSubmit = () => {
    if (dependencyType === 'internal') {
      if (!selectedServiceId) {
        return;
      }
      addDependency.mutate({
        dependencyServiceId: selectedServiceId,
        description: description || undefined,
      });
    } else {
      if (!externalServiceName) {
        return;
      }
      addDependency.mutate({
        externalServiceName,
        externalServiceType: externalServiceType || undefined,
        externalServiceUrl: externalServiceUrl || undefined,
        description: description || undefined,
      });
    }
  };

  // Filter out current service from available services
  const availableServices = (servicesData || []).filter((s) => s.id !== serviceId);

  if (!hasPermission('services:update')) {
    if (dependencies.length === 0) return null;
    
    return (
      <div className="mt-4">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Dependencies</h4>
        <div className="space-y-2">
          {dependencies.map((dep) => (
            <div
              key={dep.id}
              className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50"
            >
              <div className="flex items-center gap-2">
                {dep.dependencyService ? (
                  <>
                    <Link2 className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-gray-900 dark:text-white">
                      {dep.dependencyService.name} (:{dep.dependencyService.port})
                    </span>
                  </>
                ) : (
                  <>
                    <ExternalLink className="w-4 h-4 text-purple-500" />
                    <span className="text-sm text-gray-900 dark:text-white">
                      {dep.externalServiceName}
                      {dep.externalServiceType && ` (${dep.externalServiceType})`}
                    </span>
                  </>
                )}
                {dep.description && (
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">{dep.description}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium text-gray-900 dark:text-white">Dependencies</h4>
        {!showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-primary hover:bg-primary/10 rounded transition-colors"
          >
            <Plus className="w-3 h-3" />
            Add Dependency
          </button>
        )}
      </div>

      {/* Existing Dependencies */}
      <div className="space-y-2 mb-4">
        {dependencies.map((dep) => (
          <div
            key={dep.id}
            className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50"
          >
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {dep.dependencyService ? (
                <>
                  <Link2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="text-sm text-gray-900 dark:text-white truncate">
                    {dep.dependencyService.name} (:{dep.dependencyService.port})
                  </span>
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4 text-purple-500 flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <span className="text-sm text-gray-900 dark:text-white">
                      {dep.externalServiceName}
                      {dep.externalServiceType && ` (${dep.externalServiceType})`}
                    </span>
                    {dep.externalServiceUrl && (
                      <a
                        href={dep.externalServiceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-500 hover:text-blue-600 ml-2"
                      >
                        {dep.externalServiceUrl}
                      </a>
                    )}
                  </div>
                </>
              )}
              {dep.description && (
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 truncate">{dep.description}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => removeDependency.mutate(dep.id)}
              disabled={removeDependency.isPending}
              className="ml-2 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors disabled:opacity-50"
              aria-label="Remove dependency"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
        {dependencies.length === 0 && !showAddForm && (
          <p className="text-xs text-gray-500 dark:text-gray-400 py-2">No dependencies added yet.</p>
        )}
      </div>

      {/* Add Dependency Form */}
      {showAddForm && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700/50 space-y-3">
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setDependencyType('internal');
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                dependencyType === 'internal'
                  ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              Internal Service
            </button>
            <button
              type="button"
              onClick={() => {
                resetForm();
                setDependencyType('external');
              }}
              className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                dependencyType === 'external'
                  ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              External Service
            </button>
          </div>

          {dependencyType === 'internal' && (
            <div>
              <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">
                Service *
              </label>
              <select
                value={selectedServiceId}
                onChange={(e) => setSelectedServiceId(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                required
              >
                <option value={0}>Select a service</option>
                {availableServices.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (:{s.port})
                  </option>
                ))}
              </select>
              {availableServices.length === 0 && (
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  No other services available. Create another service first.
                </p>
              )}
            </div>
          )}

          {dependencyType === 'external' && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">
                  Service Name *
                </label>
                <input
                  type="text"
                  value={externalServiceName}
                  onChange={(e) => setExternalServiceName(e.target.value)}
                  placeholder="e.g., OpenAI, AWS S3, Stripe"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">
                  Service Type (Optional)
                </label>
                <input
                  type="text"
                  value={externalServiceType}
                  onChange={(e) => setExternalServiceType(e.target.value)}
                  placeholder="e.g., API, Database, Payment Gateway"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">
                  Service URL (Optional)
                </label>
                <input
                  type="url"
                  value={externalServiceUrl}
                  onChange={(e) => setExternalServiceUrl(e.target.value)}
                  placeholder="https://api.example.com"
                  className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-900 dark:text-white mb-1">
              Description (Optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of how this dependency is used"
              className="w-full px-3 py-2 text-sm bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white border border-gray-200 dark:border-gray-700/50 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={addDependency.isPending}
                className="px-3 py-1.5 text-xs font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors disabled:opacity-50"
              >
                {addDependency.isPending ? 'Adding...' : 'Add'}
              </button>
                        <button
                          type="button"
                          onClick={() => {
                            resetForm();
                            setDependencyType('internal'); // Reset to default when canceling
                            setShowAddForm(false);
                          }}
              disabled={addDependency.isPending}
              className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-lg hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

