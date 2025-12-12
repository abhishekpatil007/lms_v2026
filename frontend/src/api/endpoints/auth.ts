import apiClient from '../client';
import type { LoginResponse, OnboardResponse, User } from '../../types';

export const authApi = {
  login: async (email: string, password: string): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>('/api/auth/login', {
      email,
      password,
    });
    return response.data;
  },

  logout: async (refreshToken: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/api/auth/logout', { refreshToken });
    return response.data;
  },

  refreshToken: async (
    refreshToken: string
  ): Promise<{ accessToken: string; refreshToken: string }> => {
    const response = await apiClient.post('/api/auth/refresh', { refreshToken });
    return response.data;
  },

  getMe: async (): Promise<{ user: User }> => {
    const response = await apiClient.get('/api/auth/me');
    return response.data;
  },

  onboardStudent: async (data: {
    name: string;
    email: string;
    role: 'student';
    batchId: number;
    batchFee: number;
  }): Promise<OnboardResponse> => {
    const response = await apiClient.post<OnboardResponse>(
      '/api/auth/onboard',
      data
    );
    return response.data;
  },

  onboardInstructor: async (data: {
    name: string;
    email: string;
  }): Promise<OnboardResponse> => {
    const response = await apiClient.post<OnboardResponse>(
      '/api/auth/onboard-instructor',
      data
    );
    return response.data;
  },

  requestPasswordReset: async (
    email: string
  ): Promise<{ message: string }> => {
    const response = await apiClient.post('/api/auth/request-password-reset', {
      email,
    });
    return response.data;
  },

  resetPassword: async (data: {
    email: string;
    token: string;
    newPassword: string;
  }): Promise<{ message: string }> => {
    const response = await apiClient.post('/api/auth/reset-password', data);
    return response.data;
  },

  changePassword: async (data: {
    oldPassword: string;
    newPassword: string;
  }): Promise<{ message: string }> => {
    const response = await apiClient.post('/api/auth/change-password', data);
    return response.data;
  },
};
