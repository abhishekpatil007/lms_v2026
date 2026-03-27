import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  IconSchool,
  IconSearch,
  IconPlus,
  IconBrandZoom,
  IconCalendar,
  IconClock,
  IconX,
  IconTrash,
  IconCheck,
  IconAlertCircle,
  IconCircleCheck,
  IconFilter,
  IconEdit,
  IconCopy,
  IconSortAscending,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatDateIST, formatTimeIST, toISTDateTimeLocal, fromISTToUTC } from "@/lib/utils";
import { liveClassesApi } from "@/api/endpoints/liveClasses";
import { batchesApi } from "@/api/endpoints/batches";
import { useAuthStore } from "@/store/authStore";
import ZoomMeeting from "@/components/Zoom/ZoomMeeting";
import type { LiveClass, LiveClassStatus, Batch } from "@/types";

// ---------------------------------------------------------------------------
// Toast notification system (same pattern as VideosPage)
// ---------------------------------------------------------------------------
interface Toast {
  id: number;
  type: "success" | "error" | "info";
  message: string;
}
let toastId = 0;

const ToastContainer = ({
  toasts,
  onDismiss,
}: {
  toasts: Toast[];
  onDismiss: (id: number) => void;
}) => (
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
          {t.type === "info" && <IconBrandZoom className="w-5 h-5 text-blue-500 shrink-0" />}
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
type SortOption = "newest" | "oldest" | "topic_az" | "topic_za";
const sortLabels: Record<SortOption, string> = {
  newest: "Newest First",
  oldest: "Oldest First",
  topic_az: "Topic A \u2192 Z",
  topic_za: "Topic Z \u2192 A",
};
const applySortClasses = (classes: LiveClass[], sort: SortOption): LiveClass[] => {
  const sorted = [...classes];
  switch (sort) {
    case "newest":
      return sorted.sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
    case "oldest":
      return sorted.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    case "topic_az":
      return sorted.sort((a, b) => a.topic.localeCompare(b.topic));
    case "topic_za":
      return sorted.sort((a, b) => b.topic.localeCompare(a.topic));
    default:
      return sorted;
  }
};

// ---------------------------------------------------------------------------
// Skeleton card for loading state
// ---------------------------------------------------------------------------
const SkeletonCard = () => (
  <div className="rounded-2xl bg-white p-3 sm:p-4 md:p-5 border border-gray-200 animate-pulse">
    <div className="flex items-center gap-4">
      <div className="w-14 h-14 rounded-xl bg-gray-200 shrink-0" />
      <div className="flex-1 min-w-0 space-y-2.5">
        <div className="h-4 bg-gray-200 rounded-lg w-2/3" />
        <div className="flex items-center gap-3">
          <div className="h-3 bg-gray-100 rounded w-20" />
          <div className="h-3 bg-gray-100 rounded w-16" />
          <div className="h-3 bg-gray-100 rounded w-14" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-6 bg-gray-100 rounded-full w-24" />
          <div className="h-6 bg-gray-100 rounded-full w-28" />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-9 bg-gray-200 rounded-xl w-24" />
        <div className="h-9 w-9 bg-gray-100 rounded-xl" />
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const LiveClassesPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<LiveClassStatus | "all">("all");
  const [selectedBatch, setSelectedBatch] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [allClasses, setAllClasses] = useState<LiveClass[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingClass, setEditingClass] = useState<LiveClass | null>(null);
  const [activeZoomMeeting, setActiveZoomMeeting] = useState<any>(null);
  const { user } = useAuthStore();

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

  // Fetch batches on mount, then fetch all classes
  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const { batches: batchData } = await batchesApi.list();
      setBatches(batchData);

      if (batchData.length > 0) {
        await fetchAllClasses(batchData);
      } else {
        setAllClasses([]);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      addToast("error", "Failed to load data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fetchAllClasses = async (batchList: Batch[]) => {
    try {
      const results = await Promise.allSettled(
        batchList.map((batch) => liveClassesApi.listByBatch(batch.id))
      );

      const merged: LiveClass[] = [];
      const seen = new Set<number>();

      results.forEach((result) => {
        if (result.status === "fulfilled" && result.value?.liveClasses) {
          result.value.liveClasses.forEach((cls: LiveClass) => {
            if (!seen.has(cls.id)) {
              seen.add(cls.id);
              merged.push(cls);
            }
          });
        }
      });

      setAllClasses(merged);
    } catch (error) {
      console.error("Error fetching all classes:", error);
      addToast("error", "Failed to load live classes.");
    }
  };

  // Derive filtered + sorted classes
  const filteredClasses = useMemo(() => {
    let classes = [...allClasses];

    // Batch filter
    if (selectedBatch !== "all") {
      classes = classes.filter((cls) => cls.batch_id === selectedBatch);
    }

    // Status filter
    if (filterStatus !== "all") {
      classes = classes.filter((cls) => cls.status === filterStatus);
    }

    // Search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      classes = classes.filter(
        (cls) =>
          cls.topic.toLowerCase().includes(q) ||
          cls.description?.toLowerCase().includes(q) ||
          cls.batch?.batch_name?.toLowerCase().includes(q)
      );
    }

    return applySortClasses(classes, sortBy);
  }, [allClasses, selectedBatch, filterStatus, searchQuery, sortBy]);

  const getStatusColor = (status: LiveClassStatus) => {
    switch (status) {
      case "scheduled":
        return { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500", icon: IconCalendar };
      case "live":
        return { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500", icon: IconCheck };
      case "completed":
        return { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-500", icon: IconCheck };
      case "cancelled":
        return { bg: "bg-rose-100", text: "text-rose-700", dot: "bg-rose-500", icon: IconAlertCircle };
      default:
        return { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500", icon: IconCalendar };
    }
  };

  const formatDateTime = (dateString: string) => {
    return {
      date: formatDateIST(dateString),
      time: formatTimeIST(dateString),
    };
  };

  const handleJoinClass = async (lcId: number) => {
    try {
      const role = user?.role === "admin" || user?.role === "instructor" ? 1 : 0;
      const signatureResponse = await liveClassesApi.getSignature(lcId, { role });
      setActiveZoomMeeting(signatureResponse);
    } catch (error: any) {
      console.error("Error getting Zoom signature:", error);
      addToast("error", error.response?.data?.message || "Failed to join meeting");
    }
  };

  const handleDelete = async (cls: LiveClass) => {
    if (!confirm(`Delete "${cls.topic}"? This action cannot be undone.`)) return;

    try {
      await liveClassesApi.delete(cls.id);
      setAllClasses((prev) => prev.filter((c) => c.id !== cls.id));
      addToast("success", `"${cls.topic}" deleted successfully`);
    } catch (error) {
      console.error("Error deleting live class:", error);
      addToast("error", "Failed to delete live class. Please try again.");
    }
  };

  const handleCreateSuccess = async () => {
    setShowCreateModal(false);
    addToast("success", "Live class scheduled successfully!");
    // Reload all data
    if (batches.length > 0) {
      setLoading(true);
      await fetchAllClasses(batches);
      setLoading(false);
    }
  };

  // Active filters detection
  const hasActiveFilters =
    filterStatus !== "all" || selectedBatch !== "all" || searchQuery.trim() !== "" || sortBy !== "newest";

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setSelectedBatch("all");
    setSortBy("newest");
  };

  // Stats
  const scheduledCount = allClasses.filter((c) => c.status === "scheduled").length;
  const liveCount = allClasses.filter((c) => c.status === "live").length;
  const completedCount = allClasses.filter((c) => c.status === "completed").length;

  // Empty state helpers
  const isFilteredEmpty = filteredClasses.length === 0 && !loading;
  const isCompletelyEmpty = allClasses.length === 0 && !loading;

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="flex flex-1 overflow-auto">
        <div className="flex h-full w-full flex-1 flex-col gap-4 sm:gap-6 p-3 sm:p-4 md:p-7">
          {/* Welcome Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 rounded-[28px] bg-gradient-to-br from-[#C4B5FD] to-[#A78BFA] p-8 shadow-xl"
          >
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-2">
                Live Classes
              </h1>
              <p className="text-sm md:text-base text-white/80">
                Schedule and manage Zoom live classes for your batches.
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#B4F481] to-[#9FE66F] px-5 py-2.5 text-sm font-bold text-[#2D2D2D] shadow-lg hover:shadow-xl transition-all hover:scale-105 w-full sm:w-auto shrink-0"
            >
              <IconPlus className="h-4 w-4" strokeWidth={2.5} />
              Schedule Class
            </button>
          </motion.div>

          {/* Stats Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 gap-2.5 sm:gap-3 md:gap-5 md:grid-cols-4"
          >
            <div className="rounded-2xl bg-white p-3 sm:p-4 md:p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#C4B5FD]/20 flex items-center justify-center">
                  <IconBrandZoom className="w-4 h-4 sm:w-5 sm:h-5 text-[#A78BFA]" strokeWidth={2} />
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total</p>
              </div>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{allClasses.length}</p>
            </div>

            <div className="rounded-2xl bg-white p-3 sm:p-4 md:p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-50 flex items-center justify-center">
                  <IconCalendar className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" strokeWidth={2} />
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Scheduled</p>
              </div>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{scheduledCount}</p>
            </div>

            <div className="rounded-2xl bg-white p-3 sm:p-4 md:p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-[#B4F481]/20 flex items-center justify-center">
                  <IconCheck className="w-4 h-4 sm:w-5 sm:h-5 text-[#9FE66F]" strokeWidth={2} />
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Live Now</p>
              </div>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{liveCount}</p>
            </div>

            <div className="rounded-2xl bg-white p-3 sm:p-4 md:p-5 border border-gray-100 shadow-sm">
              <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-violet-50 flex items-center justify-center">
                  <IconCircleCheck className="w-4 h-4 sm:w-5 sm:h-5 text-violet-500" strokeWidth={2} />
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Done</p>
              </div>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{completedCount}</p>
            </div>
          </motion.div>

          {/* Filters & Search */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl bg-white p-4 sm:p-5 border border-gray-200 space-y-3"
          >
            {/* Search bar */}
            <div className="relative">
              <IconSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
              <input
                type="text"
                placeholder="Search classes by topic, description, or batch..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border-0 bg-gray-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
              />
            </div>

            {/* Filter row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status pills */}
              <span className="text-xs font-semibold text-gray-500 mr-1">Status:</span>
              {(["all", "scheduled", "live", "completed", "cancelled"] as const).map((status) => (
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

              {/* Batch filter */}
              <div className="flex items-center gap-1.5">
                <IconFilter className="w-3.5 h-3.5 text-gray-400" />
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900/20 cursor-pointer max-w-[130px] sm:max-w-[160px]"
                >
                  <option value="all">All Batches</option>
                  {(batches || []).map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batch_name}
                    </option>
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
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Active filter chips */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-xs text-gray-400">Active filters:</span>
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    &ldquo;{searchQuery}&rdquo;
                    <button onClick={() => setSearchQuery("")} className="hover:text-gray-900">
                      <IconX className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filterStatus !== "all" && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    {filterStatus.charAt(0).toUpperCase() + filterStatus.slice(1)}
                    <button onClick={() => setFilterStatus("all")} className="hover:text-gray-900">
                      <IconX className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {selectedBatch !== "all" && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    {batches.find((b) => b.id === selectedBatch)?.batch_name || "Batch"}
                    <button onClick={() => setSelectedBatch("all")} className="hover:text-gray-900">
                      <IconX className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {sortBy !== "newest" && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    {sortLabels[sortBy]}
                    <button onClick={() => setSortBy("newest")} className="hover:text-gray-900">
                      <IconX className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={clearAllFilters}
                  className="text-xs font-semibold text-red-500 hover:text-red-700 transition-colors ml-1"
                >
                  Clear all
                </button>
              </div>
            )}
          </motion.div>

          {/* Classes List */}
          {loading ? (
            <div className="grid grid-cols-1 gap-4">
              {[...Array(4)].map((_, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 + i * 0.05 }}
                >
                  <SkeletonCard />
                </motion.div>
              ))}
            </div>
          ) : isCompletelyEmpty ? (
            /* No classes at all */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center justify-center h-64 rounded-2xl bg-white border border-gray-200"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4">
                <IconBrandZoom className="w-10 h-10 text-white" strokeWidth={1.5} />
              </div>
              <p className="text-gray-900 font-semibold text-base mb-1">No live classes yet</p>
              <p className="text-gray-500 text-sm mb-4">
                Get started by scheduling your first Zoom live class
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:shadow-lg transition-all"
              >
                <IconPlus className="h-4 w-4" strokeWidth={2.5} />
                Schedule Class
              </button>
            </motion.div>
          ) : isFilteredEmpty ? (
            /* Classes exist but filters yield nothing */
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center justify-center h-64 rounded-2xl bg-white border border-gray-200"
            >
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <IconSearch className="w-10 h-10 text-gray-400" strokeWidth={1.5} />
              </div>
              <p className="text-gray-900 font-semibold text-base mb-1">No classes match your filters</p>
              <p className="text-gray-500 text-sm mb-4">
                {selectedBatch !== "all"
                  ? `No classes found in "${batches.find((b) => b.id === selectedBatch)?.batch_name || "this batch"}" with the current filters`
                  : "Try adjusting your search or filter criteria"}
              </p>
              <button
                onClick={clearAllFilters}
                className="flex items-center gap-2 rounded-xl bg-gray-100 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-all"
              >
                <IconX className="h-4 w-4" strokeWidth={2.5} />
                Clear All Filters
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {filteredClasses.map((cls, idx) => {
                const statusColor = getStatusColor(cls.status);
                const { date, time } = formatDateTime(cls.start_time);
                const StatusIcon = statusColor.icon;

                return (
                  <motion.div
                    key={cls.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + idx * 0.05 }}
                    className="rounded-2xl bg-white p-3 sm:p-4 md:p-5 border border-gray-200 hover:shadow-lg transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      {/* Class Icon */}
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white shrink-0 shadow-md">
                        <IconBrandZoom className="w-7 h-7" strokeWidth={2} />
                      </div>

                      {/* Class Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base text-gray-900 mb-1">
                          {cls.topic}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mb-2 flex-wrap">
                          <span className="flex items-center gap-1">
                            <IconCalendar className="w-3.5 h-3.5" strokeWidth={2} />
                            {date}
                          </span>
                          <span className="hidden sm:inline">&#8226;</span>
                          <span className="flex items-center gap-1">
                            <IconClock className="w-3.5 h-3.5" strokeWidth={2} />
                            {cls.duration} minutes
                          </span>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap mb-4">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-sm",
                              statusColor.bg,
                              statusColor.text
                            )}
                          >
                            <StatusIcon className="w-3.5 h-3.5" strokeWidth={2} />
                            {cls.status.charAt(0).toUpperCase() + cls.status.slice(1)}
                          </span>
                          {cls.batch && (
                            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-sm bg-gray-100 text-gray-700">
                              <IconSchool className="w-3.5 h-3.5" strokeWidth={2} />
                              {cls.batch.batch_name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="grid grid-cols-2 gap-2 shrink-0 w-full sm:w-auto">
                        <button
                          onClick={() => {
                            setEditingClass(cls);
                            setShowEditModal(true);
                          }}
                          className="flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all border border-gray-100"
                        >
                          <IconEdit className="w-4 h-4" strokeWidth={2} />
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`https://zoom.us/j/${cls.zoom_meeting_id}`);
                            addToast("success", "Zoom link copied!");
                          }}
                          className="flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold bg-gray-50 text-gray-700 hover:bg-gray-100 transition-all border border-gray-100"
                        >
                          <IconCopy className="w-4 h-4" strokeWidth={2} />
                          Copy Link
                        </button>
                        {(cls.status === "scheduled" || cls.status === "live") && (
                          <button
                            onClick={() => handleJoinClass(cls.id)}
                            className="flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold bg-gradient-to-br from-[#B4F481] to-[#9FE66F] text-[#2D2D2D] hover:shadow-lg transition-all"
                          >
                            <IconBrandZoom className="w-4 h-4" strokeWidth={2.5} />
                            Start Class
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(cls)}
                          className="flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                        >
                          <IconTrash className="w-4 h-4" strokeWidth={2} />
                          Delete
                        </button>
                      </div>
                    </div>

                    {cls.description && (
                      <div className="mt-3 pl-0 sm:pl-[72px]">
                        <p className="text-sm text-gray-600">{cls.description}</p>
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {activeZoomMeeting && user && (
          <ZoomMeeting
            status={true}
            meetingNumber={activeZoomMeeting.meetingNumber}
            userName={user.name}
            userEmail={"moneycrafttrader@gmail.com"}
            signature={activeZoomMeeting.signature}
            sdkKey={activeZoomMeeting.sdkKey}
            passWord={activeZoomMeeting.passWord}
            tk={activeZoomMeeting.tk}
            zak={activeZoomMeeting.zak}
            onLeave={() => setActiveZoomMeeting(null)}
          />
        )}
      </AnimatePresence>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateLiveClassModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={handleCreateSuccess}
            batchId={selectedBatch !== "all" ? selectedBatch : undefined}
            batches={batches}
          />
        )}
      </AnimatePresence>
      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && editingClass && (
          <EditLiveClassModal
            onClose={() => {
              setShowEditModal(false);
              setEditingClass(null);
            }}
            onSuccess={handleCreateSuccess}
            liveClass={editingClass}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// ---------------------------------------------------------------------------
// Create Live Class Modal Component
// ---------------------------------------------------------------------------
const CreateLiveClassModal = ({
  onClose,
  onSuccess,
  batchId,
  batches,
}: {
  onClose: () => void;
  onSuccess: () => void;
  batchId?: string;
  batches: Batch[];
}) => {
  const [formData, setFormData] = useState({
    batch_id: batchId || "",
    topic: "",
    description: "",
    start_time: "",
    duration: 60,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.batch_id) {
      setError("Please select a batch");
      return;
    }
    if (!formData.topic || !formData.start_time) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      await liveClassesApi.create({
        batch_id: formData.batch_id,
        topic: formData.topic,
        description: formData.description || undefined,
        start_time: fromISTToUTC(formData.start_time) || "",
        duration: formData.duration,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to schedule live class");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", duration: 0.5 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-[28px] bg-white p-4 sm:p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#C4B5FD] to-[#A78BFA] flex items-center justify-center shadow-lg">
              <IconBrandZoom className="w-7 h-7 text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Schedule Live Class</h2>
              <p className="text-sm text-gray-500 mt-1">Create a Zoom meeting for your batch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100 transition-colors"
          >
            <IconX className="w-6 h-6 text-gray-500" strokeWidth={2} />
          </button>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 rounded-xl bg-red-50 border-2 border-red-200 p-4 text-sm text-red-700 font-medium flex items-center gap-3"
          >
            <div className="w-8 h-8 rounded-full bg-red-200 flex items-center justify-center shrink-0">
              <span className="text-red-700 font-bold">!</span>
            </div>
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Batch Selector — shown when no batchId was pre-selected */}
          {!batchId && (
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2.5">
                Batch <span className="text-red-500">*</span>
              </label>
              <select
                value={formData.batch_id}
                onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
              >
                <option value="">Select a batch...</option>
                {(batches || []).map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.batch_name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2.5 uppercase tracking-wider">
              Meeting Topic <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C4B5FD] focus:border-transparent transition-all"
              placeholder="e.g. Mathematics Advanced - Session 1"
            />
          </div>

          {/* Date & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2.5 uppercase tracking-wider text-xs">
                Scheduled Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C4B5FD] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2.5 uppercase tracking-wider text-xs">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                min="15"
                step="15"
                className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C4B5FD] focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2.5 uppercase tracking-wider">
              Description <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C4B5FD] focus:border-transparent resize-none transition-all"
              placeholder="Add session details..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-6 py-3 text-sm font-bold text-gray-700 hover:bg-gray-100 transition-all uppercase tracking-widest"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl px-6 py-3 text-sm font-bold bg-gradient-to-br from-[#B4F481] to-[#9FE66F] text-[#2D2D2D] hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2 uppercase tracking-widest"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#2D2D2D]/30 border-t-[#2D2D2D] rounded-full animate-spin"></div>
                  Scheduling...
                </>
              ) : (
                <>
                  <IconCalendar className="w-4 h-4" strokeWidth={2.5} />
                  Schedule Class
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// Edit Live Class Modal Component
// ---------------------------------------------------------------------------
const EditLiveClassModal = ({
  onClose,
  onSuccess,
  liveClass,
}: {
  onClose: () => void;
  onSuccess: () => void;
  liveClass: LiveClass;
}) => {
  const [formData, setFormData] = useState({
    topic: liveClass.topic,
    description: liveClass.description || "",
    start_time: toISTDateTimeLocal(liveClass.start_time),
    duration: liveClass.duration,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    try {
      setLoading(true);
      await liveClassesApi.update(liveClass.id, {
        topic: formData.topic,
        description: formData.description || undefined,
        start_time: fromISTToUTC(formData.start_time) || "",
        duration: formData.duration,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to update live class");
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ type: "spring", duration: 0.5 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-[28px] bg-white p-4 sm:p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#C4B5FD] to-[#A78BFA] flex items-center justify-center shadow-lg">
              <IconEdit className="w-7 h-7 text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Edit Live Class</h2>
              <p className="text-sm text-gray-500 mt-1">Update Zoom meeting details</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100 transition-colors"
          >
            <IconX className="w-6 h-6 text-gray-500" strokeWidth={2} />
          </button>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 border-2 border-red-200 p-4 text-sm text-red-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
                Meeting Topic
              </label>
              <input
                type="text"
                required
                value={formData.topic}
                onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                className="w-full rounded-xl border-gray-200 bg-gray-50 p-3 focus:border-[#C4B5FD] focus:ring-[#C4B5FD] font-medium transition-all"
                placeholder="e.g. Mathematics Advanced - Session 1"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
                Description (Optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full rounded-xl border-gray-200 bg-gray-50 p-3 focus:border-[#C4B5FD] focus:ring-[#C4B5FD] font-medium transition-all h-24 resize-none"
                placeholder="Session details, agenda, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
                Start Date & Time
              </label>
              <input
                type="datetime-local"
                required
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full rounded-xl border-gray-200 bg-gray-50 p-3 focus:border-[#C4B5FD] focus:ring-[#C4B5FD] font-medium transition-all"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2 uppercase tracking-wider">
                Duration (minutes)
              </label>
              <select
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                className="w-full rounded-xl border-gray-200 bg-gray-50 p-3 focus:border-[#C4B5FD] focus:ring-[#C4B5FD] font-medium transition-all cursor-pointer"
              >
                {[15, 30, 45, 60, 90, 120, 180].map((d) => (
                  <option key={d} value={d}>
                    {d} minutes
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border-2 border-gray-200 px-6 py-3.5 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all uppercase tracking-widest"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 rounded-xl bg-gradient-to-br from-[#B4F481] to-[#9FE66F] px-6 py-3.5 text-sm font-bold text-[#2D2D2D] shadow-lg hover:shadow-xl transition-all disabled:opacity-50 uppercase tracking-widest"
            >
              {loading ? "Updating..." : "Update Class"}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};