// src/api/endpoints/liveClasses.ts
import { apiClient } from '../client';
import type {
  LiveClass,
  LiveClassStatus,
  LiveClassSignatureResponse,
  LiveClassJoinResponse
} from '@/types';

export const liveClassesApi = {
  /**
   * Create a live class (Instructor/Admin only)
   */
  create: async (data: {
    batch_id: string;
    topic: string;
    description?: string;
    start_time: string;
    duration: number;
  }): Promise<{ message: string; liveClass: LiveClass }> => {
    const response = await apiClient.post('/api/live-classes', data);
    return response.data;
  },

  /**
   * List live classes for a batch
   */
  listByBatch: async (
    batchId: string,
    params?: { page?: number; limit?: number; search?: string }
  ): Promise<{ liveClasses: LiveClass[]; total: number; totalPages: number; currentPage: number }> => {
    const response = await apiClient.get(`/api/live-classes/batch/${batchId}`, { params });
    return { 
      liveClasses: response.data.data, 
      total: response.data.total || 0,
      totalPages: response.data.totalPages || 1,
      currentPage: response.data.currentPage || 1
    };
  },

  /**
   * Get live class by ID
   */
  getById: async (liveClassId: number): Promise<{ liveClass: LiveClass }> => {
    const response = await apiClient.get(`/api/live-classes/${liveClassId}`);
    return response.data;
  },

  /**
   * Get Zoom signature for joining live class
   */
  getSignature: async (
    liveClassId: number,
    data: {
      role: number; // 0 for participant, 1 for host
    }
  ): Promise<LiveClassSignatureResponse> => {
    const response = await apiClient.post(`/api/live-classes/${liveClassId}/signature`, data);
    return response.data;
  },

  /**
   * Join live class
   */
  join: async (liveClassId: number): Promise<LiveClassJoinResponse> => {
    const response = await apiClient.get(`/api/live-classes/${liveClassId}/join`);
    return response.data;
  },

  /**
   * Update live class (Instructor/Admin only)
   */
  update: async (
    liveClassId: number,
    data: {
      topic?: string;
      description?: string;
      start_time?: string;
      duration?: number;
      status?: LiveClassStatus;
    }
  ): Promise<{ message: string; liveClass: LiveClass }> => {
    const response = await apiClient.put(`/api/live-classes/${liveClassId}`, data);
    return response.data;
  },

  /**
   * Delete live class (Instructor/Admin only)
   */
  delete: async (liveClassId: number): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/api/live-classes/${liveClassId}`);
    return response.data;
  },
};
