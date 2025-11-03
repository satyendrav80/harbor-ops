import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../auth/context/AuthContext';
import { useGroups, useGroup } from '../hooks/useGroups';
import { useRemoveItemFromGroup } from '../hooks/useGroupMutations';
import { Loading } from '../../../components/common/Loading';
import { EmptyState } from '../../../components/common/EmptyState';
import { GroupModal } from '../components/GroupModal';
import { GroupItemModal } from '../components/GroupItemModal';
import { Search, Plus, Edit, Server, Cloud, X, FolderOpen, ChevronDown, ChevronRight } from 'lucide-react';
import type { Group } from '../../../services/groups';

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
 * GroupsPage component for managing groups and their items
 */
export function GroupsPage() {
  const { hasPermission } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [selectedGroupForEdit, setSelectedGroupForEdit] = useState<Group | null>(null);
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [selectedGroupForItem, setSelectedGroupForItem] = useState<number | null>(null);

  // Memoize search handler to prevent input from losing focus
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // Debounce search query
  const debouncedSearch = useDebounce(searchQuery, 500);

  // Fetch groups
  const { data: groupsData, isLoading: groupsLoading, error: groupsError } = useGroups({
    search: debouncedSearch,
    limit: 100,
  });

  // Fetch selected group details
  const { data: selectedGroupData } = useGroup(selectedGroup || 0);

  const removeItem = useRemoveItemFromGroup();

  // Get groups list
  // Keep previous data during refetches to prevent flicker
  const previousDataRef = useRef<Group[]>([]);
  
  // Use previous data if current data is undefined (during refetch)
  const groups = useMemo(() => {
    if (!groupsData?.data) {
      // During refetch, return previous data to prevent flicker
      return previousDataRef.current;
    }
    // Update ref with new data
    previousDataRef.current = groupsData.data;
    return groupsData.data;
  }, [groupsData]);

  // Get existing item IDs for the selected group (to filter in modal)
  const existingItemIds = useMemo(() => {
    if (!selectedGroupData?.items) return [];
    return selectedGroupData.items.map((item) => ({
      itemType: item.itemType,
      itemId: item.itemId,
    }));
  }, [selectedGroupData]);

  const toggleGroupExpand = (groupId: number) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
      if (selectedGroup === groupId) {
        setSelectedGroup(null);
      }
    } else {
      newExpanded.add(groupId);
      setSelectedGroup(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const handleCreateGroup = () => {
    setSelectedGroupForEdit(null);
    setGroupModalOpen(true);
  };

  const handleEditGroup = (group: Group) => {
    setSelectedGroupForEdit(group);
    setGroupModalOpen(true);
  };

  const handleAddItem = (groupId: number) => {
    setSelectedGroupForItem(groupId);
    setItemModalOpen(true);
  };

  const handleRemoveItem = async (groupId: number, itemId: number) => {
    try {
      await removeItem.mutateAsync({ groupId, itemId });
    } catch (err) {
      // Error handled by global error handler
    }
  };

  if (groupsLoading) {
    return (
      <div className="max-w-7xl mx-auto">
        <Loading />
      </div>
    );
  }

  if (groupsError) {
    return (
      <div className="max-w-7xl mx-auto">
        <EmptyState
          icon={FolderOpen}
          title="Failed to load groups"
          description="Unable to fetch groups. Please try again later."
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex flex-col">
          <p className="text-gray-900 dark:text-white text-3xl font-bold leading-tight">Groups</p>
          <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal">
            Organize servers and services into groups for easier management.
          </p>
        </div>
        <div className="flex items-center gap-4 flex-1 justify-end min-w-[300px]">
          <label className="flex flex-col h-12 w-full max-w-sm">
            <div className="flex w-full flex-1 items-stretch rounded-lg h-full">
              <div className="text-gray-400 dark:text-gray-500 flex bg-white dark:bg-[#1C252E] items-center justify-center pl-4 rounded-l-lg border border-gray-200 dark:border-gray-700/50 border-r-0">
                <Search className="w-5 h-5" />
              </div>
              <input
                key="group-search-input"
                className="form-input flex w-full min-w-0 flex-1 resize-none overflow-hidden rounded-r-lg text-gray-900 dark:text-white focus:outline-0 focus:ring-2 focus:ring-primary/50 border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1C252E] h-full placeholder:text-gray-400 dark:placeholder:text-gray-500 px-4 text-sm font-normal leading-normal"
                placeholder="Search groups..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
          </label>
          {hasPermission('groups:create') && (
            <button
              onClick={handleCreateGroup}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <Plus className="w-4 h-4" />
              Create Group
            </button>
          )}
        </div>
      </header>

      {/* Groups List */}
      {groups.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title={searchQuery ? 'No groups found' : 'No groups yet'}
          description={
            searchQuery
              ? 'Try adjusting your search query.'
              : 'Create your first group to organize servers and services.'
          }
          action={
            hasPermission('groups:create') && !searchQuery ? (
              <button
                onClick={handleCreateGroup}
                className="px-4 py-2 text-sm font-medium text-white bg-primary hover:bg-primary/90 rounded-lg transition-colors"
              >
                Create Group
              </button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-4">
          {groups.map((group) => {
            const isExpanded = expandedGroups.has(group.id);
            const itemCount = group._count?.items || group.items?.length || 0;
            const currentGroup = selectedGroup === group.id ? selectedGroupData : null;
            const items = currentGroup?.items || [];

            return (
              <div
                key={group.id}
                className="rounded-xl bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 overflow-hidden"
              >
                {/* Group Header */}
                <div className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <button
                        onClick={() => toggleGroupExpand(group.id)}
                        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-5 h-5" />
                        ) : (
                          <ChevronRight className="w-5 h-5" />
                        )}
                      </button>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{group.name}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          {itemCount} {itemCount === 1 ? 'item' : 'items'}
                        </p>
                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <p>Created {new Date(group.createdAt).toLocaleString()}</p>
                          {group.createdByUser && (
                            <p className="text-gray-400 dark:text-gray-500">by {group.createdByUser.name || group.createdByUser.email}</p>
                          )}
                          {group.updatedAt && (
                            <>
                              <p className="mt-1">Updated {new Date(group.updatedAt).toLocaleString()}</p>
                              {group.updatedByUser && (
                                <p className="text-gray-400 dark:text-gray-500">by {group.updatedByUser.name || group.updatedByUser.email}</p>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {hasPermission('groups:update') && (
                        <>
                          <button
                            onClick={() => handleAddItem(group.id)}
                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 rounded-lg transition-colors"
                            title="Add item"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEditGroup(group)}
                            className="p-2 text-gray-500 dark:text-gray-400 hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/20 rounded-lg transition-colors"
                            title="Edit group"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Items List */}
                {isExpanded && (
                  <div className="border-t border-gray-200 dark:border-gray-700/50 p-6 bg-gray-50/50 dark:bg-white/5">
                    {items.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          No items in this group. Add servers or services to get started.
                        </p>
                        {hasPermission('groups:update') && (
                          <button
                            onClick={() => handleAddItem(group.id)}
                            className="mt-4 px-4 py-2 text-sm font-medium text-primary hover:bg-primary/10 dark:hover:bg-primary/20 rounded-lg transition-colors"
                          >
                            Add Item
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {items.map((item) => (
                          <div
                            key={item.id}
                            className="flex items-center justify-between p-4 rounded-lg bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50"
                          >
                            <div className="flex items-center gap-3 flex-1">
                              {item.itemType === 'server' ? (
                                <Server className="w-5 h-5 text-blue-500" />
                              ) : (
                                <Cloud className="w-5 h-5 text-green-500" />
                              )}
                              <div className="flex-1">
                                <p className="text-sm font-medium text-gray-900 dark:text-white">
                                  {item.itemType === 'server'
                                    ? item.server?.name || `Server #${item.itemId}`
                                    : item.service?.name || `Service #${item.itemId}`}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                  {item.itemType === 'server'
                                    ? item.server
                                      ? `${item.server.publicIp} • ${item.server.privateIp}`
                                      : 'Server details unavailable'
                                    : item.service
                                      ? `Port ${item.service.port} • ${item.service.servers && item.service.servers.length > 0 
                                          ? item.service.servers.map((ss) => ss.server.name).join(', ')
                                          : 'No servers'}`
                                      : 'Service details unavailable'}
                                </p>
                              </div>
                            </div>
                            {hasPermission('groups:update') && (
                              <button
                                onClick={() => handleRemoveItem(group.id, item.id)}
                                className="p-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Remove item"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Group Modal */}
      <GroupModal
        isOpen={groupModalOpen}
        onClose={() => {
          setGroupModalOpen(false);
          setSelectedGroupForEdit(null);
        }}
        group={selectedGroupForEdit}
      />

      {/* Add Item Modal */}
      <GroupItemModal
        isOpen={itemModalOpen}
        onClose={() => {
          setItemModalOpen(false);
          setSelectedGroupForItem(null);
        }}
        groupId={selectedGroupForItem || 0}
        existingItemIds={selectedGroupForItem === selectedGroup ? existingItemIds : []}
      />
    </div>
  );
}

