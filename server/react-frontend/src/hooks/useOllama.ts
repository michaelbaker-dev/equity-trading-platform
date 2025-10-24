import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

export interface OllamaModel {
  name: string;
  size: string;
  modified: string;
}

export interface OllamaModelsResponse {
  models: OllamaModel[];
}

/**
 * Hook to fetch available Ollama models
 * Uses React Query for caching and automatic refetching
 */
export const useOllamaModels = () => {
  return useQuery<OllamaModelsResponse>({
    queryKey: ['ollama', 'models'],
    queryFn: async () => {
      const response = await api.get<OllamaModelsResponse>('/ollama/models');
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    retry: 2, // Retry failed requests twice
  });
};
