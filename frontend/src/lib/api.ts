import axios from 'axios';

let tokenGetter: (() => string | null) | null = null;
export function setAuthTokenGetter(getter: () => string | null) {
  tokenGetter = getter;
}

export const api = axios.create({ baseURL: '/' });

api.interceptors.request.use((config) => {
  const token = tokenGetter ? tokenGetter() : null;
  if (token) {
    config.headers = config.headers ?? {};
    (config.headers as any).Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
