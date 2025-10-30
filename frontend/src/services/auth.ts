import { apiFetch } from './apiClient';

export type LoginInput = { usernameOrEmail: string; password: string };
export type LoginResponse = { token: string; user: { id: string | number; name: string; email: string; permissions?: string[] } };

export async function login(input: LoginInput): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(input) });
}


