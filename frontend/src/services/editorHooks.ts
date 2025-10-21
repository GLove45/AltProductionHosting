import { useQuery } from '@tanstack/react-query';
import { apiClient } from './apiClient';
import { EditorTemplate } from '../types/editor';

const getTemplates = async (): Promise<EditorTemplate[]> => {
  const { data } = await apiClient.get('/editor/templates');
  return data;
};

export const useEditorTemplates = () =>
  useQuery({ queryKey: ['editor-templates'], queryFn: () => getTemplates() });

export type { EditorTemplate };
