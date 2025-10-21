import { apiClient } from './apiClient';
import { AuthTokens, UserProfile } from '../types/auth';

export const login = async (identifier: string, password: string): Promise<AuthTokens> => {
  const { data } = await apiClient.post<AuthTokens>('/auth/login', { identifier, password });
  return data;
};

export const fetchProfile = async (): Promise<UserProfile> => {
  const { data } = await apiClient.get<UserProfile>('/auth/profile');
  return data;
};

export const changePassword = async (payload: {
  currentPassword: string;
  newPassword: string;
}): Promise<UserProfile> => {
  const { data } = await apiClient.patch<UserProfile>('/auth/password', payload);
  return data;
};
