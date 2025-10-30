import { useMutation } from '@tanstack/react-query';
import { login, LoginInput, LoginResponse, getMe } from '../../../services/auth';
import { useAuth } from '../context/AuthContext';

export function useLogin() {
  const { login: save } = useAuth();
  return useMutation<LoginResponse, Error, LoginInput>({
    mutationFn: (vars) => login(vars),
    onSuccess: async (data) => {
      // save token first to authorize subsequent calls
      try {
        localStorage.setItem('token', data.token);
        const me = await getMe();
        save(data.token, { id: me.id, name: me.email, email: me.email });
        try { window.alert('Logged in successfully'); } catch {}
      } catch {
        try { window.alert('Login succeeded, but failed to fetch profile'); } catch {}
      }
    },
    onError: () => {
      try { window.alert('Login failed. Check your credentials.'); } catch {}
    },
  });
}


