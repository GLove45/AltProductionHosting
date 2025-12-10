import { useQuery } from '@tanstack/react-query';
import { apiClient } from './apiClient';

export const fetchDomains = async (userId) => {
  const { data } = await apiClient.get('/domains', { params: { userId } });
  return data;
};

export const fetchDomainAnalytics = async (domainId) => {
  const { data } = await apiClient.get(`/domains/${domainId}/analytics`);
  return data;
};

export const useUserDomains = (userId) =>
  useQuery({
    queryKey: ['domains', userId],
    queryFn: () => fetchDomains(userId),
    enabled: !!userId
  });

export const useDomainAnalytics = (domainId) =>
  useQuery({
    queryKey: ['domain-analytics', domainId],
    queryFn: () => fetchDomainAnalytics(domainId),
    enabled: !!domainId
  });

export const registerDomain = async (payload) => {
  const { data } = await apiClient.post('/domains', payload);
  return data;
};
