import apiClient from '../client';
import type { User, OnboardResponse } from '../../types';

export const usersApi = {
  // Get all instructors (admin only)
  getInstructors: async (): Promise<{ instructors: User[] }> => {
    const response = await apiClient.get('/api/batches/instructor-list');
    return response.data;
  },

  // Get all students (admin only)
  getStudents: async (): Promise<{ students: User[] }> => {
    const response = await apiClient.get('/api/batches/student-list');
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
