import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Modal } from '../../../components/common/Modal';
import { ConfirmationDialog } from '../../../components/common/ConfirmationDialog';
import { useCreateUser, useUpdateUser, useDeleteUser } from '../hooks/useUserMutations';
import { Eye, EyeOff, Trash2 } from 'lucide-react';
import type { UserWithRoles } from '../../../services/users';

const userSchema = z.object({
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  // Allow empty string on edit; creation is enforced at submit time
  password: z.union([z.string().min(8, 'Password must be at least 8 characters'), z.literal('')]).optional(),
  name: z.string().optional(),
  username: z
    .string()
    .refine(
      (val) => {
        if (!val || val === '' || val === undefined || val === null) return true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(val)) return true;
        if (val.length < 3 || val.length > 30) return false;
        return /^[a-zA-Z0-9_-]+$/.test(val);
      },
      {
        message: 'Username must be a valid email address or 3-30 characters with only letters, numbers, underscores, and hyphens',
      }
    )
    .optional(),
});

type UserFormValues = z.infer<typeof userSchema>;

type UserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  user?: UserWithRoles | null;
  onDelete?: () => void;
};

export function UserModal({ isOpen, onClose, user, onDelete }: UserModalProps) {
  const isEditing = !!user;
  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const form = useForm<UserFormValues>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      email: user?.email || '',
      password: '',
      name: user?.name || '',
      username: user?.username || '',
    },
  });

  // Reset form when modal opens/closes or user changes
  useEffect(() => {
    if (!isOpen) return;
    
    if (user) {
      form.reset({
        email: user.email,
        password: '',
        name: user.name || '',
        username: user.username || '',
      });
    } else {
      form.reset({
        email: '',
        password: '',
        name: '',
        username: '',
      });
    }
    setShowPassword(false);
    setError(null);
    setDeleteConfirmOpen(false);
  }, [isOpen, user, form]);

  const onSubmit = async (values: UserFormValues) => {
    setError(null);
    try {
      if (isEditing) {
        const updateData: any = {
          email: values.email,
          name: values.name || undefined,
        };
        if (values.username !== undefined) {
          updateData.username = values.username.trim() || values.email;
        }
        if (values.password && values.password.length >= 8) {
          updateData.password = values.password;
        }
        await updateUser.mutateAsync({ id: user!.id, data: updateData });
      } else {
        // Enforce password requirement on creation
        if (!values.password || values.password.length < 8) {
          setError('Password must be at least 8 characters');
          return;
        }
        await createUser.mutateAsync({
          email: values.email,
          password: values.password,
          name: values.name,
          username: values.username,
        });
      }
      
      // Reset form after successful submission (only for create, not update)
      if (!isEditing) {
        form.reset({
          email: '',
          password: '',
          name: '',
          username: '',
        });
        setShowPassword(false);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to save user');
    }
  };

  const confirmDelete = async () => {
    if (!user) return;
    setError(null);
    try {
      await deleteUser.mutateAsync(user.id);
      setDeleteConfirmOpen(false);
      onDelete?.();
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete user');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Edit User' : 'Create User'}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            {...form.register('email')}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700/50 rounded-lg bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="user@example.com"
          />
          {form.formState.errors.email && (
            <p className="mt-1 text-sm text-red-500">{form.formState.errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {isEditing ? 'New Password (leave empty to keep current)' : 'Password'} {!isEditing && <span className="text-red-500">*</span>}
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              {...form.register('password')}
              className="block w-full px-3 py-2 pr-10 border border-gray-300 dark:border-gray-700/50 rounded-lg bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder={isEditing ? 'Enter new password' : 'Enter password'}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {form.formState.errors.password && (
            <p className="mt-1 text-sm text-red-500">{form.formState.errors.password.message}</p>
          )}
        </div>

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Name</label>
          <input
            type="text"
            {...form.register('name')}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700/50 rounded-lg bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="Full name"
          />
          {form.formState.errors.name && <p className="mt-1 text-sm text-red-500">{form.formState.errors.name.message}</p>}
        </div>

        {/* Username */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Username</label>
          <input
            type="text"
            {...form.register('username')}
            className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-700/50 rounded-lg bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="username (optional)"
          />
          {form.formState.errors.username && (
            <p className="mt-1 text-sm text-red-500">{form.formState.errors.username.message}</p>
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Enter a valid email address or 3-30 characters with letters, numbers, underscores, and hyphens
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
            <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700/50">
          <div>
            {isEditing && (
              <button
                type="button"
                onClick={() => setDeleteConfirmOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500/50"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createUser.isPending || updateUser.isPending}
              className="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {createUser.isPending || updateUser.isPending ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </div>
      </form>
      <ConfirmationDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={confirmDelete}
        title="Delete User"
        message="Are you sure you want to delete this user? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        isLoading={deleteUser.isPending}
      />
    </Modal>
  );
}

