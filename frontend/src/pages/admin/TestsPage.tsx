import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
    IconSearch,
    IconPlus,
    IconX,
    IconChecklist,
    IconClock,
    IconEdit,
    IconSortAscending,
    IconFilter,
    IconAlertCircle,
    IconCircleCheck,
    IconSend,
    IconRepeat,
    IconCalendar,
    IconTrash,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatDateTimeIST, toISTDateTimeLocal } from "@/lib/utils";
import { testsApi } from "@/api/endpoints/tests";
import { batchesApi } from "@/api/endpoints/batches";
import type { Test, Batch } from "@/types";

// ---------------------------------------------------------------------------
// Toast notification system
// ---------------------------------------------------------------------------
interface Toast {
    id: number;
    type: "success" | "error" | "info";
    message: string;
}
let toastId = 0;

const ToastContainer = ({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: number) => void }) => (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        <AnimatePresence>
            {toasts.map((t) => (
                <motion.div
                    key={t.id}
                    initial={{ opacity: 0, x: 60, scale: 0.95 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: 60, scale: 0.95 }}
                    className={cn(
                        "flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg border text-sm font-medium",
                        t.type === "success" && "bg-emerald-50 border-emerald-200 text-emerald-800",
                        t.type === "error" && "bg-red-50 border-red-200 text-red-800",
                        t.type === "info" && "bg-blue-50 border-blue-200 text-blue-800"
                    )}
                >
                    {t.type === "success" && <IconCircleCheck className="w-5 h-5 text-emerald-500 shrink-0" />}
                    {t.type === "error" && <IconAlertCircle className="w-5 h-5 text-red-500 shrink-0" />}
                    {t.type === "info" && <IconChecklist className="w-5 h-5 text-blue-500 shrink-0" />}
                    <span className="flex-1">{t.message}</span>
                    <button onClick={() => onDismiss(t.id)} className="text-gray-400 hover:text-gray-600 shrink-0">
                        <IconX className="w-4 h-4" />
                    </button>
                </motion.div>
            ))}
        </AnimatePresence>
    </div>
);

// ---------------------------------------------------------------------------
// Sort helpers
// ---------------------------------------------------------------------------
type SortOption = "newest" | "oldest" | "title_az" | "title_za" | "duration_long" | "duration_short";
const sortLabels: Record<SortOption, string> = {
    newest: "Newest First",
    oldest: "Oldest First",
    title_az: "Title A \u2192 Z",
    title_za: "Title Z \u2192 A",
    duration_long: "Longest Duration",
    duration_short: "Shortest Duration",
};
const applySortTests = (tests: Test[], sort: SortOption): Test[] => {
    const sorted = [...tests];
    switch (sort) {
        case "newest": return sorted.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
        case "oldest": return sorted.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
        case "title_az": return sorted.sort((a, b) => a.title.localeCompare(b.title));
        case "title_za": return sorted.sort((a, b) => b.title.localeCompare(a.title));
        case "duration_long": return sorted.sort((a, b) => (b.duration_minutes || 0) - (a.duration_minutes || 0));
        case "duration_short": return sorted.sort((a, b) => (a.duration_minutes || 0) - (b.duration_minutes || 0));
        default: return sorted;
    }
};

// ---------------------------------------------------------------------------
// Date formatting helper
// ---------------------------------------------------------------------------
const formatDateTime = (dateStr: string | undefined | null): string => {
    return formatDateTimeIST(dateStr || "");
};

export const TestsPage = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [filterBatch, setFilterBatch] = useState<string>("all");
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [sortBy, setSortBy] = useState<SortOption>("newest");
    const [tests, setTests] = useState<Test[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [creatingTest, setCreatingTest] = useState(false);
    const [publishingId, setPublishingId] = useState<number | string | null>(null);
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

    const [editTest, setEditTest] = useState<Test | null>(null);
    const [editData, setEditData] = useState({ title: "", description: "", start_time: "", end_time: "", duration_minutes: 60, max_attempts: 1, shuffle_questions: false });
    const [editSaving, setEditSaving] = useState(false);

    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCount, setTotalCount] = useState(0);
    const itemsPerPage = 9;

    // Toast state
    const [toasts, setToasts] = useState<Toast[]>([]);
    const addToast = useCallback((type: Toast["type"], message: string) => {
        const id = ++toastId;
        setToasts((prev) => [...prev, { id, type, message }]);
        setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
    }, []);
    const dismissToast = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    useEffect(() => {
        setCurrentPage(1);
    }, [filterBatch, filterStatus, searchQuery]);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchTests();
        }, 300);
        return () => clearTimeout(delayDebounceFn);
    }, [currentPage, filterBatch, filterStatus, searchQuery]);

    useEffect(() => {
        fetchBatches();
    }, []);

    const fetchTests = async () => {
        try {
            setLoading(true);
            const params: Record<string, any> = {
                page: currentPage,
                limit: itemsPerPage
            };
            if (filterBatch !== "all") params.batch_id = filterBatch;
            if (filterStatus !== "all") params.status = filterStatus;
            if (searchQuery.trim() !== "") params.search = searchQuery.trim();

            const response = await testsApi.list(params);
            setTests(response.tests);
            if (response.totalPages) setTotalPages(response.totalPages);
            if (response.total !== undefined) setTotalCount(response.total);
        } catch (error) {
            console.error("Error fetching tests:", error);
            addToast("error", "Failed to load tests. Please try again.");
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
            setCreatingTest(true);
            const payload = {
                ...formData,
                start_time: formData.start_time ? formData.start_time + ':00+05:30' : '',
                end_time: formData.end_time ? formData.end_time + ':00+05:30' : '',
            };
            const newTest = await testsApi.create(payload);
            setShowCreateModal(false);
            addToast("success", `Test "${formData.title}" created successfully!`);
            // Navigate to builder to add questions
            navigate(`/admin/tests/${newTest.id}/builder`);
        } catch (error: any) {
            console.error("Error creating test:", error);
            const message = error?.response?.data?.message || "Failed to create test. Please try again.";
            addToast("error", message);
            // Keep the modal open so the user can retry
        } finally {
            setCreatingTest(false);
        }
    };

    const handlePublishTest = async (test: Test) => {
        try {
            setPublishingId(test.id);
            await testsApi.publish(test.id);
            addToast("success", `"${test.title}" published successfully!`);
            await fetchTests();
        } catch (error: any) {
            console.error("Error publishing test:", error);
            const message = error?.response?.data?.message || "Failed to publish test. Please try again.";
            addToast("error", message);
        } finally {
            setPublishingId(null);
        }
    };

    const openEditModal = (test: Test) => {
        setEditData({
            title: test.title,
            description: test.description || "",
            start_time: toISTDateTimeLocal(test.start_time || ""),
            end_time: toISTDateTimeLocal(test.end_time || ""),
            duration_minutes: test.duration_minutes || 60,
            max_attempts: test.max_attempts || 1,
            shuffle_questions: test.shuffle_questions || false,
        });
        setEditTest(test);
    };

    const handleSaveEdit = async () => {
        if (!editTest) return;
        try {
            setEditSaving(true);
            const payload: any = {
                title: editData.title,
                description: editData.description,
                duration_minutes: editData.duration_minutes,
                max_attempts: editData.max_attempts,
                shuffle_questions: editData.shuffle_questions,
            };
            if (editData.start_time) payload.start_time = editData.start_time + ':00+05:30';
            if (editData.end_time) payload.end_time = editData.end_time + ':00+05:30';
            await testsApi.update(editTest.id, payload);
            addToast("success", "Test updated");
            setEditTest(null);
            await fetchTests();
        } catch (error) {
            console.error("Error updating test:", error);
            addToast("error", "Failed to update test");
        } finally {
            setEditSaving(false);
        }
    };

    const handleDeleteTest = async (test: Test) => {
        if (!confirm(`Delete "${test.title}"? This will delete all blocks, questions, and attempts. This cannot be undone.`)) return;
        try {
            await testsApi.delete(test.id);
            addToast("success", `"${test.title}" deleted successfully`);
            await fetchTests();
        } catch (error) {
            console.error("Error deleting test:", error);
            addToast("error", "Failed to delete test. Please try again.");
        }
    };

    const displayTests = applySortTests(tests || [], sortBy);

    const hasActiveFilters = filterStatus !== "all" || filterBatch !== "all" || searchQuery.trim() !== "";

    const clearAllFilters = () => {
        setSearchQuery("");
        setFilterStatus("all");
        setFilterBatch("all");
    };

    return (
        <>
            <ToastContainer toasts={toasts} onDismiss={dismissToast} />

            <div className="flex flex-1 overflow-auto">
                <div className="flex h-full w-full flex-1 flex-col gap-3 sm:gap-5 p-3 sm:p-4 md:p-7">
                    {/* Welcome Header */}
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-gray-900 mb-2">
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
                        className="rounded-2xl bg-white p-3 sm:p-5 md:p-6 border border-gray-200"
                    >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center">
                                    <IconChecklist className="w-5 h-5 sm:w-7 sm:h-7 text-white" strokeWidth={2} />
                                </div>
                                <div>
                                    <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Tests</h2>
                                    <p className="mt-0.5 text-xs text-gray-500">
                                        Showing {displayTests.length}{totalCount > 0 && <> of {totalCount}</>} tests
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

                        {/* Filter Pills, Dropdown & Sort */}
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                            <span className="text-xs font-semibold text-gray-500 mr-1">Status:</span>
                            {(["all", "draft", "published"] as const).map((status) => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status)}
                                    className={cn(
                                        "rounded-xl px-2.5 py-1 sm:px-3.5 sm:py-1.5 text-xs font-semibold transition-all",
                                        filterStatus === status
                                            ? "bg-gray-900 text-white shadow-sm"
                                            : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                                    )}
                                >
                                    {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                                </button>
                            ))}

                            <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />

                            <div className="flex items-center gap-1.5">
                                <IconFilter className="w-3.5 h-3.5 text-gray-400" />
                                <select
                                    value={filterBatch}
                                    onChange={(e) => setFilterBatch(e.target.value)}
                                    className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900/20 cursor-pointer max-w-[130px] sm:max-w-[160px]"
                                >
                                    <option value="all">All Batches</option>
                                    {(batches || []).map((batch) => (
                                        <option key={batch.id} value={batch.id}>{batch.batch_name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Sort */}
                            <div className="flex items-center gap-1.5 sm:ml-auto">
                                <IconSortAscending className="w-3.5 h-3.5 text-gray-400" />
                                <select
                                    value={sortBy}
                                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                                    className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900/20 cursor-pointer"
                                >
                                    {Object.entries(sortLabels).map(([key, label]) => (
                                        <option key={key} value={key}>{label}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Active filter chips */}
                        {hasActiveFilters && (
                            <div className="flex items-center gap-2 pt-2 mt-2 border-t border-gray-100 flex-wrap">
                                <span className="text-xs text-gray-400">Active filters:</span>
                                {searchQuery && (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600">
                                        &ldquo;{searchQuery}&rdquo;
                                        <button onClick={() => setSearchQuery("")} className="hover:text-gray-900"><IconX className="w-3 h-3" /></button>
                                    </span>
                                )}
                                {filterStatus !== "all" && (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600">
                                        {filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
                                        <button onClick={() => setFilterStatus("all")} className="hover:text-gray-900"><IconX className="w-3 h-3" /></button>
                                    </span>
                                )}
                                {filterBatch !== "all" && (
                                    <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600">
                                        {batches.find((b) => b.id === filterBatch)?.batch_name || "Batch"}
                                        <button onClick={() => setFilterBatch("all")} className="hover:text-gray-900"><IconX className="w-3 h-3" /></button>
                                    </span>
                                )}
                                <button onClick={clearAllFilters} className="text-xs text-blue-600 hover:text-blue-700 font-semibold ml-1">
                                    Clear all
                                </button>
                            </div>
                        )}
                    </motion.div>

                    {/* Tests Grid */}
                    {loading ? (
                        /* Skeleton loading cards */
                        <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3">
                            {Array.from({ length: 6 }).map((_, i) => (
                                <div key={i} className="rounded-2xl bg-white border border-gray-200 p-4 sm:p-5 animate-pulse">
                                    <div className="flex items-start gap-2.5 mb-3">
                                        <div className="h-12 w-12 rounded-full bg-gray-100 shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <div className="h-5 bg-gray-100 rounded-lg w-3/4 mb-2" />
                                            <div className="h-3 bg-gray-100 rounded-lg w-1/2" />
                                        </div>
                                        <div className="h-8 w-8 bg-gray-100 rounded-lg shrink-0" />
                                    </div>
                                    <div className="h-4 bg-gray-100 rounded-lg w-full mb-3" />
                                    <div className="flex gap-2 mb-3">
                                        <div className="h-7 bg-gray-100 rounded-full w-20" />
                                        <div className="h-7 bg-gray-100 rounded-full w-14" />
                                        <div className="h-7 bg-gray-100 rounded-full w-16" />
                                    </div>
                                    <div className="h-3 bg-gray-100 rounded-lg w-2/3 mb-2" />
                                    <div className="h-3 bg-gray-100 rounded-lg w-1/2 mb-4" />
                                    <div className="flex gap-2">
                                        <div className="h-9 bg-gray-100 rounded-xl flex-1" />
                                        <div className="h-9 bg-gray-100 rounded-xl flex-1" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : displayTests.length === 0 ? (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center justify-center h-64 rounded-2xl bg-white border border-gray-200"
                        >
                            <IconChecklist className="w-16 h-16 text-gray-300 mb-4" strokeWidth={1.5} />
                            <p className="text-gray-900 font-semibold text-lg mb-1">No tests found</p>
                            <p className="text-gray-500 text-sm mb-4">
                                {hasActiveFilters ? "Try adjusting your search or filters" : "Create a new test to get started"}
                            </p>
                            {hasActiveFilters ? (
                                <button
                                    onClick={clearAllFilters}
                                    className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                                >
                                    Clear all filters
                                </button>
                            ) : (
                                <button
                                    onClick={handleOpenCreateModal}
                                    className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:shadow-lg transition-all"
                                >
                                    <IconPlus className="h-4 w-4" strokeWidth={2.5} />
                                    Create Test
                                </button>
                            )}
                        </motion.div>
                    ) : (
                        <>
                            {/* Results count */}
                            <div className="flex items-center justify-between">
                                <p className="text-sm text-gray-500">
                                    Showing <span className="font-semibold text-gray-700">{displayTests.length}</span>
                                    {totalCount > 0 && <> of <span className="font-semibold text-gray-700">{totalCount}</span></>} tests
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3">
                                {(displayTests || []).map((test, idx) => (
                                    <motion.div
                                        key={test.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: idx * 0.05 }}
                                        className="rounded-2xl bg-white p-3 sm:p-4 md:p-5 border border-gray-200 hover:shadow-lg transition-all group"
                                    >
                                        {/* Header: avatar, title, batch */}
                                        <div className="flex items-start justify-between mb-3">
                                            <div className="flex items-center gap-2.5 min-w-0">
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
                                        </div>

                                        {test.description && (
                                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                                                {test.description}
                                            </p>
                                        )}

                                        {/* Status, duration, attempts badges */}
                                        <div className="flex items-center gap-2 flex-wrap mb-3">
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
                                            {test.max_attempts != null && (
                                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                                    <IconRepeat className="w-3 h-3" strokeWidth={2} />
                                                    {test.max_attempts} {test.max_attempts === 1 ? 'attempt' : 'attempts'}
                                                </span>
                                            )}
                                        </div>

                                        {/* Time info */}
                                        <div className="rounded-xl bg-gray-50 px-3 py-2.5 mb-3 space-y-1">
                                            <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                <IconCalendar className="w-3 h-3 text-gray-400 shrink-0" />
                                                <span className="font-medium text-gray-500">Starts:</span>
                                                <span>{formatDateTime(test.start_time)}</span>
                                            </div>
                                            {test.end_time && (
                                                <div className="flex items-center gap-1.5 text-xs text-gray-600">
                                                    <IconCalendar className="w-3 h-3 text-gray-400 shrink-0" />
                                                    <span className="font-medium text-gray-500">Ends:</span>
                                                    <span>{formatDateTime(test.end_time)}</span>
                                                </div>
                                            )}
                                        </div>

                                        {/* Action buttons */}
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => navigate(`/admin/tests/${test.id}/builder`)}
                                                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold bg-gradient-to-br from-blue-400 to-blue-500 text-white hover:shadow-lg transition-all hover:scale-[1.02]"
                                            >
                                                <IconEdit className="w-3.5 h-3.5" />
                                                Edit Questions
                                            </button>
                                            {test.status === 'draft' && (
                                                <button
                                                    onClick={() => handlePublishTest(test)}
                                                    disabled={publishingId === test.id}
                                                    className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                >
                                                    {publishingId === test.id ? (
                                                        <div className="w-3.5 h-3.5 border-2 border-emerald-300 border-t-emerald-600 rounded-full animate-spin" />
                                                    ) : (
                                                        <IconSend className="w-3.5 h-3.5" />
                                                    )}
                                                    Publish
                                                </button>
                                            )}
                                            <button
                                                onClick={() => openEditModal(test)}
                                                className="rounded-xl px-3 py-2 text-xs font-bold text-gray-500 bg-gray-50 hover:bg-gray-100 transition-all"
                                                title="Edit test details"
                                            >
                                                <IconEdit className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteTest(test)}
                                                className="rounded-xl px-3 py-2 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-all"
                                                title="Delete test"
                                            >
                                                <IconTrash className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex justify-center items-center gap-1.5 sm:gap-2 mt-4 pb-6 md:pb-4">
                                    <button
                                        onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                                        disabled={currentPage === 1}
                                        className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                    >
                                        Prev
                                    </button>
                                    {Array.from({ length: totalPages }, (_, i) => i + 1)
                                        .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                                        .map((page, idx, arr) => (
                                            <React.Fragment key={page}>
                                                {idx > 0 && arr[idx - 1] !== page - 1 && (
                                                    <span className="text-gray-400 text-xs sm:text-sm px-0.5 sm:px-1">&hellip;</span>
                                                )}
                                                <button
                                                    onClick={() => setCurrentPage(page)}
                                                    className={cn(
                                                        "w-7 h-7 sm:w-9 sm:h-9 text-xs sm:text-sm font-bold rounded-xl transition-all",
                                                        currentPage === page
                                                            ? "bg-gray-900 text-white shadow-sm"
                                                            : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50"
                                                    )}
                                                >
                                                    {page}
                                                </button>
                                            </React.Fragment>
                                        ))}
                                    <button
                                        onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                                        disabled={currentPage === totalPages}
                                        className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
                        </>
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
                                            disabled={creatingTest}
                                            className="flex-1 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {creatingTest ? "Creating..." : "Create Test"}
                                        </button>
                                    </div>
                                </form>
                            </motion.div>
                        </motion.div>
                    )
                }
            </AnimatePresence >

            {/* Edit Test Modal */}
            {editTest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setEditTest(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white">
                            <div>
                                <h3 className="text-lg font-bold text-gray-900">Edit Test</h3>
                                <p className="text-xs text-gray-500 truncate max-w-[240px]">{editTest.title}</p>
                            </div>
                            <button onClick={() => setEditTest(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100"><IconX size={18} /></button>
                        </div>
                        <div className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Title</label>
                                <input
                                    type="text"
                                    value={editData.title}
                                    onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Description</label>
                                <textarea
                                    value={editData.description}
                                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                    rows={2}
                                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20 resize-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Start Time (IST)</label>
                                    <input
                                        type="datetime-local"
                                        value={editData.start_time}
                                        onChange={(e) => setEditData({ ...editData, start_time: e.target.value })}
                                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">End Time (IST)</label>
                                    <input
                                        type="datetime-local"
                                        value={editData.end_time}
                                        onChange={(e) => setEditData({ ...editData, end_time: e.target.value })}
                                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Duration (min)</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={editData.duration_minutes}
                                        onChange={(e) => setEditData({ ...editData, duration_minutes: parseInt(e.target.value) || 0 })}
                                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1.5">Max Attempts</label>
                                    <input
                                        type="number"
                                        min={1}
                                        value={editData.max_attempts}
                                        onChange={(e) => setEditData({ ...editData, max_attempts: parseInt(e.target.value) || 1 })}
                                        className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                                    />
                                </div>
                            </div>
                            <label className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    checked={editData.shuffle_questions}
                                    onChange={(e) => setEditData({ ...editData, shuffle_questions: e.target.checked })}
                                />
                                <span className="text-sm text-gray-600">Shuffle Questions</span>
                            </label>
                        </div>
                        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/50 sticky bottom-0">
                            <button onClick={() => setEditTest(null)} className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100">Cancel</button>
                            <button onClick={handleSaveEdit} disabled={editSaving || !editData.title.trim()} className="px-5 py-2 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 disabled:opacity-50">
                                {editSaving ? "Saving..." : "Save Changes"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
