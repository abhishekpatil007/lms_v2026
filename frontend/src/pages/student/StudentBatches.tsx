import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    IconSchool,
    IconVideo,
    IconFileText,
    IconBrandZoom,
    IconClock,
    IconUser,
    IconCalendar,
    IconChevronRight,
    IconChecklist,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { batchesApi } from '@/api/endpoints/batches';
import { videosApi } from '@/api/endpoints/videos';
import { documentsApi } from '@/api/endpoints/documents';
import { liveClassesApi } from '@/api/endpoints/liveClasses';
import { testsApi } from '@/api/endpoints/tests';
import type { Batch } from '@/types';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const fadeUp = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.35 } } };

const statusColors: Record<string, { bg: string; text: string }> = {
    ongoing: { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    completed: { bg: 'bg-violet-100', text: 'text-violet-700' },
    draft: { bg: 'bg-amber-100', text: 'text-amber-700' },
    inactive: { bg: 'bg-rose-100', text: 'text-rose-700' },
};

const palette = [
    'from-violet-500 to-purple-600',
    'from-emerald-500 to-teal-600',
    'from-sky-500 to-blue-600',
    'from-amber-500 to-orange-600',
];

interface BatchContent {
    videos: number;
    documents: number;
    liveClasses: number;
    tests: number;
}

export const StudentBatches = () => {
    const navigate = useNavigate();
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);
    const [contentMap, setContentMap] = useState<Record<string, BatchContent>>({});
    const [loadingContent, setLoadingContent] = useState(false);

    useEffect(() => {
        fetchBatches();
    }, []);

    const fetchBatches = async () => {
        try {
            setLoading(true);
            const { batches } = await batchesApi.getStudentBatches();
            setBatches(batches);

            // Fetch content counts for each batch in parallel
            setLoadingContent(true);
            const results = await Promise.all(
                batches.map(async (batch) => {
                    const [vRes, dRes, lcRes, tRes] = await Promise.all([
                        videosApi.list({ batch_id: batch.id }).catch(() => ({ videos: [] })),
                        documentsApi.list({ batch_id: batch.id }).catch(() => ({ documents: [] })),
                        liveClassesApi.listByBatch(batch.id).catch(() => ({ liveClasses: [] })),
                        testsApi.list({ batch_id: batch.id }).catch(() => ({ tests: [] })),
                    ]);
                    return {
                        id: batch.id,
                        content: {
                            videos: (vRes as any).total ?? vRes.videos?.length ?? 0,
                            documents: (dRes as any).total ?? dRes.documents?.length ?? 0,
                            liveClasses: (lcRes as any).total ?? lcRes.liveClasses?.length ?? 0,
                            tests: (tRes as any).total ?? tRes.tests?.length ?? 0,
                        },
                    };
                })
            );
            const map: Record<string, BatchContent> = {};
            results.forEach((r) => { map[r.id] = r.content; });
            setContentMap(map);
        } catch (error) {
            console.error('Error fetching batches:', error);
        } finally {
            setLoading(false);
            setLoadingContent(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                    <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600 mx-auto mb-4" />
                    <p className="text-gray-500">Loading your batches...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto">
            <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
                <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-2">My Batches</h1>
                <p className="text-gray-500 text-lg">Your enrolled courses and learning paths</p>
            </motion.div>

            {batches.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-80 rounded-2xl bg-white border-2 border-dashed border-gray-200"
                >
                    <IconSchool className="w-16 h-16 text-gray-300 mb-4" strokeWidth={1.5} />
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No Batches Yet</h3>
                    <p className="text-gray-500 text-sm text-center max-w-sm">
                        You haven't been enrolled in any batches. Contact your administrator to get started.
                    </p>
                </motion.div>
            ) : (
                <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
                    {batches.map((batch, idx) => {
                        const colors = statusColors[batch.status] || { bg: 'bg-gray-100', text: 'text-gray-600' };
                        const content = contentMap[batch.id];
                        const grad = palette[idx % palette.length];

                        return (
                            <motion.div
                                key={batch.id}
                                variants={fadeUp}
                                className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-lg transition-shadow"
                            >
                                {/* Gradient header */}
                                <div className={cn('bg-gradient-to-r p-4 sm:p-5 md:p-6', grad)}>
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div>
                                            <h2 className="text-lg sm:text-xl font-bold text-white mb-1">{batch.batch_name}</h2>
                                            {batch.course && (
                                                <p className="text-white/70 text-sm">{batch.course.title}</p>
                                            )}
                                        </div>
                                        <span className={cn('inline-flex self-start items-center rounded-full px-3 py-1 text-xs font-bold', colors.bg, colors.text)}>
                                            {batch.status}
                                        </span>
                                    </div>

                                    <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-white/70">
                                        {batch.instructor && (
                                            <span className="flex items-center gap-1.5">
                                                <IconUser size={14} />
                                                {batch.instructor.name}
                                            </span>
                                        )}
                                        <span className="flex items-center gap-1.5">
                                            <IconCalendar size={14} />
                                            {new Date(batch.start_date).toLocaleDateString()} - {new Date(batch.end_date).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>

                                {/* Content counts */}
                                <div className="p-4 sm:p-5 md:p-6">
                                    {loadingContent && !content ? (
                                        <div className="flex items-center gap-2 text-sm text-gray-400">
                                            <div className="w-4 h-4 border-2 border-violet-300 border-t-transparent rounded-full animate-spin" />
                                            Loading content...
                                        </div>
                                    ) : content ? (
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            <button
                                                onClick={() => navigate('/student/videos')}
                                                className="flex items-center gap-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 p-3 transition-colors group"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-emerald-100 group-hover:bg-emerald-200 flex items-center justify-center transition-colors">
                                                    <IconVideo className="w-5 h-5 text-emerald-600" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-lg font-bold text-gray-900">{content.videos}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Videos</p>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => navigate('/student/documents')}
                                                className="flex items-center gap-3 rounded-xl bg-amber-50 hover:bg-amber-100 p-3 transition-colors group"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-amber-100 group-hover:bg-amber-200 flex items-center justify-center transition-colors">
                                                    <IconFileText className="w-5 h-5 text-amber-600" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-lg font-bold text-gray-900">{content.documents}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Documents</p>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => navigate('/student/live-classes')}
                                                className="flex items-center gap-3 rounded-xl bg-sky-50 hover:bg-sky-100 p-3 transition-colors group"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-sky-100 group-hover:bg-sky-200 flex items-center justify-center transition-colors">
                                                    <IconBrandZoom className="w-5 h-5 text-sky-600" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-lg font-bold text-gray-900">{content.liveClasses}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Classes</p>
                                                </div>
                                            </button>
                                            <button
                                                onClick={() => navigate('/student/tests')}
                                                className="flex items-center gap-3 rounded-xl bg-violet-50 hover:bg-violet-100 p-3 transition-colors group"
                                            >
                                                <div className="w-10 h-10 rounded-lg bg-violet-100 group-hover:bg-violet-200 flex items-center justify-center transition-colors">
                                                    <IconChecklist className="w-5 h-5 text-violet-600" />
                                                </div>
                                                <div className="text-left">
                                                    <p className="text-lg font-bold text-gray-900">{content.tests}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Tests</p>
                                                </div>
                                            </button>
                                        </div>
                                    ) : null}
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            )}
        </div>
    );
};
