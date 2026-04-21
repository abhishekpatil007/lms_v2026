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

    getEmailModuleTemplate: async (type: string): Promise<any> => {
        const response = await apiClient.get(`/api/invoices/email-module/template`, {
            params: { type },
            responseType: 'blob',
        });
        return response.data;
    },

    sendInvoiceEmailBulk: async (type: string, file: File): Promise<any> => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', type);
        const response = await apiClient.post('/api/invoices/email-module/send', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    },

    getInvoicePreview: async (type: string): Promise<any> => {
        const response = await apiClient.get(`/api/invoices/email-module/preview`, {
            params: { type },
            responseType: 'blob',
        });
        return response.data;
    },

    listSentLogs: async (params?: { page?: number; limit?: number; search?: string }): Promise<{ logs: any[]; total: number; totalPages: number }> => {
        const response = await apiClient.get('/api/invoices/sent-logs', { params });
        return response.data;
    },

    downloadSentLog: async (id: number, invoiceNumber: string, type: string): Promise<void> => {
        const response = await apiClient.get(`/api/invoices/sent-logs/${id}/download`, { responseType: 'blob' });
        const prefix = type === 'fully_paid' ? 'Invoice' : 'Receipt';
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `${prefix}_${invoiceNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    bulkDownloadSentLogs: async (search?: string): Promise<void> => {
        const params: any = {};
        if (search) params.search = search;
        const response = await apiClient.get('/api/invoices/sent-logs/bulk-download', { params, responseType: 'blob' });
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/zip' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `invoices_${new Date().toISOString().slice(0,10)}.zip`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    download: async (id: number, invoiceNumber: string): Promise<void> => {
        const response = await apiClient.get(`/api/invoices/${id}/download`, {
            responseType: 'blob',
        });
        const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `Invoice_${invoiceNumber}.pdf`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },
};
