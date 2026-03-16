import React, { useState, useEffect } from "react";
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
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { liveClassesApi } from "@/api/endpoints/liveClasses";
import { batchesApi } from "@/api/endpoints/batches";
import type { LiveClass, LiveClassStatus, Batch } from "@/types";

export const LiveClassesPage = () => {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<LiveClassStatus | "all">("all");
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (selectedBatch !== "all") {
      fetchLiveClassesByBatch(selectedBatch);
    }
  }, [selectedBatch]);

  const fetchBatches = async () => {
    try {
      const { batches: data } = await batchesApi.list();
      setBatches(data);
    } catch (error) {
      console.error("Error fetching batches:", error);
    }
  };

  const fetchLiveClassesByBatch = async (batchId: string) => {
    try {
      setLoading(true);
      const { liveClasses: data } = await liveClassesApi.listByBatch(batchId);
      setLiveClasses(data);
    } catch (error) {
      console.error("Error fetching live classes:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = (liveClasses || []).filter((cls) => {
    const matchesSearch = cls.topic.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || cls.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

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
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      time: date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const handleDelete = async (classId: number) => {
    if (!confirm("Are you sure you want to delete this live class?")) return;

    try {
      await liveClassesApi.delete(classId);
      if (selectedBatch !== "all") {
        await fetchLiveClassesByBatch(selectedBatch);
      }
    } catch (error) {
      console.error("Error deleting live class:", error);
      alert("Failed to delete live class");
    }
  };

  return (
    <>
      <div className="flex flex-1 overflow-auto">
        <div className="flex h-full w-full flex-1 flex-col gap-6 p-3 sm:p-4 md:p-7">
          {/* Welcome Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-2">
              Live Classes
            </h1>
            <p className="text-sm md:text-base text-gray-500">
              Schedule and manage Zoom live classes for your batches.
            </p>
          </motion.div>

          {/* Header Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-white p-4 sm:p-5 md:p-6 border border-gray-200"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md shrink-0">
                  <IconBrandZoom className="w-5 h-5 sm:w-7 sm:h-7 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Scheduled Classes</h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {(liveClasses || []).length} total classes
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                disabled={selectedBatch === "all"}
                className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 w-full sm:w-auto"
              >
                <IconPlus className="h-4 w-4" strokeWidth={2.5} />
                Schedule Class
              </button>
            </div>

            {/* Search & Batch Selector */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <IconSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Search classes by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border-0 bg-gray-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                />
              </div>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-900/20 cursor-pointer"
              >
                <option value="all">Select Batch</option>
                {(batches || []).map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.batch_name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter Pills */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-xs font-semibold text-gray-500 mr-1">Status:</span>
              {(["all", "scheduled", "live", "completed", "cancelled"] as const).map((status) => (
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
            </div>
          </motion.div>

          {/* Classes List */}
          {selectedBatch === "all" ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center justify-center h-64 rounded-2xl bg-white border border-gray-200"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mb-4">
                <IconBrandZoom className="w-10 h-10 text-white" strokeWidth={1.5} />
              </div>
              <p className="text-gray-900 font-semibold text-base mb-1">Select a Batch</p>
              <p className="text-gray-500 text-sm">Choose a batch to view its live classes</p>
            </motion.div>
          ) : loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center h-64 rounded-2xl bg-white border border-gray-200"
            >
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center mx-auto mb-3 animate-pulse">
                  <IconBrandZoom className="w-6 h-6 text-white" />
                </div>
                <p className="text-gray-500 text-sm font-medium">Loading classes...</p>
              </div>
            </motion.div>
          ) : filteredClasses.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center justify-center h-64 rounded-2xl bg-white border border-gray-200"
            >
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <IconBrandZoom className="w-10 h-10 text-gray-400" strokeWidth={1.5} />
              </div>
              <p className="text-gray-900 font-semibold text-base mb-1">No classes scheduled</p>
              <p className="text-gray-500 text-sm mb-4">Schedule your first live class for this batch</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white hover:shadow-lg transition-all"
              >
                <IconPlus className="h-4 w-4" strokeWidth={2.5} />
                Schedule Class
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {(filteredClasses || []).map((cls, idx) => {
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
                        <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                          <span className="flex items-center gap-1">
                            <IconCalendar className="w-3.5 h-3.5" strokeWidth={2} />
                            {date}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <IconClock className="w-3.5 h-3.5" strokeWidth={2} />
                            {time}
                          </span>
                          <span>•</span>
                          <span>{cls.duration} min</span>
                        </div>
                        <div className="flex items-center gap-2">
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
                      <div className="flex items-center gap-2">
                        {cls.status === "scheduled" && (
                          <button className="rounded-xl px-4 py-2.5 text-sm font-bold bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-lg transition-all flex items-center gap-2">
                            <IconBrandZoom className="w-4 h-4" strokeWidth={2} />
                            Join Class
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(cls.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 p-2"
                        >
                          <IconTrash className="w-4 h-4" strokeWidth={2} />
                        </button>
                      </div>
                    </div>

                    {cls.description && (
                      <div className="mt-3 pl-[72px]">
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

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateLiveClassModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              if (selectedBatch !== "all") {
                fetchLiveClassesByBatch(selectedBatch);
              }
            }}
            batchId={selectedBatch}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// Create Live Class Modal Component
const CreateLiveClassModal = ({
  onClose,
  onSuccess,
  batchId,
}: {
  onClose: () => void;
  onSuccess: () => void;
  batchId: string;
}) => {
  const [formData, setFormData] = useState({
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

    if (!formData.topic || !formData.start_time) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      await liveClassesApi.create({
        batch_id: batchId,
        topic: formData.topic,
        description: formData.description || undefined,
        start_time: formData.start_time,
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
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
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
          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2.5">
              Class Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.topic}
              onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
              className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              placeholder="e.g., React Hooks Deep Dive"
            />
          </div>

          {/* Date & Duration */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2.5">
                Scheduled Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2.5">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={formData.duration}
                onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) })}
                min="15"
                step="15"
                className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2.5">
              Description <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
              placeholder="Add class description..."
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-6 py-3 text-sm font-bold text-gray-700 hover:bg-gray-100 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-xl px-6 py-3 text-sm font-bold bg-gradient-to-br from-blue-500 to-blue-600 text-white hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
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
