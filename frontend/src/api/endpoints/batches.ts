import apiClient from '../client';
import type { Batch, BatchStatus } from '../../types';

export const batchesApi = {
  list: async (params?: {
    status?: BatchStatus;
    course_id?: number;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<{ batches: Batch[]; total?: number; page?: number; totalPages?: number }> => {
    const response = await apiClient.get('/api/batches', { params });
    return response.data;
  },

  getById: async (id: string): Promise<{ 
    batch: Batch; 
    counts: { 
      students: number; 
      topics: number; 
      videos: number; 
      documents: number; 
      liveClasses: number; 
      tests: number; 
    } 
  }> => {
    const response = await apiClient.get(`/api/batches/${id}`);
    return response.data;
  },

  getStudents: async (
    id: string,
    params?: { page?: number; limit?: number; search?: string }
  ): Promise<{ students: any[]; total: number; activeCount: number; inactiveCount: number; totalPages: number; currentPage: number }> => {
    const response = await apiClient.get(`/api/batches/${id}/students`, { params });
    return response.data;
  },

  create: async (data: {
    batch_name: string;
    course_id: number;
    start_date: string;
    end_date: string;
    instructor_id?: number;
    description?: string;
  }): Promise<{ message: string; batch: Batch }> => {
    const response = await apiClient.post('/api/batches', data);
    return response.data;
  },

  update: async (
    id: string,
    data: Partial<{
      batch_name: string;
      course_id: number;
      start_date: string;
      end_date: string;
      instructor_id: number;
      description: string;
    }>
  ): Promise<{ message: string; batch: Batch }> => {
    const response = await apiClient.put(`/api/batches/${id}`, data);
    return response.data;
  },

  deactivate: async (id: string): Promise<{ message: string }> => {
    const response = await apiClient.patch(`/api/batches/${id}/deactivate`);
    return response.data;
  },

  assignInstructor: async (
    id: string,
    instructor_id: number
  ): Promise<{ message: string }> => {
    const response = await apiClient.patch(`/api/batches/${id}/assign-instructor`, {
      instructor_id,
    });
    return response.data;
  },

  enrollStudents: async (
    id: string,
    studentIds: number[]
  ): Promise<{ message: string }> => {
    const response = await apiClient.post(`/api/batches/${id}/enroll`, {
      studentIds,
    });
    return response.data;
  },

  getInstructorBatches: async (): Promise<{ batches: Batch[] }> => {
    const response = await apiClient.get('/api/batches/instructor/my-batches');
    return response.data;
  },

  getStudentBatches: async (): Promise<{ batches: Batch[] }> => {
    const response = await apiClient.get('/api/batches/student/my-batches');
    return response.data;
  },
};
