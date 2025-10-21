import { useQuery } from '@tanstack/react-query';
import { apiClient } from './apiClient';
import { Domain, DomainAnalytics } from '../types/domain';

export const fetchDomains = async (userId: string): Promise<Domain[]> => {
  const { data } = await apiClient.get<Domain[]>('/domains', { params: { userId } });
  return data;
};

export const fetchDomainAnalytics = async (domainId: string): Promise<DomainAnalytics> => {
  const { data } = await apiClient.get<DomainAnalytics>(`/domains/${domainId}/analytics`);
  return data;
};

export const useUserDomains = (userId: string) =>
  useQuery({
    queryKey: ['domains', userId],
    queryFn: () => fetchDomains(userId),
    enabled: !!userId
  });

export const useDomainAnalytics = (domainId: string) =>
  useQuery({
    queryKey: ['domain-analytics', domainId],
    queryFn: () => fetchDomainAnalytics(domainId),
    enabled: !!domainId
  });
