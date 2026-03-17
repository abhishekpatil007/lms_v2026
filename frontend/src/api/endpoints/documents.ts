// src/api/endpoints/documents.ts
import { apiClient } from '../client';
import type {
  Document,
  DocumentUploadResponse,
  DocumentType
} from '@/types';

export const documentsApi = {
  /**
   * Upload a document (Instructor/Admin only)
   */
  upload: async (data: FormData): Promise<DocumentUploadResponse> => {
    const response = await apiClient.post('/api/documents/upload', data, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  /**
   * List documents with optional filters
   */
  list: async (params?: {
    language?: string;
    batch_id?: string;
    file_type?: DocumentType;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ documents: Document[]; total?: number; totalPages?: number; currentPage?: number }> => {
    const response = await apiClient.get('/api/documents', { params });
    // Robustly handle both { documents: [...] } and direct array [...] from backend
    const documents = Array.isArray(response.data) ? response.data : (response.data.documents || []);
    return { 
      documents, 
      total: response.data.total, 
      totalPages: response.data.totalPages, 
      currentPage: response.data.currentPage 
    };
  },

  /**
   * Get document by ID
   */
  getById: async (documentId: string): Promise<{ document: Document }> => {
    const response = await apiClient.get(`/api/documents/${documentId}`);
    return response.data;
  },

  /**
   * Download document
   */
  download: async (documentId: string): Promise<Blob> => {
    const response = await apiClient.get(`/api/documents/${documentId}/download`, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Delete document (Instructor/Admin only)
   */
  delete: async (documentId: string): Promise<{ message: string }> => {
    const response = await apiClient.delete(`/api/documents/${documentId}`);
    return response.data;
  },

  /**
   * Get unique languages for filtering
   */
  getLanguages: async (): Promise<{ languages: string[] }> => {
    const response = await apiClient.get('/api/documents/languages');
    return response.data;
  },
};
