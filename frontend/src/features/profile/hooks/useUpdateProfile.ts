import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProfile, UpdateProfileInput } from '../../../services/profile';
import { useAuth } from '../../auth/context/AuthContext';

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  const { login } = useAuth();

  return useMutation({
    mutationFn: (input: UpdateProfileInput) => updateProfile(input),
    onSuccess: (data) => {
      // Update profile cache
      queryClient.setQueryData(['profile'], data);
      // Update auth context with new user data
      login(
        localStorage.getItem('token') || '',
        { id: data.id, name: data.name || data.email, email: data.email }
      );
      // Invalidate to refetch
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

