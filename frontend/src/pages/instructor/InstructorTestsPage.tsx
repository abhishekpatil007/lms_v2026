import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    IconSearch,
    IconPlus,
    IconX,
    IconChecklist,
    IconClock,
    IconCalendar,
    IconChevronRight,
    IconHash,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatDateIST, formatTimeIST } from "@/lib/utils";
import { testsApi } from "@/api/endpoints/tests";
import { batchesApi } from "@/api/endpoints/batches";
import type { Test, Batch } from "@/types";

export const InstructorTestsPage = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [tests, setTests] = useState<Test[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        batch_id: "",
        start_time: "",
        end_time: "",
        duration_minutes: 60,
        max_attempts: 1,
        shuffle_questions: false,
    });

    useEffect(() => {
        fetchTests();
        fetchBatches();
    }, []);

    const fetchTests = async () => {
        try {
            setLoading(true);
            const { tests: data } = await testsApi.list();
            setTests(data);
        } catch (error) {
            console.error("Error fetching tests:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBatches = async () => {
        try {
            const { batches: data } = await batchesApi.getInstructorBatches();
            setBatches(data);
        } catch (error) {
            console.error("Error fetching batches:", error);
        }
    };

    const handleOpenCreateModal = () => {
        setFormData({
            title: "",
            description: "",
            batch_id: "",
            start_time: "",
            end_time: "",
            duration_minutes: 60,
            max_attempts: 1,
            shuffle_questions: false,
        });
        setShowCreateModal(true);
    };

    const handleCreateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const newTest = await testsApi.create(formData);
            setShowCreateModal(false);
            navigate(`/instructor/tests/${newTest.id}/builder`);
        } catch (error) {
            console.error("Error creating test:", error);
            alert("Failed to create test. Please try again.");
        }
    };

    const filteredTests = (tests || []).filter((test) =>
        test.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const draftCount = filteredTests.filter(t => t.status === 'draft').length;
    const publishedCount = filteredTests.filter(t => t.status === 'published').length;

    return (
        <div>
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-3xl md:text-4xl font-extrabold text-gray-900 tracking-tight mb-1">
                    Tests
                </h1>
                <p className="text-gray-500">Create and manage tests for your batches</p>
            </motion.div>

            {/* Controls */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-6 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
            >
                <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="relative flex-1 w-full">
                        <IconSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
                        <input
                            type="text"
                            placeholder="Search tests..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-xl border-2 border-gray-100 bg-gray-50/50 py-2.5 pl-10 pr-4 text-sm outline-none transition-all focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
                        />
                    </div>
                    <button
                        onClick={handleOpenCreateModal}
                        className="shrink-0 flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200/50 hover:shadow-lg transition-all"
                    >
                        <IconPlus size={16} />
                        Create Test
                    </button>
                </div>

                {/* Stats */}
                {!loading && filteredTests.length > 0 && (
                    <div className="mt-3 flex items-center gap-3 text-xs">
                        <span className="text-gray-400 font-medium">{filteredTests.length} tests</span>
                        <span className="h-3 w-px bg-gray-200" />
                        <span className="inline-flex items-center gap-1 text-gray-500">
                            <span className="h-1.5 w-1.5 rounded-full bg-gray-400" />
                            {draftCount} draft
                        </span>
                        <span className="inline-flex items-center gap-1 text-emerald-600">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            {publishedCount} published
                        </span>
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
                    <p className="text-gray-900 font-semibold text-lg mb-1">No tests yet</p>
                    <p className="text-gray-500 text-sm mb-5">Create your first test to get started</p>
                    <button
                        onClick={handleOpenCreateModal}
                        className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-all"
                    >
                        <IconPlus size={16} />
                        Create Test
                    </button>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {filteredTests.map((test, idx) => {
                        const questionCount = test.blocks?.reduce((acc, b) => acc + (b.questions?.length || b.total_questions || 0), 0) || 0;
                        return (
                            <motion.div
                                key={test.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.04 }}
                                className="group rounded-2xl border border-gray-100 bg-white shadow-sm hover:shadow-lg hover:border-gray-200 transition-all cursor-pointer overflow-hidden"
                                onClick={() => navigate(`/instructor/tests/${test.id}/builder`)}
                            >
                                {/* Accent bar */}
                                <div className={cn(
                                    "h-1 bg-gradient-to-r",
                                    test.status === 'published' ? "from-emerald-400 to-teal-500" : "from-gray-300 to-gray-400"
                                )} />

                                <div className="p-3 sm:p-4 md:p-5">
                                    <div className="flex items-start justify-between gap-3 mb-3">
                                        <div className="min-w-0 flex-1">
                                            <h3 className="font-bold text-gray-900 line-clamp-1 group-hover:text-violet-700 transition-colors">
                                                {test.title}
                                            </h3>
                                            <p className="text-xs text-gray-400 mt-0.5 truncate">
                                                {test.batch?.batch_name || 'No batch'}
                                            </p>
                                        </div>
                                        <span className={cn(
                                            "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ring-1 ring-inset",
                                            test.status === 'published' ? "bg-emerald-50 text-emerald-600 ring-emerald-200" : "bg-gray-50 text-gray-500 ring-gray-200"
                                        )}>
                                            {test.status}
                                        </span>
                                    </div>

                                    {test.description && (
                                        <p className="text-xs text-gray-500 mb-3 line-clamp-2 leading-relaxed">{test.description}</p>
                                    )}

                                    {/* Meta pills */}
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        <span className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1 text-[10px] font-medium text-gray-500">
                                            <IconClock size={11} />
                                            {test.duration_minutes}m
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1 text-[10px] font-medium text-gray-500">
                                            <IconHash size={11} />
                                            {test.max_attempts} attempt{test.max_attempts !== 1 ? 's' : ''}
                                        </span>
                                        {questionCount > 0 && (
                                            <span className="inline-flex items-center rounded-lg bg-violet-50 px-2 py-1 text-[10px] font-semibold text-violet-600">
                                                {questionCount} Q
                                            </span>
                                        )}
                                    </div>

                                    {/* Date */}
                                    <div className="flex items-center justify-between">
                                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-400">
                                            <IconCalendar size={11} />
                                            {formatDateIST(test.start_time)}
                                        </span>
                                        <IconChevronRight size={16} className="text-gray-300 group-hover:text-violet-500 transition-colors" />
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            {/* Create Modal */}
            <AnimatePresence>
                {showCreateModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
                        onClick={() => setShowCreateModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
                        >
                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100 bg-gradient-to-r from-gray-50/80 to-white">
                                <div>
                                    <h3 className="text-xl font-bold text-gray-900">Create New Test</h3>
                                    <p className="text-xs text-gray-400 mt-0.5">Fill in the details to create a test</p>
                                </div>
                                <button
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex h-8 w-8 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-all"
                                >
                                    <IconX size={18} />
                                </button>
                            </div>

                            {/* Modal Body */}
                            <form onSubmit={handleCreateSubmit} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Test Title *</label>
                                    <input
                                        type="text"
                                        required
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        className="w-full rounded-xl border-2 border-gray-100 bg-gray-50/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
                                        placeholder="Enter test title"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Description</label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                        className="w-full rounded-xl border-2 border-gray-100 bg-gray-50/50 px-4 py-3 text-sm leading-relaxed outline-none transition-all focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100 resize-none"
                                        placeholder="Describe the test..."
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Batch *</label>
                                    <select
                                        required
                                        value={formData.batch_id}
                                        onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                                        className="w-full rounded-xl border-2 border-gray-100 bg-gray-50/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100 cursor-pointer"
                                    >
                                        <option value="">Select a batch</option>
                                        {batches.map(batch => (
                                            <option key={batch.id} value={batch.id}>{batch.batch_name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Start Time *</label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={formData.start_time}
                                            onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                            className="w-full rounded-xl border-2 border-gray-100 bg-gray-50/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">End Time *</label>
                                        <input
                                            type="datetime-local"
                                            required
                                            value={formData.end_time}
                                            onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                            className="w-full rounded-xl border-2 border-gray-100 bg-gray-50/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Duration (minutes)</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.duration_minutes}
                                            onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                                            className="w-full rounded-xl border-2 border-gray-100 bg-gray-50/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Max Attempts</label>
                                        <input
                                            type="number"
                                            min="1"
                                            value={formData.max_attempts}
                                            onChange={(e) => setFormData({ ...formData, max_attempts: parseInt(e.target.value) || 1 })}
                                            className="w-full rounded-xl border-2 border-gray-100 bg-gray-50/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-violet-300 focus:bg-white focus:ring-4 focus:ring-violet-100"
                                        />
                                    </div>
                                </div>

                                {/* Footer */}
                                <div className="flex gap-3 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowCreateModal(false)}
                                        className="flex-1 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200/50 hover:shadow-lg transition-all"
                                    >
                                        Create Test
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
