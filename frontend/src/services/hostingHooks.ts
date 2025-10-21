import { useQuery } from '@tanstack/react-query';
import { apiClient } from './apiClient';
import { HostingFile, HostingSpace } from '../types/hosting';

const getSpaces = async (userId: string): Promise<HostingSpace[]> => {
  const { data } = await apiClient.get(`/hosting/spaces`, { params: { userId } });
  return data;
};

const getSpace = async (spaceId: string): Promise<HostingSpace> => {
  const { data } = await apiClient.get(`/hosting/spaces/${spaceId}`);
  return data;
};

export const useHostingSpaces = (userId: string) =>
  useQuery({
    queryKey: ['hosting-spaces', userId],
    queryFn: () => getSpaces(userId),
    enabled: !!userId
  });

export const useHostingSpaceDetail = (spaceId: string) =>
  useQuery({ queryKey: ['hosting-space', spaceId], queryFn: () => getSpace(spaceId), enabled: !!spaceId });

export type { HostingFile, HostingSpace };
