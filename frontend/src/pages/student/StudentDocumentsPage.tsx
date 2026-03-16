import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
    IconFile,
    IconX,
    IconEye,
    IconSortAscending,
    IconSortDescending,
    IconChevronDown,
    IconChevronRight,
    IconCalendar,
    IconLanguage,
    IconUser,
} from '@tabler/icons-react';
import { documentsApi } from '@/api/endpoints/documents';
import { topicsApi } from '@/api/endpoints/topics';
import type { Document, Topic } from '@/types';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

// ---------------------------------------------------------------------------
// File type config
// ---------------------------------------------------------------------------
const fileTypeConfig: Record<string, { icon: React.ReactNode; iconLg: React.ReactNode; color: string; bg: string; bgLight: string; border: string; label: string }> = {
    pdf: {
        icon: <IconFileTypePdf className="w-6 h-6 text-red-500" />,
        iconLg: <IconFileTypePdf className="w-10 h-10 text-red-500" />,
        color: 'text-red-500', bg: 'bg-red-50', bgLight: 'bg-red-50/60', border: 'border-red-100', label: 'PDF',
    },
    doc: {
        icon: <IconFileTypeDoc className="w-6 h-6 text-blue-500" />,
        iconLg: <IconFileTypeDoc className="w-10 h-10 text-blue-500" />,
        color: 'text-blue-500', bg: 'bg-blue-50', bgLight: 'bg-blue-50/60', border: 'border-blue-100', label: 'DOC',
    },
    docx: {
        icon: <IconFileTypeDoc className="w-6 h-6 text-blue-500" />,
        iconLg: <IconFileTypeDoc className="w-10 h-10 text-blue-500" />,
        color: 'text-blue-500', bg: 'bg-blue-50', bgLight: 'bg-blue-50/60', border: 'border-blue-100', label: 'DOCX',
    },
    ppt: {
        icon: <IconFileTypePpt className="w-6 h-6 text-orange-500" />,
        iconLg: <IconFileTypePpt className="w-10 h-10 text-orange-500" />,
        color: 'text-orange-500', bg: 'bg-orange-50', bgLight: 'bg-orange-50/60', border: 'border-orange-100', label: 'PPT',
    },
    pptx: {
        icon: <IconFileTypePpt className="w-6 h-6 text-orange-500" />,
        iconLg: <IconFileTypePpt className="w-10 h-10 text-orange-500" />,
        color: 'text-orange-500', bg: 'bg-orange-50', bgLight: 'bg-orange-50/60', border: 'border-orange-100', label: 'PPTX',
    },
};
const defaultFileType = {
    icon: <IconFileText className="w-6 h-6 text-gray-500" />,
    iconLg: <IconFileText className="w-10 h-10 text-gray-500" />,
    color: 'text-gray-500', bg: 'bg-gray-50', bgLight: 'bg-gray-50/60', border: 'border-gray-100', label: 'FILE',
};
const getConfig = (type: string) => fileTypeConfig[type?.toLowerCase()] || defaultFileType;

// ---------------------------------------------------------------------------
// Document Preview Modal
// ---------------------------------------------------------------------------
const DocumentPreviewModal: React.FC<{
    doc: Document | null;
    onClose: () => void;
    onDownload: (doc: Document) => void;
}> = ({ doc, onClose, onDownload }) => {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [loadingPreview, setLoadingPreview] = useState(false);
    const isPdf = doc?.file_type?.toLowerCase() === 'pdf';

    useEffect(() => {
        if (!doc || !isPdf) { setPreviewUrl(null); return; }
        let url: string | null = null;
        setLoadingPreview(true);
        documentsApi.download(doc.id)
            .then((blob) => {
                url = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
                setPreviewUrl(url);
            })
            .catch(() => setPreviewUrl(null))
            .finally(() => setLoadingPreview(false));
        return () => { if (url) URL.revokeObjectURL(url); };
    }, [doc]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    useEffect(() => {
        if (!doc) return;
        try {
            const key = 'lms_recent_documents';
            const recent = JSON.parse(localStorage.getItem(key) || '[]');
            const filtered = recent.filter((r: any) => r.id !== doc.id);
            filtered.unshift({ id: doc.id, title: doc.title, file_type: doc.file_type, viewedAt: new Date().toISOString() });
            localStorage.setItem(key, JSON.stringify(filtered.slice(0, 10)));
        } catch {}
    }, [doc]);

    if (!doc) return null;
    const cfg = getConfig(doc.file_type);

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25 }}
                    className="bg-white rounded-2xl overflow-hidden w-full max-w-4xl max-h-[90vh] shadow-2xl flex flex-col"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 shrink-0">
                        <div className="flex items-center gap-3 min-w-0">
                            <div className={cn("p-2.5 rounded-xl shrink-0", cfg.bg)}>
                                {cfg.icon}
                            </div>
                            <div className="min-w-0">
                                <h3 className="font-bold text-gray-900 text-sm sm:text-base truncate">{doc.title}</h3>
                                <div className="flex items-center gap-2 mt-0.5">
                                    <span className={cn("text-[10px] font-bold uppercase tracking-wider", cfg.color)}>{doc.file_type}</span>
                                    {doc.language && <span className="text-[10px] text-gray-400">&middot; {doc.language}</span>}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 ml-3">
                            <button
                                onClick={() => onDownload(doc)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition-colors"
                            >
                                <IconDownload size={14} />
                                <span className="hidden sm:inline">Download</span>
                            </button>
                            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors p-1">
                                <IconX size={20} />
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto bg-gray-50 min-h-0">
                        {isPdf ? (
                            loadingPreview ? (
                                <div className="flex items-center justify-center h-96">
                                    <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : previewUrl ? (
                                <iframe src={previewUrl} className="w-full h-[70vh]" title={doc.title} />
                            ) : (
                                <NoPreview doc={doc} onDownload={onDownload} />
                            )
                        ) : (
                            <NoPreview doc={doc} onDownload={onDownload} />
                        )}
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

const NoPreview: React.FC<{ doc: Document; onDownload: (d: Document) => void }> = ({ doc, onDownload }) => {
    const cfg = getConfig(doc.file_type);
    return (
        <div className="flex flex-col items-center justify-center h-96 text-center p-6">
            <div className={cn("w-24 h-24 rounded-3xl flex items-center justify-center mb-6", cfg.bg)}>
                {cfg.iconLg}
            </div>
            <p className="font-semibold text-gray-700 mb-1">{doc.file_type?.toLowerCase() === 'pdf' ? 'Preview not available' : `No preview for .${doc.file_type} files`}</p>
            <p className="text-sm text-gray-400 mb-6">Download the file to view its contents</p>
            <button
                onClick={() => onDownload(doc)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-900 text-white text-sm font-bold hover:bg-gray-800 transition-colors"
            >
                <IconDownload size={16} />
                Download File
            </button>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Topic Accordion (inline, document-specific with richer rows)
// ---------------------------------------------------------------------------
const DocTopicAccordion: React.FC<{
    topics: Topic[];
    onDocClick: (doc: Document) => void;
    onDownload: (doc: Document) => void;
    downloadingId: string | null;
}> = ({ topics, onDocClick, onDownload, downloadingId }) => {
    const [expanded, setExpanded] = useState<number[]>(() => topics.length > 0 ? [topics[0].id] : []);
    const toggle = (id: number) => setExpanded(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    if (!topics || topics.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-20 bg-white/50 rounded-2xl border-2 border-dashed border-gray-200">
                <IconFileText className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-bold text-gray-900 mb-1">No Documents Found</h3>
                <p className="text-gray-500 text-sm">No documents match your current filters</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {topics.map((topic, idx) => {
                const docs = topic.documents || [];
                const isOpen = expanded.includes(topic.id);

                return (
                    <motion.div
                        key={topic.id}
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.06 }}
                        className={cn(
                            "rounded-2xl border overflow-hidden transition-all",
                            isOpen ? "border-violet-200 bg-white shadow-lg shadow-violet-500/5" : "border-gray-100 bg-white shadow-sm hover:shadow-md"
                        )}
                    >
                        <button
                            onClick={() => toggle(topic.id)}
                            className="flex w-full items-center justify-between p-4 sm:p-5 text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className={cn(
                                    "flex h-10 w-10 items-center justify-center rounded-xl transition-all shrink-0",
                                    isOpen ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-400"
                                )}>
                                    {isOpen ? <IconChevronDown size={20} /> : <IconChevronRight size={20} />}
                                </div>
                                <div>
                                    <h4 className="text-sm sm:text-base font-bold text-gray-900">{topic.title}</h4>
                                    <span className="text-xs text-gray-400 font-medium">{docs.length} document{docs.length !== 1 ? 's' : ''}</span>
                                </div>
                            </div>

                            {/* File type pills preview */}
                            <div className="hidden sm:flex items-center gap-1.5">
                                {Array.from(new Set(docs.map((d: any) => d.file_type?.toLowerCase()))).slice(0, 4).map((ft: any) => {
                                    const c = getConfig(ft);
                                    return (
                                        <span key={ft} className={cn("px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider", c.bg, c.color)}>
                                            {c.label}
                                        </span>
                                    );
                                })}
                            </div>
                        </button>

                        <AnimatePresence>
                            {isOpen && (
                                <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                                >
                                    <div className="px-4 sm:px-5 pb-4 sm:pb-5 space-y-2">
                                        {docs.length === 0 ? (
                                            <div className="py-6 text-center rounded-xl bg-gray-50 border border-dashed border-gray-200">
                                                <p className="text-sm text-gray-400">No documents in this topic</p>
                                            </div>
                                        ) : (
                                            docs.map((doc: any) => {
                                                const cfg = getConfig(doc.file_type);
                                                return (
                                                    <motion.div
                                                        key={doc.id}
                                                        whileHover={{ x: 2 }}
                                                        className="group flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl bg-gray-50/80 border border-gray-100 hover:border-violet-200 hover:bg-white hover:shadow-sm transition-all cursor-pointer"
                                                        onClick={() => onDocClick(doc)}
                                                    >
                                                        <div className={cn("h-10 w-10 sm:h-11 sm:w-11 rounded-xl flex items-center justify-center shrink-0 transition-colors", cfg.bg, "group-hover:scale-105")}>
                                                            {cfg.icon}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <h5 className="text-sm font-bold text-gray-900 group-hover:text-violet-600 transition-colors truncate">
                                                                {doc.title}
                                                            </h5>
                                                            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400 font-medium">
                                                                <span className={cn("font-bold uppercase", cfg.color)}>{doc.file_type}</span>
                                                                <span>&middot;</span>
                                                                <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                                                                {doc.language && (
                                                                    <>
                                                                        <span className="hidden sm:inline">&middot;</span>
                                                                        <span className="hidden sm:inline">{doc.language}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-1.5 shrink-0">
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onDocClick(doc); }}
                                                                className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-300 hover:bg-violet-100 hover:text-violet-600 transition-all"
                                                                title="Preview"
                                                            >
                                                                <IconEye size={15} />
                                                            </button>
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onDownload(doc); }}
                                                                disabled={downloadingId === doc.id}
                                                                className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-300 hover:bg-gray-900 hover:text-white transition-all disabled:opacity-50"
                                                                title="Download"
                                                            >
                                                                {downloadingId === doc.id ? (
                                                                    <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                                                                ) : (
                                                                    <IconDownload size={15} />
                                                                )}
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })
                                        )}
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.div>
                );
            })}
        </div>
    );
};

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export const StudentDocumentsPage = () => {
    const [allDocuments, setAllDocuments] = useState<Document[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('');
    const [selectedFileType, setSelectedFileType] = useState<string>('all');
    const [loading, setLoading] = useState(true);
    const [downloadingId, setDownloadingId] = useState<string | null>(null);
    const [viewMode, setViewMode] = useState<'topic' | 'grid'>('topic');
    const [previewDoc, setPreviewDoc] = useState<Document | null>(null);
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title_asc' | 'title_desc'>('newest');

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [{ documents: docs }, { topics: topicData }] = await Promise.all([
                documentsApi.list(),
                topicsApi.listByBatch('enrolled')
            ]).catch(async () => {
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

    const sortDocs = (docs: Document[]) => [...docs].sort((a, b) => {
        switch (sortBy) {
            case 'newest': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
            case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            case 'title_asc': return a.title.localeCompare(b.title);
            case 'title_desc': return b.title.localeCompare(a.title);
            default: return 0;
        }
    });

    const filterDocs = (docs: Document[]) => docs.filter(d =>
        (!selectedLanguage || d.language === selectedLanguage) &&
        (!searchQuery || d.title.toLowerCase().includes(searchQuery.toLowerCase())) &&
        (selectedFileType === 'all' || d.file_type?.toLowerCase() === selectedFileType)
    );

    // File type stats
    const fileTypeStats = useMemo(() => {
        const counts: Record<string, number> = {};
        allDocuments.forEach(d => {
            const ft = d.file_type?.toLowerCase() || 'other';
            counts[ft] = (counts[ft] || 0) + 1;
        });
        return counts;
    }, [allDocuments]);

    const uniqueFileTypes = useMemo(() => Object.keys(fileTypeStats).sort(), [fileTypeStats]);

    const groupedTopics = useMemo(() => {
        const filtered = sortDocs(filterDocs(allDocuments));
        const topicList: Topic[] = topics.map(t => ({
            ...t,
            documents: filtered.filter(d => d.topic_id === t.id)
        }));
        const untracked = filtered.filter(d => !d.topic_id);
        if (untracked.length > 0) {
            topicList.push({
                id: 0, title: 'General Resources', description: 'Documents not assigned to a specific module',
                order_index: 999, batch_id: 'all', createdAt: '', updatedAt: '', documents: untracked
            });
        }
        return topicList.filter(t => (t.documents?.length || 0) > 0).sort((a, b) => a.order_index - b.order_index);
    }, [allDocuments, topics, selectedLanguage, searchQuery, sortBy, selectedFileType]);

    const filteredAndSorted = useMemo(() => sortDocs(filterDocs(allDocuments)), [allDocuments, selectedLanguage, searchQuery, sortBy, selectedFileType]);

    const handleDownload = async (doc: Document) => {
        try {
            setDownloadingId(doc.id);
            const blob = await documentsApi.download(doc.id);
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', doc.file_name || doc.file_path?.split('/').pop() || doc.title || 'document');
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

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6 flex flex-col md:flex-row md:items-end justify-between gap-4"
            >
                <div>
                    <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-1">
                        Document Library
                    </h1>
                    <p className="text-gray-500 text-base">
                        {allDocuments.length} document{allDocuments.length !== 1 ? 's' : ''} available
                    </p>
                </div>

                <div className="flex items-center gap-2 p-1.5 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <button
                        onClick={() => setViewMode('topic')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                            viewMode === 'topic' ? "bg-gray-900 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
                        )}
                    >
                        <IconLayoutList size={18} />
                        Topics
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                            viewMode === 'grid' ? "bg-gray-900 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
                        )}
                    >
                        <IconLayoutGrid size={18} />
                        Grid
                    </button>
                </div>
            </motion.div>

            {/* File Type Filter Pills */}
            {!loading && allDocuments.length > 0 && uniqueFileTypes.length > 1 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 }}
                    className="mb-4 flex flex-wrap gap-2"
                >
                    <button
                        onClick={() => setSelectedFileType('all')}
                        className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
                            selectedFileType === 'all'
                                ? "bg-gray-900 text-white shadow-sm"
                                : "bg-white text-gray-500 hover:bg-gray-50 ring-1 ring-inset ring-gray-200"
                        )}
                    >
                        All
                        <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", selectedFileType === 'all' ? "bg-white/20" : "bg-gray-100 text-gray-400")}>
                            {allDocuments.length}
                        </span>
                    </button>
                    {uniqueFileTypes.map(ft => {
                        const cfg = getConfig(ft);
                        const count = fileTypeStats[ft] || 0;
                        return (
                            <button
                                key={ft}
                                onClick={() => setSelectedFileType(selectedFileType === ft ? 'all' : ft)}
                                className={cn(
                                    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
                                    selectedFileType === ft
                                        ? cn(cfg.bg, cfg.color, "ring-1 ring-inset", cfg.border, "shadow-sm")
                                        : "bg-white text-gray-500 hover:bg-gray-50 ring-1 ring-inset ring-gray-200"
                                )}
                            >
                                {cfg.label}
                                <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-bold", selectedFileType === ft ? "bg-white/60" : "bg-gray-100 text-gray-400")}>
                                    {count}
                                </span>
                            </button>
                        );
                    })}
                </motion.div>
            )}

            {/* Search + Filters */}
            {allDocuments.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-6 flex flex-wrap items-center gap-3"
                >
                    <div className="relative flex-1 min-w-[200px]">
                        <IconSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
                        <input
                            type="text"
                            placeholder="Search documents..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 transition-all"
                        />
                    </div>
                    <div className="relative w-full sm:w-auto sm:min-w-[160px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <IconLanguage className="h-4 w-4 text-gray-400" />
                        </div>
                        <select
                            value={selectedLanguage}
                            onChange={(e) => setSelectedLanguage(e.target.value)}
                            className="pl-9 pr-8 py-2.5 w-full rounded-xl border border-gray-200 bg-white text-gray-700 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 appearance-none cursor-pointer font-medium text-sm transition-all"
                        >
                            <option value="">All Languages</option>
                            {Array.from(new Set(allDocuments.map(d => d.language).filter(Boolean))).sort().map(lang => (
                                <option key={lang} value={lang!}>{lang}</option>
                            ))}
                        </select>
                    </div>
                    <div className="relative w-full sm:w-auto sm:min-w-[155px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            {sortBy.includes('desc') || sortBy === 'oldest' ? <IconSortDescending className="h-4 w-4 text-gray-400" /> : <IconSortAscending className="h-4 w-4 text-gray-400" />}
                        </div>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="pl-9 pr-8 py-2.5 w-full rounded-xl border border-gray-200 bg-white text-gray-700 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 appearance-none cursor-pointer font-medium text-sm transition-all"
                        >
                            <option value="newest">Newest</option>
                            <option value="oldest">Oldest</option>
                            <option value="title_asc">A → Z</option>
                            <option value="title_desc">Z → A</option>
                        </select>
                    </div>
                </motion.div>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center h-96">
                    <div className="text-center">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600 mx-auto mb-4" />
                        <p className="text-gray-400 text-sm">Loading documents...</p>
                    </div>
                </div>
            ) : filteredAndSorted.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-20 rounded-2xl bg-white border-2 border-dashed border-gray-200"
                >
                    <IconFileText className="w-16 h-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No Documents Found</h3>
                    <p className="text-gray-500 text-sm mb-4">Try adjusting your search or filters</p>
                    {(searchQuery || selectedLanguage || selectedFileType !== 'all') && (
                        <button
                            onClick={() => { setSearchQuery(''); setSelectedLanguage(''); setSelectedFileType('all'); }}
                            className="text-sm font-semibold text-violet-600 hover:text-violet-700"
                        >
                            Clear all filters
                        </button>
                    )}
                </motion.div>
            ) : viewMode === 'topic' ? (
                <DocTopicAccordion
                    topics={groupedTopics}
                    onDocClick={setPreviewDoc}
                    onDownload={handleDownload}
                    downloadingId={downloadingId}
                />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
                    {filteredAndSorted.map((doc, idx) => {
                        const cfg = getConfig(doc.file_type);
                        return (
                            <motion.div
                                key={doc.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.04 }}
                                className="group relative bg-white rounded-2xl border border-gray-100 hover:shadow-xl hover:border-violet-200 transition-all overflow-hidden cursor-pointer"
                                onClick={() => setPreviewDoc(doc)}
                            >
                                {/* Color accent top bar */}
                                <div className={cn("h-1 w-full", cfg.bg.replace('bg-', 'bg-').replace('/50', '-400').replace('50', '400'))}
                                    style={{ backgroundColor: cfg.color.includes('red') ? '#f87171' : cfg.color.includes('blue') ? '#60a5fa' : cfg.color.includes('orange') ? '#fb923c' : '#9ca3af' }}
                                />

                                <div className="p-4 sm:p-5">
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className={cn("p-2.5 rounded-xl shrink-0 transition-transform group-hover:scale-110", cfg.bg)}>
                                            {cfg.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-sm font-bold text-gray-900 line-clamp-2 group-hover:text-violet-600 transition-colors leading-snug" title={doc.title}>
                                                {doc.title}
                                            </h3>
                                            <span className={cn("text-[10px] font-bold uppercase tracking-wider mt-0.5 inline-block", cfg.color)}>
                                                {cfg.label}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Meta */}
                                    <div className="flex items-center gap-3 text-[11px] text-gray-400 mb-4">
                                        <span className="flex items-center gap-1">
                                            <IconCalendar size={12} />
                                            {new Date(doc.createdAt).toLocaleDateString()}
                                        </span>
                                        {doc.language && (
                                            <span className="flex items-center gap-1">
                                                <IconLanguage size={12} />
                                                {doc.language}
                                            </span>
                                        )}
                                    </div>

                                    {/* Footer */}
                                    <div className="flex items-center justify-between pt-3 border-t border-gray-50">
                                        <div className="flex items-center gap-2">
                                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-[10px] text-white font-bold shadow-sm">
                                                {doc.uploader?.name?.charAt(0)?.toUpperCase() || 'I'}
                                            </div>
                                            <span className="text-xs text-gray-500 font-medium truncate max-w-[90px]">
                                                {doc.uploader?.name || 'Instructor'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1.5">
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setPreviewDoc(doc); }}
                                                className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-300 hover:bg-violet-50 hover:text-violet-600 transition-all"
                                                title="Preview"
                                            >
                                                <IconEye size={15} />
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); handleDownload(doc); }}
                                                disabled={downloadingId === doc.id}
                                                className="h-8 w-8 rounded-lg flex items-center justify-center text-gray-300 hover:bg-gray-900 hover:text-white transition-all disabled:opacity-50"
                                                title="Download"
                                            >
                                                {downloadingId === doc.id ? (
                                                    <span className="w-3.5 h-3.5 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                                                ) : (
                                                    <IconDownload size={15} />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Preview Modal */}
            {previewDoc && (
                <DocumentPreviewModal
                    doc={previewDoc}
                    onClose={() => setPreviewDoc(null)}
                    onDownload={handleDownload}
                />
            )}
        </div>
    );
};
