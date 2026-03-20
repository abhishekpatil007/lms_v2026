import React, { useState, useEffect, useCallback } from "react";
import {
  IconSchool,
  IconSearch,
  IconPlus,
  IconVideo,
  IconPlayerPlay,
  IconX,
  IconUpload,
  IconTrash,
  IconClock,
  IconCheck,
  IconSortAscending,
  IconFilter,
  IconAlertCircle,
  IconCircleCheck,
  IconLanguage,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { videosApi } from "@/api/endpoints/videos";
import { batchesApi } from "@/api/endpoints/batches";
import { topicsApi } from "@/api/endpoints/topics";
import type { Video, VideoStatus, Batch, Topic } from "@/types";

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
          {t.type === "info" && <IconVideo className="w-5 h-5 text-blue-500 shrink-0" />}
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
  title_az: "Title A → Z",
  title_za: "Title Z → A",
  duration_long: "Longest Duration",
  duration_short: "Shortest Duration",
};
const applySortVideos = (videos: Video[], sort: SortOption): Video[] => {
  const sorted = [...videos];
  switch (sort) {
    case "newest": return sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    case "oldest": return sorted.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    case "title_az": return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "title_za": return sorted.sort((a, b) => b.title.localeCompare(a.title));
    case "duration_long": return sorted.sort((a, b) => (b.duration || 0) - (a.duration || 0));
    case "duration_short": return sorted.sort((a, b) => (a.duration || 0) - (b.duration || 0));
    default: return sorted;
  }
};

// ---------------------------------------------------------------------------
// Video Preview Modal
// ---------------------------------------------------------------------------
const VideoPreviewModal = ({ video, onClose }: { video: Video; onClose: () => void }) => {
  const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPlayback = async () => {
      try {
        const res: any = await videosApi.getPlaybackUrl(video.id);
        // Backend returns playback_url (snake_case) or playbackUrl (camelCase)
        setPlaybackUrl(res.playback_url || res.playbackUrl || res.mux_playback_id || null);
      } catch {
        setError("Playback not available for this video.");
      } finally {
        setLoading(false);
      }
    };
    fetchPlayback();
  }, [video.id]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  // If we got an HLS URL (.m3u8), use the Mux player embed with the playback ID extracted from it
  // If we got a raw playback ID, use it directly with the Mux player
  const playerSrc = (() => {
    if (!playbackUrl) return null;
    if (playbackUrl.includes("player.mux.com")) return playbackUrl;
    // Extract playback ID from HLS URL like https://stream.mux.com/{id}.m3u8
    const m3u8Match = playbackUrl.match(/stream\.mux\.com\/([^/.]+)/);
    if (m3u8Match) return `https://player.mux.com/${m3u8Match[1]}`;
    // If it's just a playback ID
    if (!playbackUrl.includes("/") && !playbackUrl.includes(".")) return `https://player.mux.com/${playbackUrl}`;
    return playbackUrl;
  })();

  const formatDurationLong = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins >= 60) {
      const hrs = Math.floor(mins / 60);
      const remainMins = mins % 60;
      return `${hrs}h ${remainMins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", duration: 0.4 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl rounded-2xl bg-gray-900 overflow-hidden shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-lg truncate">{video.title}</h3>
            {video.description && <p className="text-sm text-gray-400 truncate mt-0.5">{video.description}</p>}
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-white/10 transition-colors ml-3 shrink-0">
            <IconX className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Player */}
        <div className="aspect-video bg-black">
          {loading ? (
            <div className="w-full h-full flex items-center justify-center">
              <div className="w-10 h-10 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
            </div>
          ) : error || !playerSrc ? (
            <div className="w-full h-full flex flex-col items-center justify-center text-center px-6">
              <IconAlertCircle className="w-12 h-12 text-gray-500 mb-3" />
              <p className="text-gray-400 font-medium">{error || "Playback URL not available"}</p>
              <p className="text-gray-500 text-sm mt-1">The video may still be processing</p>
            </div>
          ) : (
            <iframe src={playerSrc} className="w-full h-full" allowFullScreen
              allow="autoplay; fullscreen; picture-in-picture" />
          )}
        </div>

        {/* Footer meta */}
        <div className="flex items-center gap-4 px-5 py-3 border-t border-white/10 text-xs text-gray-400 flex-wrap">
          {video.duration != null && video.duration > 0 && <span>Duration: {formatDurationLong(video.duration)}</span>}
          {video.language && <span>Language: {video.language}</span>}
          <span>Uploaded: {new Date(video.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
          {(video.batches || []).length > 0 && (
            <span>Batches: {(video.batches || []).map((b) => b.batch_name).join(", ")}</span>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const VideosPage = () => {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<VideoStatus | "all">("all");
  const [filterLanguage, setFilterLanguage] = useState<string>("all");
  const [filterBatch, setFilterBatch] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [videos, setVideos] = useState<Video[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAssignBatchModal, setShowAssignBatchModal] = useState(false);
  const [selectedVideoForBatch, setSelectedVideoForBatch] = useState<Video | null>(null);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [previewVideo, setPreviewVideo] = useState<Video | null>(null);

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
  }, [filterStatus, filterLanguage, filterBatch, searchQuery]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchVideos();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, filterStatus, filterLanguage, filterBatch, searchQuery]);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page: currentPage,
        limit: itemsPerPage,
      };
      if (filterStatus !== "all") params.upload_status = filterStatus;
      if (filterLanguage !== "all") params.language = filterLanguage;
      if (filterBatch !== "all") params.batch_id = filterBatch;
      if (searchQuery.trim() !== "") params.search = searchQuery.trim();

      const response = await videosApi.list(params);
      setVideos(response.videos);
      if (response.totalPages) setTotalPages(response.totalPages);
      if (response.total !== undefined) setTotalCount(response.total);
    } catch (error) {
      console.error("Error fetching videos:", error);
      addToast("error", "Failed to load videos. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const availableLanguages = Array.from(
    new Set((videos || []).map((v) => v.language).filter(Boolean))
  ) as string[];

  const fetchBatches = async () => {
    try {
      const { batches: data } = await batchesApi.list();
      setBatches(data);
    } catch (error) {
      console.error("Error fetching batches:", error);
    }
  };

  const displayVideos = applySortVideos(videos || [], sortBy);

  const getStatusColor = (status: VideoStatus) => {
    switch (status) {
      case "ready":
        return { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" };
      case "pending":
        return { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" };
      case "failed":
        return { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" };
      case "cancelled":
        return { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" };
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatTotalDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
  };

  const handleDeleteVideo = async (videoId: string, title: string) => {
    if (!confirm(`Delete "${title}"? This action cannot be undone.`)) return;
    try {
      await videosApi.delete(videoId);
      addToast("success", `"${title}" deleted successfully`);
      await fetchVideos();
    } catch (error) {
      console.error("Error deleting video:", error);
      addToast("error", "Failed to delete video. Please try again.");
    }
  };

  const handleAssignBatches = async () => {
    if (!selectedVideoForBatch) return;
    try {
      await videosApi.assignBatches(selectedVideoForBatch.id, { batch_ids: selectedBatchIds });
      addToast("success", `"${selectedVideoForBatch.title}" assigned to ${selectedBatchIds.length} batch(es)`);
      await fetchVideos();
      setShowAssignBatchModal(false);
      setSelectedVideoForBatch(null);
      setSelectedBatchIds([]);
    } catch (error) {
      console.error("Error assigning batches:", error);
      addToast("error", "Failed to assign batches. Please try again.");
    }
  };

  const openAssignModal = (video: Video) => {
    setSelectedVideoForBatch(video);
    setSelectedBatchIds(video.batches?.map((b) => b.id) || []);
    setShowAssignBatchModal(true);
  };

  const readyCount = (videos || []).filter((v) => v.upload_status === "ready").length;
  const pendingCount = (videos || []).filter(
    (v) => v.upload_status === "pending"
  ).length;
  const totalDuration = (videos || []).reduce((acc, v) => acc + (v.duration || 0), 0);

  const hasActiveFilters = filterStatus !== "all" || filterBatch !== "all" || filterLanguage !== "all" || searchQuery.trim() !== "";

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterStatus("all");
    setFilterBatch("all");
    setFilterLanguage("all");
  };

  return (
    <>
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />

      <div className="flex flex-1 overflow-auto">
        <div className="flex h-full w-full flex-1 flex-col gap-4 sm:gap-6 p-3 sm:p-4 md:p-7">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-3"
          >
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-gray-900 mb-2">Video Library</h1>
              <p className="text-sm md:text-base text-gray-500">
                Upload and manage video content for your courses.
              </p>
            </div>
            <button
              onClick={() => setShowUploadModal(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 w-full sm:w-auto shrink-0"
            >
              <IconPlus className="h-4 w-4" strokeWidth={2.5} />
              Upload Video
            </button>
          </motion.div>

          {/* Stats Summary — always visible */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 gap-2.5 sm:gap-3 md:gap-5 md:grid-cols-4"
          >
            <div className="rounded-2xl bg-violet-50 p-3 sm:p-4 md:p-5 border border-violet-100">
              <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-violet-200 flex items-center justify-center">
                  <IconVideo className="w-4 h-4 sm:w-5 sm:h-5 text-violet-700" strokeWidth={2} />
                </div>
                <p className="text-xs font-semibold text-gray-500">Total Videos</p>
              </div>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{totalCount || (videos || []).length}</p>
            </div>

            <div className="rounded-2xl bg-white p-3 sm:p-4 md:p-5 border border-gray-200">
              <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-100 flex items-center justify-center">
                  <IconCheck className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" strokeWidth={2} />
                </div>
                <p className="text-xs font-semibold text-gray-500">Ready</p>
              </div>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{readyCount}</p>
            </div>

            <div className="rounded-2xl bg-white p-3 sm:p-4 md:p-5 border border-gray-200">
              <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <IconClock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" strokeWidth={2} />
                </div>
                <p className="text-xs font-semibold text-gray-500">Pending</p>
              </div>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{pendingCount}</p>
            </div>

            <div className="rounded-2xl bg-emerald-50 p-3 sm:p-4 md:p-5 border border-emerald-100">
              <div className="flex items-center gap-2 sm:gap-3 mb-1.5 sm:mb-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-emerald-200 flex items-center justify-center">
                  <IconPlayerPlay className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-700" strokeWidth={2} />
                </div>
                <p className="text-xs font-semibold text-gray-500">Total Duration</p>
              </div>
              <p className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">{formatTotalDuration(totalDuration)}</p>
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
                placeholder="Search videos by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border-0 bg-gray-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
              />
            </div>

            {/* Filter row */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Status pills */}
              <span className="text-xs font-semibold text-gray-500 mr-1">Status:</span>
              {(["all", "ready", "pending", "failed", "cancelled"] as const).map((status) => (
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
                  value={filterBatch}
                  onChange={(e) => setFilterBatch(e.target.value)}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900/20 cursor-pointer max-w-[160px]"
                >
                  <option value="all">All Batches</option>
                  {(batches || []).map((b) => (
                    <option key={b.id} value={b.id}>{b.batch_name}</option>
                  ))}
                </select>
              </div>

              {/* Language filter */}
              {availableLanguages.length > 0 && (
                <div className="flex items-center gap-1.5">
                  <IconLanguage className="w-3.5 h-3.5 text-gray-400" />
                  <select
                    value={filterLanguage}
                    onChange={(e) => setFilterLanguage(e.target.value)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900/20 cursor-pointer"
                  >
                    <option value="all">All Languages</option>
                    {availableLanguages.map((lang) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </div>
              )}

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

            {/* Active filters summary */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="text-xs text-gray-400">Active filters:</span>
                {searchQuery && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    &ldquo;{searchQuery}&rdquo;
                    <button onClick={() => setSearchQuery("")} className="hover:text-gray-900"><IconX className="w-3 h-3" /></button>
                  </span>
                )}
                {filterStatus !== "all" && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    {filterStatus}
                    <button onClick={() => setFilterStatus("all")} className="hover:text-gray-900"><IconX className="w-3 h-3" /></button>
                  </span>
                )}
                {filterBatch !== "all" && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    {batches.find((b) => b.id === filterBatch)?.batch_name || "Batch"}
                    <button onClick={() => setFilterBatch("all")} className="hover:text-gray-900"><IconX className="w-3 h-3" /></button>
                  </span>
                )}
                {filterLanguage !== "all" && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    {filterLanguage}
                    <button onClick={() => setFilterLanguage("all")} className="hover:text-gray-900"><IconX className="w-3 h-3" /></button>
                  </span>
                )}
                <button onClick={clearAllFilters} className="text-xs text-violet-600 hover:text-violet-700 font-semibold ml-1">
                  Clear all
                </button>
              </div>
            )}
          </motion.div>

          {/* Videos Grid */}
          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-5 lg:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl bg-white border border-gray-200 overflow-hidden animate-pulse">
                  <div className="bg-gray-100 h-40" />
                  <div className="p-4">
                    <div className="h-5 bg-gray-100 rounded-lg w-3/4 mb-2" />
                    <div className="h-3 bg-gray-100 rounded-lg w-full mb-4" />
                    <div className="flex gap-2">
                      <div className="h-7 bg-gray-100 rounded-full w-16" />
                      <div className="h-7 bg-gray-100 rounded-full w-12" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : displayVideos.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center justify-center h-64 rounded-2xl bg-white border border-gray-200"
            >
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <IconVideo className="w-10 h-10 text-gray-400" strokeWidth={1.5} />
              </div>
              <p className="text-gray-900 font-semibold text-base mb-1">No videos found</p>
              <p className="text-gray-500 text-sm mb-4">
                {hasActiveFilters ? "Try adjusting your search or filters" : "Upload your first video to get started"}
              </p>
              {hasActiveFilters && (
                <button onClick={clearAllFilters} className="text-sm font-semibold text-violet-600 hover:text-violet-700">
                  Clear all filters
                </button>
              )}
            </motion.div>
          ) : (
            <>
              {/* Results count */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing <span className="font-semibold text-gray-700">{displayVideos.length}</span>
                  {totalCount > 0 && <> of <span className="font-semibold text-gray-700">{totalCount}</span></>} videos
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-5 lg:grid-cols-2 xl:grid-cols-3">
                {displayVideos.map((video, idx) => {
                  const statusColor = getStatusColor(video.upload_status);
                  const isReady = video.upload_status === "ready";
                  const batchCount = (video.batches || []).length;
                  return (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.05 + idx * 0.04 }}
                      className="rounded-2xl bg-white border border-gray-200 hover:shadow-lg transition-all group relative overflow-hidden"
                    >
                      {/* Thumbnail */}
                      <div
                        className={cn("relative overflow-hidden bg-gray-100 h-40", isReady && "cursor-pointer")}
                        onClick={() => isReady && setPreviewVideo(video)}
                      >
                        {video.thumbnail_url ? (
                          <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                            <IconVideo className="w-16 h-16 text-gray-300" strokeWidth={1.5} />
                          </div>
                        )}
                        {isReady && (
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                              <IconPlayerPlay className="w-7 h-7 text-gray-900 ml-0.5" strokeWidth={2} />
                            </div>
                          </div>
                        )}
                        {video.duration != null && video.duration > 0 && (
                          <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-semibold px-2 py-1 rounded-lg">
                            {formatDuration(video.duration)}
                          </div>
                        )}
                        {/* Status badge on thumbnail */}
                        <div className="absolute top-2 left-2">
                          <span className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur-sm",
                            statusColor.bg, statusColor.text
                          )}>
                            <div className={cn("w-1.5 h-1.5 rounded-full", statusColor.dot)} />
                            {video.upload_status.charAt(0).toUpperCase() + video.upload_status.slice(1)}
                          </span>
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-4">
                        <h3 className="font-bold text-base text-gray-900 mb-1 line-clamp-1">{video.title}</h3>
                        {video.description && (
                          <p className="text-xs text-gray-500 line-clamp-2 mb-3">{video.description}</p>
                        )}

                        {/* Meta row */}
                        <div className="flex items-center flex-wrap gap-2 mb-3">
                          {video.language && (
                            <span className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded-md">{video.language}</span>
                          )}
                          <span className="text-xs text-gray-400">
                            {new Date(video.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                        </div>

                        {/* Batches */}
                        {batchCount > 0 ? (
                          <div className="rounded-xl bg-gray-50 px-3 py-2.5 mb-3">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <IconSchool className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              {(video.batches || []).slice(0, 2).map((batch) => (
                                <span key={batch.id} className="text-xs bg-white px-2 py-0.5 rounded-md text-gray-600 font-medium border border-gray-100">
                                  {batch.batch_name}
                                </span>
                              ))}
                              {batchCount > 2 && (
                                <span className="text-xs text-violet-600 font-semibold">+{batchCount - 2} more</span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-gray-200 px-3 py-2.5 mb-3 text-center">
                            <span className="text-xs text-gray-400">Not assigned to any batch</span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                          {isReady && (
                            <button
                              onClick={() => setPreviewVideo(video)}
                              className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold bg-gradient-to-br from-violet-400 to-violet-600 text-white hover:shadow-lg transition-all hover:scale-[1.02]"
                            >
                              <IconPlayerPlay className="w-3.5 h-3.5" />
                              Preview
                            </button>
                          )}
                          <button
                            onClick={() => openAssignModal(video)}
                            className="flex-1 flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                          >
                            <IconSchool className="w-3.5 h-3.5" />
                            Assign
                          </button>
                          <button
                            onClick={() => handleDeleteVideo(video.id, video.title)}
                            className="rounded-xl px-3 py-2 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-all"
                            title="Delete video"
                          >
                            <IconTrash className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-2 mt-4 pb-4">
                  <button
                    onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 text-sm font-bold rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    Previous
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter((p) => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 1)
                    .map((page, idx, arr) => (
                      <React.Fragment key={page}>
                        {idx > 0 && arr[idx - 1] !== page - 1 && (
                          <span className="text-gray-400 text-sm px-1">&hellip;</span>
                        )}
                        <button
                          onClick={() => setCurrentPage(page)}
                          className={cn(
                            "w-9 h-9 text-sm font-bold rounded-xl transition-all",
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
                    className="px-4 py-2 text-sm font-bold rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Video Preview Modal */}
      <AnimatePresence>
        {previewVideo && <VideoPreviewModal video={previewVideo} onClose={() => setPreviewVideo(null)} />}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <UploadVideoModal
            onClose={() => setShowUploadModal(false)}
            onSuccess={(msg) => {
              setShowUploadModal(false);
              addToast("success", msg);
              fetchVideos();
            }}
            batches={batches}
          />
        )}
      </AnimatePresence>

      {/* Assign Batch Modal */}
      <AnimatePresence>
        {showAssignBatchModal && selectedVideoForBatch && (
          <AssignBatchModal
            video={selectedVideoForBatch}
            batches={batches}
            selectedBatchIds={selectedBatchIds}
            onBatchToggle={(batchId) => {
              setSelectedBatchIds((prev) =>
                prev.includes(batchId) ? prev.filter((id) => id !== batchId) : [...prev, batchId]
              );
            }}
            onClose={() => {
              setShowAssignBatchModal(false);
              setSelectedVideoForBatch(null);
              setSelectedBatchIds([]);
            }}
            onAssign={handleAssignBatches}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// ---------------------------------------------------------------------------
// Upload Video Modal
// ---------------------------------------------------------------------------
const UploadVideoModal = ({
  onClose,
  onSuccess,
  batches,
}: {
  onClose: () => void;
  onSuccess: (message: string) => void;
  batches: Batch[];
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    batch_id: "",
    topic_id: "",
  });
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<"idle" | "creating" | "uploading" | "done">("idle");
  const [error, setError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (formData.batch_id) {
      fetchTopics(formData.batch_id);
    } else {
      setTopics([]);
      setFormData((prev) => ({ ...prev, topic_id: "" }));
    }
  }, [formData.batch_id]);

  const fetchTopics = async (batchId: string) => {
    try {
      setLoadingTopics(true);
      const { topics: data } = await topicsApi.listByBatch(batchId);
      setTopics(data);
    } catch (err) {
      console.error("Error fetching topics:", err);
    } finally {
      setLoadingTopics(false);
    }
  };

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith("video/")) {
      setError("Please select a valid video file");
      return;
    }
    setSelectedFile(file);
    setError("");
    if (!formData.title.trim()) {
      const name = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      setFormData((prev) => ({ ...prev, title: name }));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes >= 1073741824) return (bytes / 1073741824).toFixed(1) + " GB";
    if (bytes >= 1048576) return (bytes / 1048576).toFixed(1) + " MB";
    return (bytes / 1024).toFixed(1) + " KB";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedFile) {
      setError("Please select a video file");
      return;
    }
    if (!formData.title.trim()) {
      setError("Please enter a video title");
      return;
    }

    try {
      setLoading(true);
      setUploadPhase("creating");

      // Step 1: Create direct upload on backend → get Mux upload URL
      const response = await videosApi.createDirectUpload({
        title: formData.title.trim(),
        description: formData.description || undefined,
        topic_id: formData.topic_id ? parseInt(formData.topic_id) : undefined,
        batch_ids: formData.batch_id ? [formData.batch_id] : undefined,
      });

      if (!response.upload_url) {
        throw new Error("No upload URL received from server");
      }

      // Step 2: Upload file directly to Mux via PUT request
      setUploadPhase("uploading");
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", response.upload_url);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            setUploadProgress(Math.round((event.loaded / event.total) * 100));
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`Upload failed with status ${xhr.status}`));
        };

        xhr.onerror = () => reject(new Error("Upload failed — check your network"));
        xhr.send(selectedFile);
      });

      setUploadPhase("done");
      onSuccess(`Video "${formData.title}" uploaded successfully! It will be ready shortly after processing.`);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Failed to upload video");
      setUploadPhase("idle");
      setUploadProgress(0);
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
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center shadow-lg">
              <IconUpload className="w-7 h-7 text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Upload Video</h2>
              <p className="text-sm text-gray-500 mt-1">Select a video file to upload</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100 transition-colors" disabled={uploadPhase === "uploading"}>
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
              <IconAlertCircle className="w-4 h-4 text-red-700" />
            </div>
            {error}
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* File Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "relative rounded-2xl border-2 border-dashed p-6 sm:p-8 text-center cursor-pointer transition-all",
              isDragging ? "border-violet-400 bg-violet-50" : selectedFile ? "border-emerald-300 bg-emerald-50" : "border-gray-200 bg-gray-50 hover:border-violet-300 hover:bg-violet-50/50"
            )}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              className="hidden"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
            />
            {selectedFile ? (
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-emerald-200 flex items-center justify-center shrink-0">
                  <IconVideo className="w-6 h-6 text-emerald-700" />
                </div>
                <div className="text-left min-w-0 flex-1">
                  <p className="text-sm font-bold text-gray-900 truncate">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{formatFileSize(selectedFile.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}
                  className="rounded-full p-1.5 hover:bg-emerald-200 transition-colors shrink-0"
                >
                  <IconX className="w-4 h-4 text-gray-500" />
                </button>
              </div>
            ) : (
              <>
                <div className="w-14 h-14 rounded-full bg-gray-200 flex items-center justify-center mx-auto mb-3">
                  <IconUpload className="w-7 h-7 text-gray-400" />
                </div>
                <p className="text-sm font-bold text-gray-700">Drop your video here or click to browse</p>
                <p className="text-xs text-gray-400 mt-1">MP4, MOV, AVI, MKV, WebM supported</p>
              </>
            )}
          </div>

          {/* Upload Progress */}
          {uploadPhase !== "idle" && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-gray-700">
                  {uploadPhase === "creating" && "Preparing upload..."}
                  {uploadPhase === "uploading" && "Uploading to Mux..."}
                  {uploadPhase === "done" && "Upload complete!"}
                </span>
                {uploadPhase === "uploading" && <span className="font-bold text-violet-600">{uploadProgress}%</span>}
                {uploadPhase === "done" && <IconCheck className="w-5 h-5 text-emerald-500" />}
              </div>
              <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                <motion.div
                  className={cn("h-full rounded-full", uploadPhase === "done" ? "bg-emerald-500" : "bg-violet-500")}
                  initial={{ width: 0 }}
                  animate={{ width: uploadPhase === "creating" ? "10%" : uploadPhase === "done" ? "100%" : `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </motion.div>
          )}

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2.5">
              Video Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              disabled={uploadPhase !== "idle"}
              className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all disabled:opacity-50"
              placeholder="e.g., Introduction to React Hooks"
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2.5">
              Description <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              disabled={uploadPhase !== "idle"}
              className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent resize-none transition-all disabled:opacity-50"
              placeholder="Add a description for this video..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2.5">
                Batch <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <select
                value={formData.batch_id}
                onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                disabled={uploadPhase !== "idle"}
                className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-400 transition-all disabled:opacity-50"
              >
                <option value="">Select Batch</option>
                {(batches || []).map((b) => (
                  <option key={b.id} value={b.id}>{b.batch_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2.5">
                Topic <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <select
                value={formData.topic_id}
                onChange={(e) => setFormData({ ...formData, topic_id: e.target.value })}
                disabled={!formData.batch_id || loadingTopics || uploadPhase !== "idle"}
                className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-400 transition-all disabled:opacity-50"
              >
                <option value="">{loadingTopics ? "Loading..." : "Select Topic"}</option>
                {(topics || []).map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={uploadPhase === "uploading"}
              className="rounded-xl px-6 py-3 text-sm font-bold text-gray-700 hover:bg-gray-100 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !selectedFile || uploadPhase === "done"}
              className="rounded-xl px-6 py-3 text-sm font-bold bg-gradient-to-br from-violet-400 to-violet-600 text-white hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  {uploadPhase === "creating" ? "Preparing..." : "Uploading..."}
                </>
              ) : (
                <>
                  <IconUpload className="w-4 h-4" strokeWidth={2.5} />
                  Upload Video
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
// Assign Batch Modal
// ---------------------------------------------------------------------------
const AssignBatchModal = ({
  video,
  batches,
  selectedBatchIds,
  onBatchToggle,
  onClose,
  onAssign,
}: {
  video: Video;
  batches: Batch[];
  selectedBatchIds: string[];
  onBatchToggle: (batchId: string) => void;
  onClose: () => void;
  onAssign: () => void;
}) => {
  const [loading, setLoading] = useState(false);
  const [searchBatch, setSearchBatch] = useState("");

  const filteredBatches = (batches || []).filter((b) =>
    b.batch_name.toLowerCase().includes(searchBatch.toLowerCase())
  );

  const handleAssign = async () => {
    setLoading(true);
    await onAssign();
    setLoading(false);
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
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center shadow-lg">
              <IconSchool className="w-7 h-7 text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900">Assign to Batches</h2>
              <p className="text-sm text-gray-500 mt-1 line-clamp-1">{video.title}</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-gray-100 transition-colors">
            <IconX className="w-6 h-6 text-gray-500" strokeWidth={2} />
          </button>
        </div>

        {/* Search batches */}
        <div className="relative mb-4">
          <IconSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search batches..."
            value={searchBatch}
            onChange={(e) => setSearchBatch(e.target.value)}
            className="w-full rounded-xl border-0 bg-gray-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
          />
        </div>

        <p className="text-xs font-semibold text-gray-500 mb-3">
          {selectedBatchIds.length} batch(es) selected
        </p>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {filteredBatches.length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-6 text-center">
              <IconSchool className="w-12 h-12 text-gray-300 mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-sm text-gray-500 font-medium">
                {searchBatch ? "No batches match your search" : "No batches available"}
              </p>
            </div>
          ) : (
            filteredBatches.map((batch) => {
              const isSelected = selectedBatchIds.includes(batch.id);
              return (
                <label
                  key={batch.id}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md",
                    isSelected
                      ? "border-violet-400 bg-purple-50"
                      : "border-gray-100 bg-gray-50 hover:border-gray-200"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onBatchToggle(batch.id)}
                    className="w-5 h-5 rounded border-2 border-gray-300 text-violet-600 focus:ring-2 focus:ring-violet-400 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-sm">{batch.batch_name}</p>
                    {batch.course && (
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{batch.course.title}</p>
                    )}
                  </div>
                  {isSelected && (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center shrink-0">
                      <IconCheck className="w-5 h-5 text-white" strokeWidth={2.5} />
                    </div>
                  )}
                </label>
              );
            })
          )}
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t-2 border-gray-100 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl px-6 py-3 text-sm font-bold text-gray-700 hover:bg-gray-100 transition-all"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleAssign}
            disabled={loading}
            className="rounded-xl px-6 py-3 text-sm font-bold bg-gradient-to-br from-violet-400 to-violet-600 text-white hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Assigning...
              </>
            ) : (
              <>
                <IconSchool className="w-4 h-4" strokeWidth={2.5} />
                Assign ({selectedBatchIds.length})
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};