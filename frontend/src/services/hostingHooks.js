import { useQuery } from '@tanstack/react-query';
import { apiClient } from './apiClient';

const getSpaces = async (userId) => {
  const { data } = await apiClient.get(`/hosting/spaces`, { params: { userId } });
  return data;
};

const getSpace = async (spaceId) => {
  const { data } = await apiClient.get(`/hosting/spaces/${spaceId}`);
  return data;
};

export const useHostingSpaces = (userId) =>
  useQuery({
    queryKey: ['hosting-spaces', userId],
    queryFn: () => getSpaces(userId),
    enabled: !!userId
  });

export const useHostingSpaceDetail = (spaceId) =>
  useQuery({ queryKey: ['hosting-space', spaceId], queryFn: () => getSpace(spaceId), enabled: !!spaceId });
