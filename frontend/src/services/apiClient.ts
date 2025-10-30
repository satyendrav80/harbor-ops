export type ApiError = { message: string; status?: number };

function baseUrl() {
  return import.meta.env.VITE_API_URL ?? '';
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem('token');
  const headers = new Headers(init?.headers ?? {});
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const res = await fetch(`${baseUrl()}${path}`, { ...init, headers });
  const json = res.headers.get('content-type')?.includes('application/json');
  const data = json ? await res.json() : await res.text();
  if (!res.ok) {
    throw { message: json && data?.message ? data.message : 'Request failed', status: res.status } as ApiError;
  }
  return data as T;
}


