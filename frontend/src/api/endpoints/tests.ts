import apiClient from '../client';
import type { Test, Block, Question } from '../../types';

export const testsApi = {
    list: async (params?: { 
        batch_id?: string;
        status?: string;
        search?: string;
        page?: number;
        limit?: number;
    }): Promise<{ tests: Test[]; total?: number; page?: number; totalPages?: number }> => {
        const response = await apiClient.get('/api/tests', { params });
        return response.data;
    },

    getById: async (id: number): Promise<Test> => {
        const response = await apiClient.get(`/api/tests/${id}`);
        return response.data;
    },

    create: async (data: Partial<Test>): Promise<Test> => {
        const response = await apiClient.post('/api/tests', data);
        return response.data;
    },

    publish: async (id: number): Promise<{ message: string; test: Test }> => {
        const response = await apiClient.put(`/api/tests/${id}/publish`);
        return response.data;
    },

    addBlock: async (testId: number, data: Partial<Block>): Promise<Block> => {
        const response = await apiClient.post(`/api/tests/${testId}/blocks`, data);
        return response.data;
    },

    addQuestion: async (blockId: number, data: FormData): Promise<Question> => {
        const response = await apiClient.post(`/api/tests/blocks/${blockId}/questions`, data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        return response.data;
    },

    update: async (id: number, data: Partial<Test>): Promise<{ message: string; test: Test }> => {
        const response = await apiClient.put(`/api/tests/${id}`, data);
        return response.data;
    },

    delete: async (id: number): Promise<{ message: string }> => {
        const response = await apiClient.delete(`/api/tests/${id}`);
        return response.data;
    },

    deleteBlock: async (blockId: number): Promise<{ message: string }> => {
        const response = await apiClient.delete(`/api/tests/blocks/${blockId}`);
        return response.data;
    },

    updateBlock: async (blockId: number, data: Partial<Block>): Promise<{ message: string; block: Block }> => {
        const response = await apiClient.put(`/api/tests/blocks/${blockId}`, data);
        return response.data;
    },

    deleteQuestion: async (questionId: number): Promise<{ message: string }> => {
        const response = await apiClient.delete(`/api/tests/questions/${questionId}`);
        return response.data;
    },

    updateQuestion: async (questionId: number, data: Partial<Question> & { options?: any[] }): Promise<{ message: string; question: Question }> => {
        const response = await apiClient.put(`/api/tests/questions/${questionId}`, data);
        return response.data;
    },
};
