import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useProfile } from '../hooks/useProfile';
import { useUpdateProfile } from '../hooks/useUpdateProfile';
import { useChangePassword } from '../hooks/useChangePassword';
import { Loading } from '../../../components/common/Loading';
import { EmptyState } from '../../../components/common/EmptyState';
import { User, Mail, Calendar, Eye, EyeOff, Save, Lock, AlertCircle, AtSign } from 'lucide-react';

const profileSchema = z.object({
  name: z.string().optional(),
  email: z.string().email('Invalid email address').min(1, 'Email is required'),
  username: z
    .string()
    .refine(
      (val) => {
        // Allow undefined, null, or empty string
        if (!val || val === '' || val === undefined || val === null) return true;
        
        // Check if it's a valid email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (emailRegex.test(val)) return true;
        
        // If not email, validate as username format (alphanumeric with underscores and hyphens)
        if (val.length < 3 || val.length > 30) return false;
        return /^[a-zA-Z0-9_-]+$/.test(val);
      },
      {
        message: 'Username must be a valid email address or 3-30 characters with only letters, numbers, underscores, and hyphens',
      }
    )
    .optional(),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match",
    path: ['confirmPassword'],
  });

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

/**
 * ProfilePage component for viewing and editing user profile
 */
export function ProfilePage() {
  const { data: profile, isLoading, error } = useProfile();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { name: '', email: '', username: '' },
  });

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  // Set form values when profile loads
  useEffect(() => {
    if (profile) {
      // Use email prefix as display username if username is null
      const displayUsername = profile.username || profile.email.split('@')[0] || '';
      profileForm.reset({
        name: profile.name || '',
        email: profile.email,
        username: displayUsername,
      });
    }
  }, [profile, profileForm]);

  const onProfileSubmit = (values: ProfileFormValues) => {
    setProfileSuccess(false);
    setProfileError(null);
    const updateData: { name?: string; email: string; username?: string } = {
      email: values.email,
    };
    if (values.name && values.name.trim()) {
      updateData.name = values.name.trim();
    }
    // Handle username: always send it
    if (values.username !== undefined) {
      const trimmed = values.username.trim();
      
      // If username is empty, use email as username
      if (trimmed === '') {
        updateData.username = values.email;
      } 
      // Otherwise, send whatever the user typed (could be email format or custom username)
      else {
        updateData.username = trimmed;
      }
    }
    
    updateProfile.mutate(updateData, {
      onSuccess: () => {
        setProfileSuccess(true);
        setTimeout(() => setProfileSuccess(false), 3000);
      },
      onError: (error: any) => {
        setProfileError(error?.message || 'Failed to update profile. Please try again.');
      },
    });
  };

  const onPasswordSubmit = (values: PasswordFormValues) => {
    setPasswordError(null);
    setPasswordSuccess(false);
    changePassword.mutate(
      { currentPassword: values.currentPassword, newPassword: values.newPassword },
      {
        onSuccess: () => {
          setPasswordSuccess(true);
          passwordForm.reset();
          setTimeout(() => setPasswordSuccess(false), 3000);
        },
        onError: (error: any) => {
          setPasswordError(error?.message || 'Failed to change password. Please check your current password.');
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto">
        <Loading />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <EmptyState
          icon={AlertCircle}
          title="Failed to load profile"
          description="Unable to fetch your profile information. Please try again later."
        />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto">
        <EmptyState icon={User} title="Profile not found" description="Your profile could not be loaded." />
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-gray-900 dark:text-white text-3xl font-bold leading-tight mb-2">Profile Settings</h1>
        <p className="text-gray-500 dark:text-gray-400 text-base font-normal">
          Manage your account information and security settings.
        </p>
      </header>

      {/* Profile Information Card */}
      <div className="mb-8 rounded-xl bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 p-6">
        <h2 className="text-gray-900 dark:text-white text-xl font-semibold mb-6 flex items-center gap-2">
          <User className="w-5 h-5" />
          Profile Information
        </h2>

        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-6">
          {/* Name Field */}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Name
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                id="name"
                type="text"
                {...profileForm.register('name')}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700/50 rounded-lg bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Your name"
              />
            </div>
            {profileForm.formState.errors.name && (
              <p className="mt-1 text-sm text-red-500">{profileForm.formState.errors.name.message}</p>
            )}
          </div>

          {/* Username Field */}
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <AtSign className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                id="username"
                type="text"
                {...profileForm.register('username')}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700/50 rounded-lg bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="username (optional)"
              />
            </div>
            {profileForm.formState.errors.username && (
              <p className="mt-1 text-sm text-red-500">{profileForm.formState.errors.username.message}</p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Enter a valid email address or 3-30 characters with letters, numbers, underscores, and hyphens
            </p>
          </div>

          {/* Email Field */}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                id="email"
                type="email"
                {...profileForm.register('email')}
                className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-700/50 rounded-lg bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="your.email@example.com"
              />
            </div>
            {profileForm.formState.errors.email && (
              <p className="mt-1 text-sm text-red-500">{profileForm.formState.errors.email.message}</p>
            )}
          </div>

          {/* Account Info */}
          {profile.createdAt && (
            <div className="pt-4 border-t border-gray-200 dark:border-gray-700/50">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Member since</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{formatDate(profile.createdAt)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {profileError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{profileError}</p>
            </div>
          )}

          {/* Success Message */}
          {profileSuccess && (
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
              <p className="text-sm text-green-800 dark:text-green-200">Profile updated successfully!</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={updateProfile.isPending}
              className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {updateProfile.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Change Password Card */}
      <div className="rounded-xl bg-white dark:bg-[#1C252E] border border-gray-200 dark:border-gray-700/50 p-6">
        <h2 className="text-gray-900 dark:text-white text-xl font-semibold mb-6 flex items-center gap-2">
          <Lock className="w-5 h-5" />
          Change Password
        </h2>

        <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-6">
          {/* Current Password */}
          <div>
            <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Current Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                id="currentPassword"
                type={showCurrentPassword ? 'text' : 'password'}
                {...passwordForm.register('currentPassword')}
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-700/50 rounded-lg bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Enter current password"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showCurrentPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {passwordForm.formState.errors.currentPassword && (
              <p className="mt-1 text-sm text-red-500">{passwordForm.formState.errors.currentPassword.message}</p>
            )}
          </div>

          {/* New Password */}
          <div>
            <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                id="newPassword"
                type={showNewPassword ? 'text' : 'password'}
                {...passwordForm.register('newPassword')}
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-700/50 rounded-lg bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Enter new password (min. 8 characters)"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {passwordForm.formState.errors.newPassword && (
              <p className="mt-1 text-sm text-red-500">{passwordForm.formState.errors.newPassword.message}</p>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Confirm New Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400 dark:text-gray-500" />
              </div>
              <input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                {...passwordForm.register('confirmPassword')}
                className="block w-full pl-10 pr-10 py-2 border border-gray-300 dark:border-gray-700/50 rounded-lg bg-white dark:bg-[#1C252E] text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Confirm new password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {passwordForm.formState.errors.confirmPassword && (
              <p className="mt-1 text-sm text-red-500">{passwordForm.formState.errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Error Message */}
          {passwordError && (
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4">
              <p className="text-sm text-red-800 dark:text-red-200">{passwordError}</p>
            </div>
          )}

          {/* Success Message */}
          {passwordSuccess && (
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 p-4">
              <p className="text-sm text-green-800 dark:text-green-200">Password changed successfully!</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={changePassword.isPending}
              className="inline-flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary/50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {changePassword.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Changing...
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  Change Password
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

