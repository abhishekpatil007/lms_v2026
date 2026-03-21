// src/api/endpoints/videos.ts
import { apiClient } from '../client';
import type {
  Video,
  VideoUploadResponse,
  VideoPlaybackResponse,
  VideoStatus
} from '@/types';

export const videosApi = {
  /**
   * Create a direct upload URL for video (Instructor/Admin only)
   */
  createUpload: async (data: {
    title: string;
    description?: string;
  }): Promise<VideoUploadResponse> => {
    const response = await apiClient.post('/api/videos/upload', data);
    return response.data;
  },

  /**
   * Create a direct upload URL for video with topic and batches
   */
  createDirectUpload: async (data: {
    title: string;
    description?: string;
    language?: string;
    topic_id?: string;
    batch_ids?: string[];
  }): Promise<{ id: string; upload_id: string; upload_url: string }> => {
    const response = await apiClient.post('/api/videos/upload', data);
    return response.data;
  },

  /**
   * Assign video to batches
   */
  assignBatches: async (
    videoId: string,
    data: {
      batch_ids: string[];
    }
  ): Promise<{ message: string }> => {
    const response = await apiClient.post(`/api/videos/${videoId}/assign-batches`, data);
    return response.data;
  },

  /**
   * List videos (role-aware)
   */
  list: async (params?: {
    status?: VideoStatus;
    batch_id?: string;
    language?: string;
    upload_status?: VideoStatus;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ videos: Video[]; total?: number; totalPages?: number; currentPage?: number }> => {
    const response = await apiClient.get('/api/videos', { params });
    // Robustly handle both { videos: [...] } and direct array [...] from backend
    const videos = Array.isArray(response.data) ? response.data : (response.data.videos || []);
    return { 
      videos, 
      total: response.data.total, 
      totalPages: response.data.totalPages, 
      currentPage: response.data.currentPage 
    };
  },

  /**
   * Get video metadata by ID
   */
  getById: async (videoId: string): Promise<{ video: Video }> => {
    const response = await apiClient.get(`/api/videos/${videoId}`);
    return response.data;
  },

  /**
   * Get playback URL for video
   */
  getPlaybackUrl: async (videoId: string): Promise<VideoPlaybackResponse> => {
    const response = await apiClient.get(`/api/videos/${videoId}/playback`);
    return response.data;
  },

  /**
   * Update video metadata (Instructor/Admin only)
   */
  update: async (
    videoId: string,
    data: Partial<{
      title: string;
      description: string;
      language: string;
      topic_id: string;
      visibility: string;
    }>
  ): Promise<{ message: string; video: Video }> => {
    const response = await apiClient.put(`/api/videos/${videoId}`, data);
    return response.data;
  },

  /**
   * Delete video (Instructor/Admin only)
   */
  delete: async (videoId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/api/videos/${videoId}`);
    return response.data;
  },
};
