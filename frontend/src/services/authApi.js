import { apiClient } from './apiClient';

export const login = async (identifier, password) => {
  const { data } = await apiClient.post('/auth/login', { identifier, password });
  return data;
};

export const fetchProfile = async () => {
  const { data } = await apiClient.get('/auth/profile');
  return data;
};

export const changePassword = async (payload) => {
  const { data } = await apiClient.patch('/auth/password', payload);
  return data;
};
