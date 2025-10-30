import { useMutation } from '@tanstack/react-query';
import { changePassword } from '../../../services/profile';

export function useChangePassword() {
  return useMutation({
    mutationFn: (input: { currentPassword: string; newPassword: string }) =>
      changePassword(input),
  });
}

