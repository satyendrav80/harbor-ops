import { useState, useEffect, useMemo } from 'react';
import { useUsers } from '../hooks/useUsers';
import { useRoles } from '../hooks/useRoles';
import { usePermissions } from '../hooks/usePermissions';
import { useAssignRoleToUser, useRemoveRoleFromUser } from '../hooks/useUserRoles';
import { useApproveUser, useBlockUser, useUnblockUser, useRejectUser } from '../hooks/useUserStatusMutations';
import { useAssignPermissionToRole, useRemovePermissionFromRole } from '../hooks/useRolePermissions';
import { Loading } from '../../../components/common/Loading';
import { EmptyState } from '../../../components/common/EmptyState';
import { useInfiniteScroll } from '../../../components/common/useInfiniteScroll';
import { UserModal } from '../components/UserModal';
import { RoleModal } from '../components/RoleModal';
import { PermissionModal } from '../components/PermissionModal';
import { Users, Shield, Search, Plus, X, Check, AlertCircle, Edit, Key, Ban, CheckCircle, XCircle } from 'lucide-react';
import type { UserWithRoles, RoleWithPermissions, Permission } from '../../../services/users';

/**
 * Debounce hook to delay search input
 */
function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * UsersRolesPage component for managing users and their roles
 */
export function UsersRolesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'permissions'>('users');
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [assigningRole, setAssigningRole] = useState<string | null>(null);
  const [selectedRole, setSelectedRole] = useState<string | null>(null);

  // Modal states
  const [userModalOpen, setUserModalOpen] = useState(false);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserWithRoles | null>(null);
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [selectedRoleForEdit, setSelectedRoleForEdit] = useState<RoleWithPermissions | null>(null);
  const [permissionModalOpen, setPermissionModalOpen] = useState(false);
  const [selectedPermissionForEdit, setSelectedPermissionForEdit] = useState<Permission | null>(null);

  // Debounce search query to avoid too many API calls
  const debouncedSearch = useDebounce(searchQuery, 500);

  const {
    data: usersData,
    isLoading: usersLoading,
    error: usersError,
    fetchNextPage: fetchNextUsersPage,
    hasNextPage: hasNextUsersPage,
    isFetchingNextPage: isFetchingNextUsersPage,
  } = useUsers(debouncedSearch);

  const {
    data: rolesData,
    isLoading: rolesLoading,
    fetchNextPage: fetchNextRolesPage,
    hasNextPage: hasNextRolesPage,
    isFetchingNextPage: isFetchingNextRolesPage,
  } = useRoles(debouncedSearch);

  const { data: permissions } = usePermissions();
  const assignRole = useAssignRoleToUser();
  const removeRole = useRemoveRoleFromUser();
  const approveUser = useApproveUser();
  const blockUser = useBlockUser();
  const unblockUser = useUnblockUser();
  const rejectUser = useRejectUser();
  const assignPermission = useAssignPermissionToRole();
  const removePermission = useRemovePermissionFromRole();

  // Flatten paginated data
  const users = useMemo(() => {
    return usersData?.pages.flatMap((page) => page.data) ?? [];
  }, [usersData]);

  const roles = useMemo(() => {
    return rolesData?.pages.flatMap((page) => page.data) ?? [];
  }, [rolesData]);

  // Infinite scroll observer for users
  const usersObserverTarget = useInfiniteScroll({
    hasNextPage: hasNextUsersPage ?? false,
    isFetchingNextPage: isFetchingNextUsersPage,
    fetchNextPage: fetchNextUsersPage,
  });

  // Infinite scroll observer for roles
  const rolesObserverTarget = useInfiniteScroll({
    hasNextPage: hasNextRolesPage ?? false,
    isFetchingNextPage: isFetchingNextRolesPage,
    fetchNextPage: fetchNextRolesPage,
  });

  const handleAssignRole = async (userId: string, roleId: string) => {
    setAssigningRole(`${userId}-${roleId}`);
    try {
      await assignRole.mutateAsync({ userId, roleId });
    } finally {
      setAssigningRole(null);
    }
  };

  const handleRemoveRole = async (userId: string, roleId: string) => {
    setAssigningRole(`${userId}-${roleId}`);
    try {
      await removeRole.mutateAsync({ userId, roleId });
    } finally {
      setAssigningRole(null);
    }
  };

  const handleCreateUser = () => {
    setSelectedUserForEdit(null);
    setUserModalOpen(true);
  };

  const handleEditUser = (user: UserWithRoles) => {
    setSelectedUserForEdit(user);
    setUserModalOpen(true);
  };

  const handleCreateRole = () => {
    setSelectedRoleForEdit(null);
    setRoleModalOpen(true);
  };

  const handleEditRole = (role: RoleWithPermissions) => {
    setSelectedRoleForEdit(role);
    setRoleModalOpen(true);
  };

  const handleCreatePermission = () => {
    setSelectedPermissionForEdit(null);
    setPermissionModalOpen(true);
  };

  const handleEditPermission = (permission: Permission) => {
    setSelectedPermissionForEdit(permission);
    setPermissionModalOpen(true);
  };

  const handleApproveUser = async (userId: string) => {
    try {
      await approveUser.mutateAsync(userId);
    } catch (error) {
      // Error handling is done by React Query
    }
  };

  const handleBlockUser = async (userId: string) => {
    try {
      await blockUser.mutateAsync(userId);
    } catch (error) {
      // Error handling is done by React Query
    }
  };

  const handleUnblockUser = async (userId: string) => {
    try {
      await unblockUser.mutateAsync(userId);
    } catch (error) {
      // Error handling is done by React Query
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (window.confirm('Are you sure you want to reject this user? This will permanently delete their account.')) {
      try {
        await rejectUser.mutateAsync(userId);
      } catch (error) {
        // Error handling is done by React Query
      }
    }
  };

  const handleAssignPermission = async (roleId: string, permissionId: string) => {
    try {
      await assignPermission.mutateAsync({ roleId, permissionId });
    } catch (error) {
      // Error handling is done by React Query
    }
  };

  const handleRemovePermission = async (roleId: string, permissionId: string) => {
    try {
      await removePermission.mutateAsync({ roleId, permissionId });
    } catch (error) {
      // Error handling is done by React Query
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div className="flex flex-col">
          <h1 className="text-gray-900 dark:text-white text-3xl font-bold leading-tight">Users & Roles</h1>
          <p className="text-gray-500 dark:text-gray-400 text-base font-normal leading-normal mt-1">
            Manage user accounts and role assignments
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
                placeholder="Search users or roles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </label>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 dark:border-gray-700/50">
        <button
          onClick={() => setActiveTab('users')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'users'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Users
            {usersData?.pages[0]?.pagination.total !== undefined && (
              <span className="text-xs text-gray-400 dark:text-gray-500">({usersData.pages[0].pagination.total})</span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('roles')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'roles'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4" />
            Roles
            {rolesData?.pages[0]?.pagination.total !== undefined && (
              <span className="text-xs text-gray-400 dark:text-gray-500">({rolesData.pages[0].pagination.total})</span>
            )}
          </div>
        </button>
        <button
          onClick={() => setActiveTab('permissions')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === 'permissions'
              ? 'text-primary border-b-2 border-primary'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4" />
            Permissions
            {permissions && <span className="text-xs text-gray-400 dark:text-gray-500">({permissions.length})</span>}
          </div>
        </button>
      </div>

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700/50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Users</h2>
            <button
              onClick={handleCreateUser}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <Plus className="w-4 h-4" />
              Create User
            </button>
          </div>
          {usersLoading && users.length === 0 ? (
            <div className="p-6">
              <Loading className="h-64" />
            </div>
          ) : usersError ? (
            <div className="p-6">
              <EmptyState
                icon={AlertCircle}
                title="Failed to load users"
                description="Unable to fetch users. Please try again later."
              />
            </div>
          ) : users.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={Users} title="No users found" description="No users match your search criteria." />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-[#151B24] border-b border-gray-200 dark:border-gray-700/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Roles</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700/50">
                  {users.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      roles={roles}
                      onAssignRole={handleAssignRole}
                      onRemoveRole={handleRemoveRole}
                      onEditUser={handleEditUser}
                      onApprove={handleApproveUser}
                      onBlock={handleBlockUser}
                      onUnblock={handleUnblockUser}
                      onReject={handleRejectUser}
                      approvingUser={approveUser.isPending}
                      blockingUser={blockUser.isPending}
                      unblockingUser={unblockUser.isPending}
                      rejectingUser={rejectUser.isPending}
                      assigningRole={assigningRole}
                      selectedUser={selectedUser}
                      setSelectedUser={setSelectedUser}
                    />
                  ))}
                </tbody>
              </table>
              {/* Infinite scroll trigger */}
              <div ref={usersObserverTarget} className="h-4" />
              {isFetchingNextUsersPage && (
                <div className="p-4 text-center">
                  <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Roles Tab */}
      {activeTab === 'roles' && (
        <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700/50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Roles</h2>
            <button
              onClick={handleCreateRole}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <Plus className="w-4 h-4" />
              Create Role
            </button>
          </div>
          {rolesLoading && roles.length === 0 ? (
            <div className="p-6">
              <Loading className="h-64" />
            </div>
          ) : roles.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={Shield} title="No roles found" description="No roles match your search criteria." />
            </div>
          ) : (
            <div className="p-6 space-y-4">
              {roles.map((role) => (
                <RoleCard 
                  key={role.id} 
                  role={role} 
                  onEdit={handleEditRole}
                  permissions={permissions || []}
                  onAssignPermission={handleAssignPermission}
                  onRemovePermission={handleRemovePermission}
                  isExpanded={selectedRole === role.id}
                  onToggleExpand={() => setSelectedRole(selectedRole === role.id ? null : role.id)}
                  assigningPermission={assignPermission.isPending}
                  removingPermission={removePermission.isPending}
                />
              ))}
              {/* Infinite scroll trigger */}
              <div ref={rolesObserverTarget} className="h-4" />
              {isFetchingNextRolesPage && (
                <div className="p-4 text-center">
                  <div className="inline-block w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 rounded-xl overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700/50 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Permissions</h2>
            <button
              onClick={handleCreatePermission}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50"
            >
              <Plus className="w-4 h-4" />
              Create Permission
            </button>
          </div>
          {!permissions ? (
            <div className="p-6">
              <Loading className="h-64" />
            </div>
          ) : permissions.length === 0 ? (
            <div className="p-6">
              <EmptyState icon={Key} title="No permissions found" description="Create your first permission to get started." />
            </div>
          ) : (
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {permissions.map((permission) => (
                  <div
                    key={permission.id}
                    className="border border-gray-200 dark:border-gray-700/50 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-[#151B24] transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">{permission.name}</h3>
                      </div>
                      <button
                        onClick={() => handleEditPermission(permission)}
                        className="text-gray-400 dark:text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 rounded p-1"
                        aria-label="Edit permission"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <UserModal
        isOpen={userModalOpen}
        onClose={() => {
          setUserModalOpen(false);
          setSelectedUserForEdit(null);
        }}
        user={selectedUserForEdit}
      />
      <RoleModal
        isOpen={roleModalOpen}
        onClose={() => {
          setRoleModalOpen(false);
          setSelectedRoleForEdit(null);
        }}
        role={selectedRoleForEdit}
      />
      <PermissionModal
        isOpen={permissionModalOpen}
        onClose={() => {
          setPermissionModalOpen(false);
          setSelectedPermissionForEdit(null);
        }}
        permission={selectedPermissionForEdit}
      />
    </div>
  );
}

type UserRowProps = {
  user: UserWithRoles;
  roles: RoleWithPermissions[];
  onAssignRole: (userId: string, roleId: string) => Promise<void>;
  onRemoveRole: (userId: string, roleId: string) => Promise<void>;
  onEditUser: (user: UserWithRoles) => void;
  onApprove: (userId: string) => Promise<void>;
  onBlock: (userId: string) => Promise<void>;
  onUnblock: (userId: string) => Promise<void>;
  onReject: (userId: string) => Promise<void>;
  approvingUser: boolean;
  blockingUser: boolean;
  unblockingUser: boolean;
  rejectingUser: boolean;
  assigningRole: string | null;
  selectedUser: string | null;
  setSelectedUser: (userId: string | null) => void;
};

function UserRow({ 
  user, 
  roles, 
  onAssignRole, 
  onRemoveRole, 
  onEditUser, 
  onApprove,
  onBlock,
  onUnblock,
  onReject,
  approvingUser,
  blockingUser,
  unblockingUser,
  rejectingUser,
  assigningRole, 
  selectedUser, 
  setSelectedUser 
}: UserRowProps) {
  const userRoles = user.roles.map((ur) => ur.role.id);
  const availableRoles = roles.filter((role) => !userRoles.includes(role.id));
  const isExpanded = selectedUser === user.id;

  const getStatusBadge = () => {
    switch (user.status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400">
            <AlertCircle className="w-3 h-3" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
            <CheckCircle className="w-3 h-3" />
            Approved
          </span>
        );
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400">
            <Ban className="w-3 h-3" />
            Blocked
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <>
      <tr className="hover:bg-gray-50 dark:hover:bg-[#151B24] transition-colors">
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center gap-3">
            <div className="bg-primary text-white rounded-full size-10 flex items-center justify-center">
              {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-medium text-gray-900 dark:text-white">{user.name || user.email}</span>
              <span className="text-xs text-gray-500 dark:text-gray-400">{user.email}</span>
              {user.username && user.username !== user.email.split('@')[0] && (
                <span className="text-xs text-gray-400 dark:text-gray-500">@{user.username}</span>
              )}
            </div>
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          {getStatusBadge()}
        </td>
        <td className="px-6 py-4">
          <div className="flex flex-wrap gap-2">
            {user.roles.length === 0 ? (
              <span className="text-xs text-gray-400 dark:text-gray-500">No roles assigned</span>
            ) : (
              user.roles.map((ur) => (
                <span
                  key={ur.role.id}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-primary/10 dark:bg-primary/20 text-primary"
                >
                  {ur.role.name}
                  <button
                    onClick={() => onRemoveRole(user.id, ur.role.id)}
                    disabled={assigningRole === `${user.id}-${ur.role.id}`}
                    className="hover:text-red-500 focus:outline-none disabled:opacity-50"
                    aria-label={`Remove ${ur.role.name} role`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))
            )}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEditUser(user)}
              className="text-sm text-primary hover:text-primary/80 font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 rounded px-2 py-1"
              aria-label="Edit user"
            >
              <Edit className="w-4 h-4" />
            </button>
            {user.status === 'pending' && (
              <>
                <button
                  onClick={() => onApprove(user.id)}
                  disabled={approvingUser}
                  className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium focus:outline-none focus:ring-2 focus:ring-green-500/50 rounded px-2 py-1 disabled:opacity-50"
                  aria-label="Approve user"
                  title="Approve user"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onReject(user.id)}
                  disabled={rejectingUser}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium focus:outline-none focus:ring-2 focus:ring-red-500/50 rounded px-2 py-1 disabled:opacity-50"
                  aria-label="Reject user"
                  title="Reject user"
                >
                  <XCircle className="w-4 h-4" />
                </button>
              </>
            )}
            {user.status === 'approved' && (
              <button
                onClick={() => onBlock(user.id)}
                disabled={blockingUser}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium focus:outline-none focus:ring-2 focus:ring-red-500/50 rounded px-2 py-1 disabled:opacity-50"
                aria-label="Block user"
                title="Block user"
              >
                <Ban className="w-4 h-4" />
              </button>
            )}
            {user.status === 'blocked' && (
              <button
                onClick={() => onUnblock(user.id)}
                disabled={unblockingUser}
                className="text-sm text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 font-medium focus:outline-none focus:ring-2 focus:ring-green-500/50 rounded px-2 py-1 disabled:opacity-50"
                aria-label="Unblock user"
                title="Unblock user"
              >
                <CheckCircle className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => setSelectedUser(isExpanded ? null : user.id)}
              className="text-sm text-primary hover:text-primary/80 font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 rounded px-2 py-1"
            >
              {isExpanded ? 'Hide' : 'Assign Role'}
            </button>
          </div>
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={4} className="px-6 py-4 bg-gray-50 dark:bg-[#151B24]">
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Assign Role:</p>
              {availableRoles.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">All roles are already assigned</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableRoles.map((role) => (
                    <button
                      key={role.id}
                      onClick={() => onAssignRole(user.id, role.id)}
                      disabled={assigningRole === `${user.id}-${role.id}`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-white dark:bg-[#1C252E] border border-gray-300 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#151B24] focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Plus className="w-4 h-4" />
                      {role.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

type RoleCardProps = {
  role: RoleWithPermissions;
  permissions: Permission[];
  onEdit: (role: RoleWithPermissions) => void;
  onAssignPermission: (roleId: string, permissionId: string) => Promise<void>;
  onRemovePermission: (roleId: string, permissionId: string) => Promise<void>;
  isExpanded: boolean;
  onToggleExpand: () => void;
  assigningPermission: boolean;
  removingPermission: boolean;
};

function RoleCard({ 
  role, 
  onEdit, 
  permissions, 
  onAssignPermission, 
  onRemovePermission,
  isExpanded,
  onToggleExpand,
  assigningPermission,
  removingPermission,
}: RoleCardProps) {
  const rolePermissionIds = role.permissions.map((rp) => rp.permission.id);
  const availablePermissions = permissions.filter((p) => !rolePermissionIds.includes(p.id));

  return (
    <div className="border border-gray-200 dark:border-gray-700/50 rounded-lg p-4">
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">{role.name}</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            {role.users.length} user{role.users.length !== 1 ? 's' : ''} assigned · {role.permissions.length} permission{role.permissions.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onToggleExpand}
            className="text-sm text-primary hover:text-primary/80 font-medium focus:outline-none focus:ring-2 focus:ring-primary/50 rounded px-2 py-1"
          >
            {isExpanded ? 'Hide' : 'Manage Permissions'}
          </button>
          <button
            onClick={() => onEdit(role)}
            className="text-gray-400 dark:text-gray-500 hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/50 rounded p-1"
            aria-label="Edit role"
          >
            <Edit className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="space-y-2">
        <div>
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Permissions:</p>
          {role.permissions.length === 0 ? (
            <p className="text-xs text-gray-400 dark:text-gray-500">No permissions assigned</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {role.permissions.map((rp) => (
                <span
                  key={rp.permission.id}
                  className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-md bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                >
                  <Check className="w-3 h-3" />
                  {rp.permission.name}
                  <button
                    onClick={() => onRemovePermission(role.id, rp.permission.id)}
                    disabled={removingPermission}
                    className="hover:text-red-500 focus:outline-none disabled:opacity-50"
                    aria-label={`Remove ${rp.permission.name} permission`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/50">
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Available Permissions:</p>
            {availablePermissions.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500">All permissions are already assigned</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {availablePermissions.map((permission) => (
                  <button
                    key={permission.id}
                    onClick={() => onAssignPermission(role.id, permission.id)}
                    disabled={assigningPermission}
                    className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md bg-white dark:bg-[#1C252E] border border-gray-300 dark:border-gray-700/50 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#151B24] focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="w-4 h-4" />
                    {permission.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
        {role.users.length > 0 && (
          <div>
            <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Assigned to:</p>
            <div className="flex flex-wrap gap-2">
              {role.users.map((ur) => (
                <span
                  key={ur.user.id}
                  className="inline-flex items-center px-2 py-1 text-xs font-medium rounded-md bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300"
                >
                  {ur.user.name || ur.user.email}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
