import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    IconSearch,
    IconPlus,
    IconX,
    IconChecklist,
    IconClock,
    IconEdit,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { testsApi } from "@/api/endpoints/tests";
import { batchesApi } from "@/api/endpoints/batches";
import type { Test, Batch } from "@/types";

export const TestsPage = () => {
    const { user } = useAuthStore();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [filterBatch, setFilterBatch] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all");
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
    }, [filterBatch]);

    const fetchTests = async () => {
        try {
            setLoading(true);
            const params: Record<string, string> = {};
            if (filterBatch !== "all") params.batch_id = filterBatch;
            const { tests: data } = await testsApi.list(params);
            setTests(data);
        } catch (error) {
            console.error("Error fetching tests:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchBatches = async () => {
        try {
            const { batches: data } = await batchesApi.list();
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
            // Navigate to builder to add questions
            navigate(`/admin/tests/${newTest.id}/builder`);
        } catch (error) {
            console.error("Error creating test:", error);
            alert("Failed to create test. Please try again.");
        }
    };

    const filteredTests = (tests || []).filter((test) => {
        const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = filterStatus === "all" || test.status === filterStatus;
        return matchesSearch && matchesStatus;
    });

    return (
        <>
            <div className="flex flex-1 overflow-auto">
                <div className="flex h-full w-full flex-1 flex-col gap-5 p-3 sm:p-4 md:p-7">
                    {/* Welcome Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-2">
                            Tests Management
                        </h1>
                        <p className="text-sm md:text-base text-gray-500">
                            Create and manage tests for your batches.
                        </p>
                    </motion.div>

                    {/* Header Card with Filters */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="rounded-2xl bg-white p-4 sm:p-5 md:p-6 border border-gray-200"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center">
                                    <IconChecklist className="w-5 h-5 sm:w-7 sm:h-7 text-white" strokeWidth={2} />
                                </div>
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Tests</h2>
                                    <p className="mt-0.5 text-xs text-gray-500">
                                        Showing {filteredTests.length} tests
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleOpenCreateModal}
                                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                            >
                                <IconPlus className="h-4 w-4" strokeWidth={2.5} />
                                Create Test
                            </button>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <IconSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
                            <input
                                type="text"
                                placeholder="Search tests by title..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-xl border-0 bg-gray-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                            />
                        </div>

                        {/* Filter Pills & Dropdown */}
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                            <span className="text-xs font-semibold text-gray-500 mr-1">Status:</span>
                            {(["all", "draft", "published"] as const).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status)}
                                    className={cn(
                                        "rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all",
                                        filterStatus === status
                                            ? "bg-gray-900 text-white shadow-sm"
                                            : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                                    )}
                                >
                                    {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                                </button>
                            ))}

                            <div className="w-px h-6 bg-gray-200 mx-1" />
                            <span className="text-xs font-semibold text-gray-500 mr-1">Batch:</span>
                            <select
                                value={filterBatch}
                                onChange={(e) => setFilterBatch(e.target.value)}
                                className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900/20 cursor-pointer"
                            >
                                <option value="all">All Batches</option>
                                {(batches || []).map((batch) => (
                                    <option key={batch.id} value={batch.id}>{batch.batch_name}</option>
                                ))}
                            </select>
                        </div>
                    </motion.div>

                    {/* Tests Grid */}
                    {loading ? (
                        <div className="flex items-center justify-center h-64">
                            <div className="text-gray-500 text-lg">Loading tests...</div>
                        </div>
                    ) : filteredTests.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center h-64 rounded-2xl bg-white border border-gray-200"
                        >
                            <IconChecklist className="w-16 h-16 text-gray-300 mb-4" strokeWidth={1.5} />
                            <p className="text-gray-900 font-semibold text-lg mb-1">No tests found</p>
                            <p className="text-gray-500 text-sm mb-4">Create a new test to get started</p>
                            <button
                                onClick={handleOpenCreateModal}
                                className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:shadow-lg transition-all"
                            >
                                <IconPlus className="h-4 w-4" strokeWidth={2.5} />
                                Create Test
                            </button>
                        </motion.div>
                    ) : (
                        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3">
                            {(filteredTests || []).map((test, idx) => (
                                <motion.div
                                    key={test.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="rounded-2xl bg-white p-3 sm:p-4 md:p-5 border border-gray-200 hover:shadow-lg transition-all group"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-2.5">
                                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-500 text-base font-bold text-white shadow-md">
                                                {test.title.charAt(0).toUpperCase()}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="font-semibold text-base text-gray-900 truncate">
                                                    {test.title}
                                                </div>
                                                <div className="text-xs text-gray-500">
                                                    Batch: {test.batch?.batch_name || 'N/A'}
                                                </div>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => navigate(`/admin/tests/${test.id}/builder`)}
                                            className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
                                            title="Edit Questions"
                                        >
                                            <IconEdit className="w-4 h-4" />
                                        </button>
                                    </div>

                                    {test.description && (
                                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                            {test.description}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-2 mb-3">
                                        <span className={cn(
                                            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                                            test.status === 'published' ? "bg-emerald-100 text-emerald-700" :
                                            test.status === 'draft' ? "bg-amber-100 text-amber-700" :
                                            "bg-gray-100 text-gray-700"
                                        )}>
                                            <span className={cn("w-1.5 h-1.5 rounded-full",
                                                test.status === 'published' ? "bg-emerald-500" :
                                                test.status === 'draft' ? "bg-amber-500" :
                                                "bg-gray-500"
                                            )}></span>
                                            {test.status.charAt(0).toUpperCase() + test.status.slice(1)}
                                        </span>
                                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                                            <IconClock className="w-3 h-3" strokeWidth={2} />
                                            {test.duration_minutes}m
                                        </span>
                                    </div>

                                    <div className="text-xs text-gray-400">
                                        Starts: {new Date(test.start_time).toLocaleString()}
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    )}
                </div>
            </div >

            {/* Create Modal */}
            <AnimatePresence>
                {
                    showCreateModal && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
                            onClick={() => setShowCreateModal(false)}
                        >
                            <motion.div
                                initial={{ scale: 0.95, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                exit={{ scale: 0.95, opacity: 0 }}
                                onClick={(e) => e.stopPropagation()}
                                className="w-full max-w-2xl rounded-[28px] bg-white p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
                            >
                                <div className="mb-5 flex items-center justify-between">
                                    <h3 className="text-2xl font-bold text-gray-900">Create New Test</h3>
                                    <button
                                        onClick={() => setShowCreateModal(false)}
                                        className="rounded-full p-1 hover:bg-gray-100 transition-colors"
                                    >
                                        <IconX className="h-5 w-5 text-gray-500" />
                                    </button>
                                </div>

                                <form onSubmit={handleCreateSubmit} className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Test Title *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                                            placeholder="Enter test title"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Description
                                        </label>
                                        <textarea
                                            value={formData.description}
                                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                            rows={3}
                                            className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 resize-none"
                                            placeholder="Enter test description"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Batch *
                                        </label>
                                        <select
                                            required
                                            value={formData.batch_id}
                                            onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                                            className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 cursor-pointer"
                                        >
                                            <option value="">Select a batch</option>
                                            {batches.map(batch => (
                                                <option key={batch.id} value={batch.id}>{batch.batch_name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Start Time *
                                            </label>
                                            <input
                                                type="datetime-local"
                                                required
                                                value={formData.start_time}
                                                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                                                className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                End Time *
                                            </label>
                                            <input
                                                type="datetime-local"
                                                required
                                                value={formData.end_time}
                                                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                                                className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Duration (minutes)
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={formData.duration_minutes}
                                                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 0 })}
                                                className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                Max Attempts
                                            </label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={formData.max_attempts}
                                                onChange={(e) => setFormData({ ...formData, max_attempts: parseInt(e.target.value) || 1 })}
                                                className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-3 pt-2">
                                        <button
                                            type="button"
                                            onClick={() => setShowCreateModal(false)}
                                            className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="flex-1 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                                        >
                                            Create Test
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >
        </>
    );
};
