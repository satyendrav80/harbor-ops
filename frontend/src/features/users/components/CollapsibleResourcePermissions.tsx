import { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Edit, X } from 'lucide-react';
import type { Permission } from '../../../services/users';

type PermissionItem = {
  permission: Permission;
};

type CollapsibleResourcePermissionsProps = {
  permissions: Permission[] | PermissionItem[];
  /**
   * Render function for each permission item
   * Receives the permission and should return a React node
   */
  renderPermission: (permission: Permission, index: number) => React.ReactNode;
  /**
   * Optional: Extract resource from permission (default: permission.resource)
   */
  getResource?: (permission: Permission) => string;
  /**
   * Optional: Class name for the container
   */
  className?: string;
};

/**
 * Reusable component for displaying permissions grouped by resource in collapsible sections
 * Used in both PermissionTable and Role Permissions display
 */
export function CollapsibleResourcePermissions({
  permissions,
  renderPermission,
  getResource,
  className = '',
}: CollapsibleResourcePermissionsProps) {
  const [expandedResources, setExpandedResources] = useState<Set<string>>(new Set());

  const toggleResource = (resource: string) => {
    const newExpanded = new Set(expandedResources);
    if (newExpanded.has(resource)) {
      newExpanded.delete(resource);
    } else {
      newExpanded.add(resource);
    }
    setExpandedResources(newExpanded);
  };

  const extractPermission = (item: Permission | PermissionItem): Permission => {
    return 'permission' in item ? item.permission : item;
  };

  const getResourceName = (permission: Permission): string | null => {
    if (getResource) {
      return getResource(permission);
    }
    let res = permission.resource;
    // If resource is 'general' or missing, try to extract from permission name
    if (!res || res === 'general') {
      const permissionName = permission.name || '';
      if (permissionName.includes(':')) {
        res = permissionName.split(':')[0];
      } else {
        return null;
      }
    }
    return res;
  };

  const groupedPermissions = useMemo(() => {
    return permissions.reduce<Record<string, Permission[]>>((acc, item) => {
      const permission = extractPermission(item);
      const res = getResourceName(permission);
      
      // Skip if we still don't have a valid resource (skip 'general' or null)
      if (!res || res === 'general') return acc;
      
      if (!acc[res]) acc[res] = [];
      acc[res].push(permission);
      return acc;
    }, {});
  }, [permissions, getResource]);

  if (Object.keys(groupedPermissions).length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${className}`}>
      {Object.entries(groupedPermissions).map(([resource, perms]) => {
        const isExpanded = expandedResources.has(resource);
        return (
          <div key={resource} className="border border-gray-200 dark:border-gray-700/50 rounded-lg overflow-hidden">
            <button
              onClick={() => toggleResource(resource)}
              className="w-full px-4 py-2 border-b border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#151B24] flex items-center justify-between hover:bg-gray-100 dark:hover:bg-[#1C252E] transition-colors"
            >
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{resource}</h3>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">({perms.length})</span>
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                )}
              </div>
            </button>
            {isExpanded && (
              <div className="p-4 flex flex-wrap gap-2">
                {perms.map((permission, index) => (
                  <div key={permission.id}>
                    {renderPermission(permission, index)}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

