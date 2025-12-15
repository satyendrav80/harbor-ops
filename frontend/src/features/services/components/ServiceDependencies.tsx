import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getService, addServiceDependency, removeServiceDependency, type ServiceDependency } from '../../../services/services';
import { getServices } from '../../../services/services';
import { Plus, Trash2, Link2 } from 'lucide-react';
import { useAuth } from '../../auth/context/AuthContext';

type ServiceDependencyInput = {
  dependencyServiceId: number;
  description?: string;
};

type ServiceDependenciesProps = {
  serviceId: number | null; // Allow null for creation mode
  dependencies?: ServiceDependency[];
  // Controlled mode: manage dependencies locally without immediate saves
  controlled?: boolean;
  localDependencies?: ServiceDependencyInput[];
  onDependenciesChange?: (dependencies: ServiceDependencyInput[]) => void;
  onServiceClick?: (serviceId: number) => void;
};

export function ServiceDependencies({ 
  serviceId, 
  dependencies: initialDependencies,
  controlled = false,
  localDependencies = [],
  onDependenciesChange,
  onServiceClick,
}: ServiceDependenciesProps) {
  const { hasPermission } = useAuth();
  const queryClient = useQueryClient();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedServiceId, setSelectedServiceId] = useState<number>(0);
  const [description, setDescription] = useState('');

  // Fetch current service to get latest dependencies (only if serviceId is provided and not in controlled mode)
  const { data: service } = useQuery({
    queryKey: ['services', serviceId],
    queryFn: () => serviceId ? getService(serviceId) : null,
    enabled: !!serviceId && !controlled,
  });

  // Fetch all services for dependency selection
  // Enable when: form is open OR when in controlled mode with dependencies (to ensure names are available)
  const { data: servicesData } = useQuery({
    queryKey: ['services', 'all', 'dependencies'],
    queryFn: async () => {
      const response = await getServices(1, 1000);
      return response.data; // Return just the array of services
    },
    staleTime: 5 * 60 * 1000,
    enabled: showAddForm || (controlled && localDependencies.length > 0), // Fetch when form is open OR when controlled mode has dependencies
  });

  // Build a lookup map for dependency service info
  // Priority: 1) initialDependencies (already has names from backend), 2) servicesData
  const dependencyServiceMap = new Map<number, { id: number; name: string; port: number; external?: boolean }>();
  
  // First, populate from initialDependencies (these already have dependencyService populated from backend)
  if (initialDependencies) {
    initialDependencies.forEach((dep) => {
      if (dep.dependencyServiceId && dep.dependencyService) {
        dependencyServiceMap.set(dep.dependencyServiceId, dep.dependencyService);
      }
    });
  }
  
  // Then, supplement with servicesData (for newly added dependencies or if initialDependencies is missing data)
  if (servicesData) {
    servicesData.forEach((s) => {
      if (!dependencyServiceMap.has(s.id)) {
        dependencyServiceMap.set(s.id, {
          id: s.id,
          name: s.name,
          port: s.port,
          external: s.external,
        });
      }
    });
  }

  // Use local dependencies in controlled mode, otherwise use service dependencies
  const dependencies = controlled 
    ? localDependencies.map((dep, index) => {
        // Look up dependencyService from our map
        const dependencyService = dep.dependencyServiceId 
          ? dependencyServiceMap.get(dep.dependencyServiceId) || null
          : null;
        
        return {
          id: -(index + 1), // Temporary negative IDs for local dependencies
          serviceId: serviceId || 0,
          dependencyServiceId: dep.dependencyServiceId,
          description: dep.description || null,
          dependencyService,
          createdAt: new Date().toISOString(),
        };
      })
    : (service?.dependencies || initialDependencies || []);

  const addDependency = useMutation({
    mutationFn: (data: {
      dependencyServiceId: number;
      description?: string;
    }) => {
      if (!serviceId) {
        throw new Error('Service ID is required to add dependencies');
      }
      return addServiceDependency(serviceId, data);
    },
    onSuccess: () => {
      if (serviceId) {
        queryClient.invalidateQueries({ queryKey: ['services', serviceId] });
      }
      resetForm();
      setShowAddForm(false);
    },
  });

  const removeDependency = useMutation({
    mutationFn: (dependencyId: number) => {
      if (!serviceId) {
        throw new Error('Service ID is required to remove dependencies');
      }
      return removeServiceDependency(serviceId, dependencyId);
    },
    onSuccess: () => {
      if (serviceId) {
        queryClient.invalidateQueries({ queryKey: ['services', serviceId] });
      }
    },
  });
  
  // Handle controlled mode: add/remove dependencies locally
  const handleAddLocalDependency = () => {
    if (!selectedServiceId || !onDependenciesChange) return;
    
    // Check if already added
    if (localDependencies.some(dep => dep.dependencyServiceId === selectedServiceId)) {
      return;
    }
    
    const newDependencies = [
      ...localDependencies,
      {
        dependencyServiceId: selectedServiceId,
        description: description || undefined,
      },
    ];
    
    onDependenciesChange(newDependencies);
    resetForm();
    setShowAddForm(false);
  };
  
  const handleRemoveLocalDependency = (dependencyServiceId: number) => {
    if (!onDependenciesChange) return;
    
    const newDependencies = localDependencies.filter(
      dep => dep.dependencyServiceId !== dependencyServiceId
    );
    
    onDependenciesChange(newDependencies);
  };

  const resetForm = () => {
    setSelectedServiceId(0);
    setDescription('');
  };

  const handleSubmit = () => {
    if (!selectedServiceId) {
      return;
    }
    
    if (controlled && onDependenciesChange) {
      handleAddLocalDependency();
    } else {
      addDependency.mutate({
        dependencyServiceId: selectedServiceId,
        description: description || undefined,
      });
    }
  };

  // Filter out current service from available services (if serviceId is provided)
  // In controlled mode, also filter out already selected dependencies
  const availableServices = (servicesData || []).filter((s) => {
    if (serviceId && s.id === serviceId) return false;
    if (controlled && localDependencies.some(dep => dep.dependencyServiceId === s.id)) return false;
    return true;
  });

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
                    {onServiceClick ? (
                      <button
                        onClick={() => onServiceClick(dep.dependencyService!.id)}
                        className="text-sm text-gray-900 dark:text-white hover:text-primary transition-colors text-left"
                      >
                        {dep.dependencyService.name} (:{dep.dependencyService.port})
                        {dep.dependencyService.external && (
                          <span className="ml-2 text-xs text-purple-500">[External]</span>
                        )}
                      </button>
                    ) : (
                    <span className="text-sm text-gray-900 dark:text-white">
                      {dep.dependencyService.name} (:{dep.dependencyService.port})
                      {dep.dependencyService.external && (
                        <span className="ml-2 text-xs text-purple-500">[External]</span>
                      )}
                    </span>
                    )}
                  </>
                ) : dep.dependencyServiceId ? (
                  // Fallback: show service ID if name is not available yet
                  <>
                    <Link2 className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-gray-500 dark:text-gray-400 italic">
                      Service #{dep.dependencyServiceId} (loading...)
                    </span>
                  </>
                ) : null}
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
              ) : dep.dependencyServiceId ? (
                // Fallback: show service ID if name is not available yet
                <>
                  <Link2 className="w-4 h-4 text-blue-500 flex-shrink-0" />
                  <span className="text-sm text-gray-500 dark:text-gray-400 italic truncate">
                    Service #{dep.dependencyServiceId} (loading...)
                  </span>
                </>
              ) : null}
              {dep.description && (
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-2 truncate">{dep.description}</span>
              )}
            </div>
            <button
              type="button"
              onClick={() => {
                if (controlled && onDependenciesChange && dep.dependencyServiceId) {
                  handleRemoveLocalDependency(dep.dependencyServiceId);
                } else {
                  removeDependency.mutate(dep.id);
                }
              }}
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
                  {s.external ? ' [External]' : ''}
                </option>
              ))}
            </select>
            {availableServices.length === 0 && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                No other services available. Create another service first.
              </p>
            )}
          </div>

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
