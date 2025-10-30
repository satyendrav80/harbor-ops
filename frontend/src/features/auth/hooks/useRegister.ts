import { useMutation } from '@tanstack/react-query';
import { register, RegisterInput, RegisterResponse } from '../../../services/auth';

export function useRegister() {
  return useMutation<RegisterResponse, Error, RegisterInput>({
    mutationFn: (vars) => register(vars),
  });
}


