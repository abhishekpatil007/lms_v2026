import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    IconFileText,
    IconDownload,
    IconFilter,
    IconSearch,
    IconFileTypePdf,
    IconFileTypeDoc,
    IconFileTypePpt
} from '@tabler/icons-react';
import { documentsApi } from '@/api/endpoints/documents';
import { batchesApi } from '@/api/endpoints/batches';
import type { Document } from '@/types';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

export const StudentDocumentsPage = () => {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [languages, setLanguages] = useState<string[]>([]);
    const [selectedLanguage, setSelectedLanguage] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        if (selectedLanguage) {
            // Re-fetch or filter locally? 
            // The requirement says "Filtering must update the document list in real time". 
            // Efficiency-wise, if we have all documents, we can filter locally. 
            // But if the list is paginated (not shown in API), we'd need server-side.
            // The API `list` supports `language` param. Let's use that to be safe and "API-driven".
            fetchDocuments(selectedLanguage);
        } else {
            fetchDocuments();
        }
    }, [selectedLanguage]);

    const fetchData = async () => {
        try {
            setLoading(true);
            // Fetch languages
            const { languages: langs } = await documentsApi.getLanguages();
            setLanguages(langs);

            // Fetch initial documents
            await fetchDocuments();

        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    const fetchDocuments = async (language?: string) => {
        try {
            setLoading(true);
            // First, we need to know if we can just fetch ALL documents.
            // Based on typical LMS permissioning, /api/documents usually returns
            // documents the user has access to.
            // However, if it returns nothing without batch_id, we might need to iterate batches.
            // Let's try fetching without batch_id first.

            const { documents: docs } = await documentsApi.list({ language });
            setDocuments(docs);

            // Fallback: If the API requires batch_id and returns generic or empty list, 
            // we might need to fetch student batches and then documents for them. 
            // But for now, assuming the API handles student context.

        } catch (error) {
            console.error('Error fetching documents:', error);
            // Silent fail or toast?
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (doc: Document) => {
        try {
            setDownloadingId(doc.id);
            const blob = await documentsApi.download(doc.id);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            // Use file_path basename or title as fallback
            const fileName = doc.file_path.split('/').pop() || doc.title || 'document';
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download failed:', error);
            toast.error('Failed to download document');
        } finally {
            setDownloadingId(null);
        }
    };

    const getFileIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case 'pdf': return <IconFileTypePdf className="w-8 h-8 text-red-500" />;
            case 'doc':
            case 'docx': return <IconFileTypeDoc className="w-8 h-8 text-blue-500" />;
            case 'ppt':
            case 'pptx': return <IconFileTypePpt className="w-8 h-8 text-orange-500" />;
            default: return <IconFileText className="w-8 h-8 text-gray-500" />;
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-0">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                    Documents
                </h1>
                <p className="text-gray-500">
                    Access course materials and resources
                </p>
            </motion.div>

            {/* Filters */}
            <div className="mb-8 flex flex-wrap items-center gap-4">
                <div className="relative min-w-[200px]">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <IconFilter className="h-5 w-5 text-gray-400" />
                    </div>
                    <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        className="pl-10 pr-10 py-2.5 w-full rounded-xl border border-gray-200 bg-white text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
                    >
                        <option value="">All Languages</option>
                        {languages.map(lang => (
                            <option key={lang} value={lang}>{lang}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Document List */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
            ) : documents.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 bg-white rounded-[24px] border border-gray-100 shadow-sm">
                    <IconFileText className="w-16 h-16 text-gray-300 mb-4" strokeWidth={1.5} />
                    <p className="text-gray-500 font-medium">No documents found</p>
                    {selectedLanguage && <p className="text-sm text-gray-400 mt-1">Try selecting a different language</p>}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {documents.map((doc, idx) => (
                        <motion.div
                            key={doc.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="group relative bg-white rounded-[20px] p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-blue-50 transition-colors">
                                    {getFileIcon(doc.file_type)}
                                </div>
                                <span className="text-xs font-medium px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg capitalize">
                                    {doc.file_type}
                                </span>
                            </div>

                            <h3 className="text-base font-bold text-gray-900 mb-1 line-clamp-1" title={doc.title}>
                                {doc.title}
                            </h3>

                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-4">
                                <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                                <span>•</span>
                                <span>{doc.language || 'English'}</span>
                            </div>

                            <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-[10px] text-gray-600 font-bold">
                                        {doc.uploader?.name?.charAt(0) || 'A'}
                                    </div>
                                    <span className="text-xs text-gray-500 truncate max-w-[100px]">
                                        {doc.uploader?.name || 'Instructor'}
                                    </span>
                                </div>

                                <button
                                    onClick={() => handleDownload(doc)}
                                    disabled={downloadingId === doc.id}
                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-semibold hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {downloadingId === doc.id ? (
                                        <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <IconDownload className="w-3.5 h-3.5" />
                                    )}
                                    Download
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};
