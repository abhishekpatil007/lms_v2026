// src/api/endpoints/webinars.ts
import { apiClient } from '../client';
import type {
  Webinar,
  WebinarStatus,
  WebinarRegistration,
  WebinarRegisterResponse,
  WebinarJoinResponse
} from '@/types';

export const webinarsApi = {
  /**
   * Create a webinar (Instructor/Admin only)
   */
  create: async (data: {
    title: string;
    description?: string;
    scheduled_at: string;
    duration_minutes: number;
    max_attendees?: number;
    is_public?: boolean;
  }): Promise<{ message: string; webinar: Webinar }> => {
    const response = await apiClient.post('/api/webinars', data);
    return response.data;
  },

  /**
   * List all webinars (Public)
   */
  list: async (params?: {
    status?: WebinarStatus;
    is_public?: boolean;
  }): Promise<{ webinars: Webinar[] }> => {
    const response = await apiClient.get('/api/webinars', { params });
    return response.data;
  },

  /**
   * Get webinar by ID (Public)
   */
  getById: async (webinarId: string): Promise<{ webinar: Webinar }> => {
    const response = await apiClient.get(`/api/webinars/${webinarId}`);
    return response.data;
  },

  /**
   * Update webinar (Instructor/Admin only)
   */
  update: async (
    webinarId: string,
    data: {
      title?: string;
      description?: string;
      scheduled_at?: string;
      duration_minutes?: number;
      max_attendees?: number;
      status?: WebinarStatus;
      is_public?: boolean;
    }
  ): Promise<{ message: string; webinar: Webinar }> => {
    const response = await apiClient.put(`/api/webinars/${webinarId}`, data);
    return response.data;
  },

  /**
   * Delete/Cancel webinar (Instructor/Admin only)
   */
  delete: async (webinarId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/api/webinars/${webinarId}`);
    return response.data;
  },

  /**
   * Register for webinar (Public or Logged-In)
   */
  register: async (data: {
    webinar_id: string;
    name: string;
    email: string;
    phone?: string;
    organization?: string;
  }): Promise<WebinarRegisterResponse> => {
    const response = await apiClient.post('/api/webinars/register', data);
    return response.data;
  },

  /**
   * Get webinar registrations (Instructor/Admin only)
   */
  getRegistrations: async (webinarId: string): Promise<{ registrations: WebinarRegistration[] }> => {
    const response = await apiClient.get(`/api/webinars/${webinarId}/registrations`);
    return response.data;
  },

  /**
   * Join webinar (Registered users only)
   */
  join: async (webinarId: string): Promise<WebinarJoinResponse> => {
    const response = await apiClient.get(`/api/webinars/${webinarId}/join`);
    return response.data;
  },
};
