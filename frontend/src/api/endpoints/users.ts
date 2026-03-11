import apiClient from '../client';
import type { User, OnboardResponse } from '../../types';

export const usersApi = {
  // Get all instructors (admin only)
  getInstructors: async (page = 1, limit = 10, search = ''): Promise<{ instructors: User[], total: number }> => {
    const response = await apiClient.get(`/api/users/instructors?page=${page}&limit=${limit}&search=${search}`);
    return response.data;
  },

  // Get all students (admin only)
  getStudents: async (page = 1, limit = 10, search = ''): Promise<{ students: User[], total: number }> => {
    const response = await apiClient.get(`/api/users/students?page=${page}&limit=${limit}&search=${search}`);
    return response.data;
  },

  // Onboard a new student (admin only)
  onboardStudent: async (data: {
    name: string;
    email: string;
    preferred_language?: string;
  }): Promise<OnboardResponse> => {
    const response = await apiClient.post('/api/auth/onboard', data);
    return response.data;
  },

  // Onboard a new instructor (admin only)
  onboardInstructor: async (data: {
    name: string;
    email: string;
    preferred_language?: string;
  }): Promise<OnboardResponse> => {
    const response = await apiClient.post('/api/auth/onboard-instructor', data);
    return response.data;
  },
};
