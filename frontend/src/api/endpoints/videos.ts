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
  }): Promise<{ videos: Video[] }> => {
    const response = await apiClient.get('/api/videos', { params });
    return response.data;
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
   * Delete video (Instructor/Admin only)
   */
  delete: async (videoId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/api/videos/${videoId}`);
    return response.data;
  },
};
