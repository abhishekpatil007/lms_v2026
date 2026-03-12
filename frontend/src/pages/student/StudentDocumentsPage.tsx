import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    IconFileText,
    IconDownload,
    IconFilter,
    IconSearch,
    IconFileTypePdf,
    IconFileTypeDoc,
    IconFileTypePpt,
    IconLayoutGrid,
    IconLayoutList,
    IconFile
} from '@tabler/icons-react';
import { documentsApi } from '@/api/endpoints/documents';
import { topicsApi } from '@/api/endpoints/topics';
import type { Document, Topic } from '@/types';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { TopicAccordion } from '@/components/topics/TopicAccordion';

export const StudentDocumentsPage = () => {
    const [allDocuments, setAllDocuments] = useState<Document[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [selectedLanguage, setSelectedLanguage] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'topic' | 'grid'>('topic');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [{ documents: docs }, { topics: topicData }] = await Promise.all([
                documentsApi.list(),
                topicsApi.listByBatch('enrolled')
            ]).catch(async (err) => {
                const { documents: d } = await documentsApi.list();
                return [{ documents: d }, { topics: [] as Topic[] }];
            }) as [{ documents: Document[] }, { topics: Topic[] }];

            setAllDocuments(docs);
            setTopics(topicData);
        } catch (error) {
            console.error('Error fetching student document data:', error);
            toast.error('Failed to load documents');
        } finally {
            setLoading(false);
        }
    };

    // Group documents by topic
    const groupedTopics = useMemo(() => {
        const filtered = selectedLanguage 
            ? allDocuments.filter(d => d.language === selectedLanguage)
            : allDocuments;

        const topicList: Topic[] = topics.map(t => ({
            ...t,
            documents: filtered.filter(d => d.topic_id === t.id)
        }));

        const untrackedDocs = filtered.filter(d => !d.topic_id);
        if (untrackedDocs.length > 0) {
            topicList.push({
                id: 0,
                title: 'General Resources',
                description: 'Documents not assigned to a specific module',
                order_index: 999,
                batch_id: 'all',
                createdAt: '',
                updatedAt: '',
                documents: untrackedDocs
            });
        }

        return topicList.sort((a, b) => a.order_index - b.order_index);
    }, [allDocuments, topics, selectedLanguage]);

    const handleDownload = async (doc: Document) => {
        try {
            setDownloadingId(doc.id);
            const blob = await documentsApi.download(doc.id);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            const fileName = doc.file_name || doc.file_path.split('/').pop() || doc.title || 'document';
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
                className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6"
            >
                <div>
                    <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-2">
                        Document Library
                    </h1>
                    <p className="text-gray-500 text-lg">
                        Study materials and resources organized for your progress
                    </p>
                </div>

                <div className="flex items-center gap-2 p-1.5 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <button
                        onClick={() => setViewMode('topic')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                            viewMode === 'topic' ? "bg-[#2D2D2D] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
                        )}
                    >
                        <IconLayoutList size={18} />
                        Topic View
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                            viewMode === 'grid' ? "bg-[#2D2D2D] text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
                        )}
                    >
                        <IconLayoutGrid size={18} />
                        Grid View
                    </button>
                </div>
            </motion.div>

            {/* Filters */}
            {allDocuments.length > 0 && (
                <div className="mb-8 flex flex-wrap items-center gap-4">
                    <div className="relative min-w-[200px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <IconFilter className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                            value={selectedLanguage}
                            onChange={(e) => setSelectedLanguage(e.target.value)}
                            className="pl-10 pr-10 py-2.5 w-full rounded-xl border border-gray-200 bg-white text-gray-700 outline-none focus:ring-2 focus:ring-[#A78BFA]/20 focus:border-[#A78BFA] appearance-none cursor-pointer font-medium"
                        >
                            <option value="">All Languages</option>
                            {Array.from(new Set(allDocuments.map(d => d.language).filter(Boolean))).sort().map(lang => (
                                <option key={lang} value={lang!}>{lang}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* Content Area */}
            {loading ? (
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#A78BFA]"></div>
                </div>
            ) : viewMode === 'topic' ? (
                <TopicAccordion 
                    topics={groupedTopics} 
                    resourceType="document" 
                    onResourceClick={(res) => handleDownload(res as Document)} 
                />
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {allDocuments.filter(d => !selectedLanguage || d.language === selectedLanguage).map((doc, idx) => (
                        <motion.div
                            key={doc.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            className="group relative bg-white rounded-[24px] p-6 shadow-sm border border-gray-100 hover:shadow-xl hover:border-[#A78BFA]/30 transition-all"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="p-3 bg-gray-50 rounded-xl group-hover:bg-[#A78BFA]/10 transition-colors">
                                    {getFileIcon(doc.file_type)}
                                </div>
                                <span className="text-[10px] font-bold px-2.5 py-1 bg-gray-100 text-gray-600 rounded-lg uppercase tracking-wider">
                                    {doc.file_type}
                                </span>
                            </div>

                            <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-[#A78BFA] transition-colors" title={doc.title}>
                                {doc.title}
                            </h3>

                            <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-6">
                                <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                                <span>•</span>
                                <span>{doc.language || 'English'}</span>
                            </div>

                            <div className="pt-4 border-t border-gray-50 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-xs text-gray-600 font-bold border border-white shadow-sm">
                                        {doc.uploader?.name?.charAt(0) || 'A'}
                                    </div>
                                    <span className="text-xs text-gray-500 font-medium truncate max-w-[100px]">
                                        {doc.uploader?.name || 'Instructor'}
                                    </span>
                                </div>

                                <button
                                    onClick={() => handleDownload(doc)}
                                    disabled={downloadingId === doc.id}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#2D2D2D] text-white text-xs font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
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
