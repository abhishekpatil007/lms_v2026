import apiClient from '../client';
import type { Course } from '../../types';

export const coursesApi = {
  list: async (): Promise<{ courses: Course[] }> => {
    const response = await apiClient.get('/api/courses');
    return response.data;
  },

  getById: async (id: number): Promise<{ course: Course }> => {
    const response = await apiClient.get(`/api/courses/${id}`);
    return response.data;
  },

  create: async (data: {
    title: string;
    description?: string;
    category?: string;
    duration?: number;
    level: 'beginner' | 'intermediate' | 'advanced';
  }): Promise<{ message: string; course: Course }> => {
    const response = await apiClient.post('/api/courses', data);
    return response.data;
  },

  update: async (
    id: number,
    data: Partial<{
      title: string;
      description: string;
      category: string;
      duration: number;
      level: 'beginner' | 'intermediate' | 'advanced';
    }>
  ): Promise<{ message: string; course: Course }> => {
    const response = await apiClient.put(`/api/courses/${id}`, data);
    return response.data;
  },

  deactivate: async (id: number): Promise<{ message: string }> => {
    const response = await apiClient.patch(`/api/courses/${id}/deactivate`);
    return response.data;
  },
};
