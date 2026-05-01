import apiClient from '../client';

export const attemptsApi = {
    start: async (testId: number) => {
        const response = await apiClient.post('/api/attempts/start', { test_id: testId });
        return response.data;
    },

    resume: async (testId: number) => {
        const response = await apiClient.get(`/api/attempts/resume?test_id=${testId}`);
        return response.data;
    },

    startBlock: async (attemptId: number, blockId: number) => {
        const response = await apiClient.post('/api/attempts/block/start', {
            attempt_id: attemptId,
            block_id: blockId
        });
        return response.data;
    },

    submitBlock: async (attemptId: number, blockId: number, answers: any[]) => {
        const response = await apiClient.post('/api/attempts/block/submit', {
            attempt_id: attemptId,
            block_id: blockId,
            answers
        });
        return response.data;
    },

    uploadFile: async (formData: FormData) => {
        const response = await apiClient.post('/api/attempts/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        return response.data;
    },

    logProctorEvent: async (data: any) => {
        return apiClient.post('/api/attempts/proctor/log', data);
    },

    getResult: async (id: number) => {
        const response = await apiClient.get(`/api/attempts/${id}/result`);
        return response.data;
    },

    getMyAttempts: async (testId?: number) => {
        const url = testId ? `/api/attempts/my-attempts?test_id=${testId}` : '/api/attempts/my-attempts';
        const response = await apiClient.get(url);
        return response.data;
    }
};
