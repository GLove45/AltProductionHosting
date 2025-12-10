import { useQuery } from '@tanstack/react-query';
import { apiClient } from './apiClient';

const getTemplates = async () => {
  const { data } = await apiClient.get('/editor/templates');
  return data;
};

export const useEditorTemplates = () =>
  useQuery({ queryKey: ['editor-templates'], queryFn: () => getTemplates() });
