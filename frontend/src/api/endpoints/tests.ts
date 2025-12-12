import apiClient from '../client';
import type { Test, Block, Question } from '../../types';

export const testsApi = {
    list: async (params?: { batch_id?: string }): Promise<{ tests: Test[] }> => {
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
};
