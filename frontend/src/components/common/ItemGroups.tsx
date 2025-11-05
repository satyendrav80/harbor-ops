import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getGroupsByItem } from '../../services/groups';
import { useAuth } from '../../features/auth/context/AuthContext';

type ItemGroupsProps = {
  itemType: 'server' | 'service' | 'credential' | 'domain' | 'user';
  itemId: number | string;
  groupsMap: Map<number, string>;
};

export function ItemGroups({ itemType, itemId, groupsMap }: ItemGroupsProps) {
  const { hasPermission } = useAuth();
  const navigate = useNavigate();
  
  // All item types are now supported
  const supportedTypes = ['server', 'service', 'credential', 'domain', 'user'];
  const isSupported = supportedTypes.includes(itemType);
  
  const { data: groupIds } = useQuery({
    queryKey: ['groups', itemType, itemId],
    queryFn: () => {
      // Now supports all item types including credential, domain, and user
      return getGroupsByItem(itemType as 'server' | 'service' | 'credential' | 'domain' | 'user', itemId);
    },
    enabled: hasPermission('groups:view') && !!itemId && isSupported,
    staleTime: 5 * 60 * 1000,
  });

  if (!isSupported || !groupIds || groupIds.length === 0) {
    return null;
  }

  const groupNames = groupIds
    .map((id) => groupsMap.get(id))
    .filter((name): name is string => !!name);

  if (groupNames.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Groups</p>
      <div className="flex flex-wrap gap-2">
        {groupNames.map((name, index) => {
          const groupId = groupIds.find((id) => groupsMap.get(id) === name);
          return (
            <button
              key={groupId || index}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                navigate(`/groups?groupId=${groupId}`);
              }}
              className="inline-flex items-center rounded-md bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-2 py-1 text-xs font-medium hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors cursor-pointer"
              title={`Click to view group ${name}`}
            >
              {name}
            </button>
          );
        })}
      </div>
    </div>
  );
}

