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
      status: string;
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

  unenrollStudent: async (
    batchId: string,
    studentId: number
  ): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/api/batches/${batchId}/students/${studentId}`);
    return response.data;
  },

  reorderVideos: async (
    batchId: string,
    order: { video_id: string; order_index: number }[]
  ): Promise<{ message: string }> => {
    const response = await apiClient.put(`/api/batches/${batchId}/videos/reorder`, { order });
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
  
  exportStudents: async (id: string) => {
    const response = await apiClient.get(`/api/batches/${id}/students/export`, {
      responseType: 'blob'
    });
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Students_Batch_${id}.xlsx`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  },

  bulkEnroll: async (id: string, file: File): Promise<{ message: string; count: number }> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/api/batches/${id}/students/bulk-enroll`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },
};
