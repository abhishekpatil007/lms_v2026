import apiClient from '../client';
import type { Invoice } from '../../types';

export const invoicesApi = {
    list: async (params?: { page?: number; limit?: number; status?: string; search?: string }): Promise<{ invoices: Invoice[]; total: number; totalPages: number }> => {
        const response = await apiClient.get('/api/invoices', { params });
        return response.data;
    },

    getById: async (id: number): Promise<Invoice> => {
        const response = await apiClient.get(`/api/invoices/${id}`);
        return response.data;
    },

    offlineEnroll: async (data: any): Promise<any> => {
        const response = await apiClient.post('/api/invoices/offline-enroll', data);
        return response.data;
    },

    requestPayment: async (data: any): Promise<any> => {
        const response = await apiClient.post('/api/invoices/request-payment', data);
        return response.data;
    },

    sendManual: async (data: any): Promise<any> => {
        const response = await apiClient.post('/api/invoices/manual', data);
        return response.data;
    },

    bulkUpload: async (file: File): Promise<any> => {
        const formData = new FormData();
        formData.append('file', file);
        const response = await apiClient.post('/api/invoices/bulk', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },
};
