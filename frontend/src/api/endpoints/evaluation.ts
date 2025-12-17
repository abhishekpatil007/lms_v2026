import apiClient from '../client';

export const evaluationApi = {
    getPending: async (testId?: number) => {
        const params = testId ? { test_id: testId } : {};
        const response = await apiClient.get('/api/evaluation/pending', { params });
        return response.data;
    },

    getAttempt: async (attemptId: number) => {
        const response = await apiClient.get(`/api/evaluation/attempt/${attemptId}`);
        return response.data;
    },

    submitScore: async (attemptId: number, scores: any[]) => {
        const response = await apiClient.post(`/api/evaluation/attempt/${attemptId}/score`, { scores });
        return response.data;
    }
};
