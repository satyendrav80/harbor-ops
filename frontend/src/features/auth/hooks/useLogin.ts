import { useMutation } from '@tanstack/react-query';
import { login, LoginInput, LoginResponse } from '../../../services/auth';
import { useAuth } from '../context/AuthContext';

export function useLogin() {
  const { login: save } = useAuth();
  return useMutation<LoginResponse, Error, LoginInput>({
    mutationFn: (vars) => login(vars),
    onSuccess: (data) => {
      save(data.token, data.user);
      try { window.alert('Logged in successfully'); } catch {}
    },
    onError: () => {
      try { window.alert('Login failed. Check your credentials.'); } catch {}
    },
  });
}


