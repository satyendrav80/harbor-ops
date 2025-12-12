import { env } from '../constants/env';

export type ApiError = { message: string; status?: number };

function baseUrl() {
  return env.app_backend_url || '';
}

export async function apiFetch<T>(path: string, init?: RequestInit & { skipAuth?: boolean }): Promise<T> {
  const token = localStorage.getItem('token');
  const headers = new Headers(init?.headers ?? {});
  headers.set('Content-Type', 'application/json');
  if (token && !init?.skipAuth) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${baseUrl()}${path}`, { ...init, headers });
  const json = res.headers.get('content-type')?.includes('application/json');
  const data = json ? await res.json() : await res.text();
  if (!res.ok) {
    const errorMessage = json && data?.error ? data.error : (json && data?.message ? data.message : 'Request failed');
    try {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('api-error', { detail: { message: errorMessage, status: res.status } }));
      }
    } catch {}
    if (res.status === 401 || (res.status === 403 && (
      errorMessage?.toLowerCase().includes('blocked') ||
      errorMessage?.toLowerCase().includes('pending approval')
    ))) {
      try {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      } catch {}
      if (typeof window !== 'undefined') {
        // Only redirect if not already on login page so error messages are visible on login
        if (window.location.pathname !== '/login') {
          setTimeout(() => {
            window.location.href = '/login';
          }, 0);
        }
      }
    }
    throw { message: errorMessage, status: res.status } as ApiError;
  }
  return data as T;
}


