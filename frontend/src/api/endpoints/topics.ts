import apiClient from '../client';
import type { Topic } from '../../types';

export const topicsApi = {
  create: async (data: {
    batch_id: string;
    title: string;
    description?: string;
    order_index?: number;
  }): Promise<{ message: string; topic: Topic }> => {
    const response = await apiClient.post('/api/topics', data);
    return response.data;
  },

  listByBatch: async (batchId: string): Promise<{ topics: Topic[] }> => {
    const response = await apiClient.get(`/api/topics/batch/${batchId}`);
    // Handle both { topics: [...] } and direct array [...] from backend
    const topics = Array.isArray(response.data) ? response.data : (response.data.topics || []);
    return { topics };
  },

  update: async (
    id: number,
    data: Partial<{
      title: string;
      description: string;
      order_index: number;
    }>
  ): Promise<{ message: string; topic: Topic }> => {
    const response = await apiClient.put(`/api/topics/${id}`, data);
    return response.data;
  },

  delete: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/api/topics/${id}`);
    return response.data;
  },
};
