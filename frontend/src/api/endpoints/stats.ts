import apiClient from '../client';

export const statsApi = {
    getDashboardStats: async () => {
        const response = await apiClient.get('/api/stats/dashboard');
        return response.data;
    },
};
