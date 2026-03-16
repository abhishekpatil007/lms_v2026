import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
    IconSchool,
    IconChecklist,
    IconClock,
    IconSearch,
    IconFilter,
    IconTrophy,
    IconPlayerPlay,
    IconCalendar,
    IconAlertCircle,
    IconChevronRight,
    IconHistory,
    IconX,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { testsApi } from "@/api/endpoints/tests";
import { batchesApi } from "@/api/endpoints/batches";
import { attemptsApi } from "@/api/endpoints/attempts";
import type { Test, Batch } from "@/types";

export const StudentTestsPage = () => {
    const navigate = useNavigate();
    const [tests, setTests] = useState<Test[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [attempts, setAttempts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBatchId, setSelectedBatchId] = useState<string>("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [historyTestId, setHistoryTestId] = useState<number | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [testsData, batchesData, attemptsData] = await Promise.all([
                testsApi.list(),
                batchesApi.getStudentBatches(),
                attemptsApi.getMyAttempts()
            ]);
            setTests(testsData.tests);
            setBatches(batchesData.batches);
            setAttempts(attemptsData);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const getTestStatus = (testId: number) => {
        const testAttempts = attempts.filter(a => a.test_id === testId);
        if (testAttempts.length === 0) return { status: 'not_started' as const, attempt: null };
        const ongoing = testAttempts.find(a => a.status === 'ongoing');
        if (ongoing) return { status: 'in_progress' as const, attempt: ongoing };
        const done = testAttempts.find(a => ['submitted', 'evaluated', 'completed'].includes(a.status));
        if (done) return { status: 'completed' as const, attempt: done };
        return { status: 'not_started' as const, attempt: null };
    };

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const getRelativeTime = (dateStr: string) => {
        const now = new Date();
        const target = new Date(dateStr);
        const diffMs = target.getTime() - now.getTime();
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays === 0) return "Today";
        if (diffDays === 1) return "Tomorrow";
        if (diffDays > 1 && diffDays <= 7) return `in ${diffDays} days`;
        return null;
    };

    const getTestTimingInfo = (test: Test) => {
        const now = new Date();
        const start = new Date(test.start_time);
        const end = new Date(test.end_time);
        if (now < start) {
            const rel = getRelativeTime(test.start_time);
            return { label: `Opens ${formatDate(test.start_time)}`, rel: rel ? `Starts ${rel}` : null, type: 'upcoming' as const };
        }
        if (now > end) {
            return { label: 'Expired', rel: null, type: 'expired' as const };
        }
        const rel = getRelativeTime(test.end_time);
        return { label: `Due ${formatDate(test.end_time)}`, rel: rel ? `Due ${rel}` : null, type: 'active' as const };
    };

    const getAttemptCount = (testId: number) => {
        return attempts.filter(a => a.test_id === testId).length;
    };

    // Stats
    const stats = tests.reduce((acc, test) => {
        const { status, attempt } = getTestStatus(test.id);
        if (status === 'not_started') acc.pending++;
        else if (status === 'in_progress') acc.inProgress++;
        else if (status === 'completed' && attempt?.status === 'evaluated') acc.evaluated++;
        else if (status === 'completed') acc.submitted++;
        return acc;
    }, { pending: 0, inProgress: 0, submitted: 0, evaluated: 0 });

    const filteredTests = tests.filter((test) => {
        const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesBatch = selectedBatchId === "all" || test.batch_id === selectedBatchId;
        const { status } = getTestStatus(test.id);
        const matchesStatus = statusFilter === "all" || status === statusFilter;
        return matchesSearch && matchesBatch && matchesStatus;
    });

    const statusConfig = {
        not_started: { gradient: "from-gray-500 to-slate-600", bg: "bg-gray-50", text: "text-gray-600", ring: "ring-gray-200", label: "Not Started", dot: "bg-gray-400" },
        in_progress: { gradient: "from-blue-500 to-indigo-600", bg: "bg-blue-50", text: "text-blue-600", ring: "ring-blue-200", label: "In Progress", dot: "bg-blue-500 animate-pulse" },
        completed: { gradient: "from-emerald-500 to-teal-600", bg: "bg-emerald-50", text: "text-emerald-600", ring: "ring-emerald-200", label: "Completed", dot: "bg-emerald-500" },
    };

    return (
        <div>
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-1">
                    My Tests
                </h1>
                <p className="text-gray-500">View and take your assigned tests</p>
            </motion.div>

            {/* Search & Filter Bar */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            >
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <IconSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
                        <input
                            type="text"
                            placeholder="Search tests..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-xl border-2 border-gray-100 bg-gray-50/50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
                        />
                    </div>
                    <div className="relative w-full md:w-56">
                        <IconFilter className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
                        <select
                            value={selectedBatchId}
                            onChange={(e) => setSelectedBatchId(e.target.value)}
                            className="w-full rounded-xl border-2 border-gray-100 bg-gray-50/50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100 cursor-pointer appearance-none"
                        >
                            <option value="all">All Batches</option>
                            {batches.map(batch => (
                                <option key={batch.id} value={batch.id}>{batch.batch_name}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Status Filters + Stats */}
                {!loading && tests.length > 0 && (
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        {([
                            { key: 'all', label: 'All', count: tests.length },
                            { key: 'not_started', label: 'Not Started', count: stats.pending },
                            { key: 'in_progress', label: 'In Progress', count: stats.inProgress },
                            { key: 'completed', label: 'Completed', count: stats.submitted + stats.evaluated },
                        ] as const).map(({ key, label, count }) => (
                            <button
                                key={key}
                                onClick={() => setStatusFilter(key)}
                                className={cn(
                                    "inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-all",
                                    statusFilter === key
                                        ? "bg-gray-900 text-white shadow-sm"
                                        : "bg-gray-50 text-gray-500 hover:bg-gray-100 ring-1 ring-inset ring-gray-200"
                                )}
                            >
                                {label}
                                <span className={cn(
                                    "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
                                    statusFilter === key ? "bg-white/20 text-white" : "bg-white text-gray-400"
                                )}>
                                    {count}
                                </span>
                            </button>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* Tests Grid */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="relative h-10 w-10">
                        <div className="h-10 w-10 rounded-full border-[3px] border-gray-200" />
                        <div className="absolute inset-0 h-10 w-10 animate-spin rounded-full border-[3px] border-transparent border-t-violet-500" />
                    </div>
                </div>
            ) : filteredTests.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center py-20 rounded-2xl border-2 border-dashed border-gray-200 bg-white/50"
                >
                    <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-500">
                        <IconChecklist size={32} />
                    </div>
                    <p className="text-gray-900 font-semibold text-lg mb-1">No tests found</p>
                    <p className="text-gray-500 text-sm">No tests match your current filters</p>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                    {filteredTests.map((test, idx) => {
                        const { status, attempt } = getTestStatus(test.id);
                        const timing = getTestTimingInfo(test);
                        const attemptCount = getAttemptCount(test.id);
                        const config = statusConfig[status];

                        return (
                            <motion.div
                                key={test.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.04 }}
                                className="group rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-lg hover:border-gray-200 transition-all overflow-hidden"
                            >
                                {/* Top Accent Bar */}
                                <div className={cn("h-1 bg-gradient-to-r", config.gradient)} />

                                <div className="p-3 sm:p-4 md:p-5">
                                    {/* Header */}
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="text-base font-bold text-gray-900 line-clamp-1 mb-0.5">
                                                {test.title}
                                            </h3>
                                            <div className="flex items-center gap-2 text-xs text-gray-400">
                                                <IconSchool size={13} />
                                                <span className="truncate">{test.batch?.batch_name}</span>
                                            </div>
                                        </div>
                                        <span className={cn(
                                            "shrink-0 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold ring-1 ring-inset",
                                            config.bg, config.text, config.ring
                                        )}>
                                            <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
                                            {config.label}
                                        </span>
                                    </div>

                                    {test.description && (
                                        <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">{test.description}</p>
                                    )}

                                    {/* Meta Info */}
                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        <span className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1 text-[10px] font-medium text-gray-500">
                                            <IconClock size={11} />
                                            {test.duration_minutes}m
                                        </span>
                                        <span className={cn(
                                            "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium",
                                            timing.type === 'expired' ? "bg-red-50 text-red-600" :
                                            timing.type === 'upcoming' ? "bg-amber-50 text-amber-600" :
                                            "bg-gray-50 text-gray-500"
                                        )}>
                                            <IconCalendar size={11} />
                                            {timing.label}
                                        </span>
                                        {timing.rel && (
                                            <span className="inline-flex items-center rounded-lg bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-600">
                                                {timing.rel}
                                            </span>
                                        )}
                                        {test.max_attempts > 0 && (
                                            <span className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1 text-[10px] font-medium text-gray-500">
                                                <IconAlertCircle size={11} />
                                                {attemptCount}/{test.max_attempts}
                                            </span>
                                        )}
                                    </div>

                                    {/* Score (if evaluated) */}
                                    {attempt && attempt.score !== null && attempt.status === 'evaluated' && (
                                        <div className="mb-4 rounded-xl bg-gradient-to-r from-emerald-50 to-teal-50 p-3 flex items-center gap-3">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-100">
                                                <IconTrophy size={18} className="text-emerald-600" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-emerald-600 font-medium">Score</p>
                                                <p className="text-lg font-extrabold text-emerald-700">{attempt.score}/{attempt.total_marks}</p>
                                            </div>
                                        </div>
                                    )}

                                    {/* Action Buttons */}
                                    <div className="space-y-2">
                                        {status === 'completed' && attempt?.status === 'evaluated' ? (
                                            <button
                                                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-200/50 hover:shadow-lg transition-all"
                                                onClick={() => navigate(`/student/tests/${attempt.id}/result`)}
                                            >
                                                <IconTrophy size={16} />
                                                View Result
                                            </button>
                                        ) : status === 'completed' ? (
                                            <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-amber-50 py-2.5 text-sm font-semibold text-amber-600 ring-1 ring-inset ring-amber-200">
                                                <IconClock size={16} />
                                                Awaiting Evaluation
                                            </div>
                                        ) : status === 'in_progress' ? (
                                            <button
                                                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 py-2.5 text-sm font-semibold text-white shadow-md shadow-blue-200/50 hover:shadow-lg transition-all"
                                                onClick={() => navigate(`/student/tests/${test.id}/take`)}
                                            >
                                                <IconPlayerPlay size={16} />
                                                Resume Test
                                            </button>
                                        ) : (
                                            <button
                                                className="w-full flex items-center justify-center gap-2 rounded-xl bg-gray-900 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-gray-800 hover:shadow-md transition-all group"
                                                onClick={() => navigate(`/student/tests/${test.id}/take`)}
                                            >
                                                <IconPlayerPlay size={16} />
                                                Start Test
                                                <IconChevronRight size={14} className="opacity-0 -ml-1 group-hover:opacity-100 group-hover:ml-0 transition-all" />
                                            </button>
                                        )}

                                        {/* Attempt History Button */}
                                        {attemptCount > 0 && (
                                            <button
                                                onClick={() => setHistoryTestId(test.id)}
                                                className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-gray-50 py-2 text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-700 ring-1 ring-inset ring-gray-200 transition-all"
                                            >
                                                <IconHistory size={14} />
                                                {attemptCount} Attempt{attemptCount !== 1 ? 's' : ''}
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Attempt History Modal */}
            <AnimatePresence>
                {historyTestId !== null && (() => {
                    const test = tests.find(t => t.id === historyTestId);
                    const testAttempts = attempts
                        .filter(a => a.test_id === historyTestId)
                        .sort((a: any, b: any) => new Date(b.createdAt || b.started_at).getTime() - new Date(a.createdAt || a.started_at).getTime());

                    return (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
                            onClick={() => setHistoryTestId(null)}
                        >
                            <motion.div
                                initial={{ scale: 0.9, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.9, opacity: 0 }}
                                transition={{ type: 'spring', damping: 25 }}
                                className="bg-white rounded-2xl overflow-hidden w-full max-w-lg shadow-2xl"
                                onClick={e => e.stopPropagation()}
                            >
                                <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
                                    <div>
                                        <h3 className="font-bold text-gray-900 text-sm sm:text-base">Attempt History</h3>
                                        <p className="text-xs text-gray-400 truncate">{test?.title}</p>
                                    </div>
                                    <button onClick={() => setHistoryTestId(null)} className="text-gray-400 hover:text-gray-600 p-1">
                                        <IconX size={20} />
                                    </button>
                                </div>
                                <div className="p-4 sm:p-6 max-h-[60vh] overflow-y-auto space-y-3">
                                    {testAttempts.length === 0 ? (
                                        <p className="text-gray-400 text-sm text-center py-8">No attempts recorded</p>
                                    ) : (
                                        testAttempts.map((att: any, i: number) => {
                                            const statusMap: Record<string, { bg: string; text: string; label: string }> = {
                                                evaluated: { bg: 'bg-emerald-50', text: 'text-emerald-700', label: 'Evaluated' },
                                                submitted: { bg: 'bg-amber-50', text: 'text-amber-700', label: 'Submitted' },
                                                completed: { bg: 'bg-blue-50', text: 'text-blue-700', label: 'Completed' },
                                                ongoing: { bg: 'bg-blue-50', text: 'text-blue-600', label: 'In Progress' },
                                            };
                                            const s = statusMap[att.status] || { bg: 'bg-gray-50', text: 'text-gray-600', label: att.status };
                                            const attemptDate = new Date(att.createdAt || att.started_at);

                                            return (
                                                <div
                                                    key={att.id}
                                                    className="rounded-xl border border-gray-100 p-3 sm:p-4 hover:border-gray-200 transition-colors"
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <span className="text-xs font-bold text-gray-400">Attempt #{testAttempts.length - i}</span>
                                                        <span className={cn("inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold", s.bg, s.text)}>
                                                            {s.label}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between">
                                                        <div className="text-xs text-gray-500 space-y-0.5">
                                                            <p className="flex items-center gap-1">
                                                                <IconCalendar size={12} />
                                                                {attemptDate.toLocaleDateString()} at {attemptDate.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            {att.score !== null && att.score !== undefined && (
                                                                <p className="text-lg font-extrabold text-gray-900">
                                                                    {att.score}<span className="text-sm text-gray-400 font-medium">/{att.total_marks}</span>
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                    {att.status === 'evaluated' && (
                                                        <button
                                                            onClick={() => { setHistoryTestId(null); navigate(`/student/tests/${att.id}/result`); }}
                                                            className="mt-2 w-full flex items-center justify-center gap-1.5 rounded-lg bg-emerald-50 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-100 transition-colors"
                                                        >
                                                            <IconTrophy size={13} />
                                                            View Result
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </motion.div>
                        </motion.div>
                    );
                })()}
            </AnimatePresence>
        </div>
    );
};
