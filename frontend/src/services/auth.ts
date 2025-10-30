import { apiFetch } from './apiClient';

export type LoginInput = { usernameOrEmail: string; password: string };
export type LoginResponse = { token: string };
export type MeResponse = { id: string; email: string; status?: 'pending' | 'approved' | 'blocked' };
export type RegisterInput = { name: string; email: string; password: string };
export type RegisterResponse = { id: string; email: string; status: 'pending' | 'approved' | 'blocked'; message?: string };

export async function login(input: LoginInput): Promise<LoginResponse> {
  return apiFetch<LoginResponse>('/auth/login', { method: 'POST', body: JSON.stringify(input) });
}

export async function getMe(): Promise<MeResponse> {
  return apiFetch<MeResponse>('/auth/me');
}

export async function register(input: RegisterInput): Promise<RegisterResponse> {
  return apiFetch<RegisterResponse>('/auth/register', { method: 'POST', body: JSON.stringify(input) });
}

