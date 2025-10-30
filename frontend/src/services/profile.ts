import { apiFetch } from './apiClient';

export type Profile = {
  id: string;
  email: string;
  username: string | null;
  name: string | null;
  createdAt?: string;
  updatedAt?: string;
};

export type UpdateProfileInput = {
  name?: string;
  email?: string;
  username?: string;
};

export type ChangePasswordInput = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

export async function getProfile(): Promise<Profile> {
  return apiFetch<Profile>('/auth/me');
}

export async function updateProfile(input: UpdateProfileInput): Promise<Profile> {
  return apiFetch<Profile>('/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export async function changePassword(input: { currentPassword: string; newPassword: string }): Promise<void> {
  return apiFetch<void>('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

