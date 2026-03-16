import React, { useState, useEffect } from "react";
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
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { videosApi } from "@/api/endpoints/videos";
import { batchesApi } from "@/api/endpoints/batches";
import { topicsApi } from "@/api/endpoints/topics";
import type { Video, VideoStatus, Batch, Topic } from "@/types";

export const VideosPage = () => {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<VideoStatus | "all">("all");
  const [filterLanguage, setFilterLanguage] = useState<string>("all");
  const [videos, setVideos] = useState<Video[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAssignBatchModal, setShowAssignBatchModal] = useState(false);
  const [selectedVideoForBatch, setSelectedVideoForBatch] = useState<Video | null>(null);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);

  useEffect(() => {
    fetchVideos();
    fetchBatches();
  }, [filterStatus, filterLanguage]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filterStatus !== "all") params.upload_status = filterStatus;
      if (filterLanguage !== "all") params.language = filterLanguage;
      const { videos: data } = await videosApi.list(params as any);
      setVideos(data);
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setLoading(false);
    }
  };

  // Derive unique languages from fetched videos for filter dropdown
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

  const filteredVideos = (videos || []).filter(
    (video) =>
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: VideoStatus) => {
    switch (status) {
      case "ready":
        return { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" };
      case "processing":
        return { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" };
      case "uploading":
        return { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" };
      case "errored":
        return { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" };
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "—";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm("Are you sure you want to delete this video?")) return;

    try {
      await videosApi.delete(videoId);
      await fetchVideos();
    } catch (error) {
      console.error("Error deleting video:", error);
      alert("Failed to delete video");
    }
  };

  const handleAssignBatches = async () => {
    if (!selectedVideoForBatch) return;

    try {
      await videosApi.assignBatches(selectedVideoForBatch.id, { batch_ids: selectedBatchIds });
      await fetchVideos();
      setShowAssignBatchModal(false);
      setSelectedVideoForBatch(null);
      setSelectedBatchIds([]);
    } catch (error) {
      console.error("Error assigning batches:", error);
      alert("Failed to assign batches");
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
              Video Library
            </h1>
            <p className="text-sm md:text-base text-gray-500">
              Upload and manage video content for your courses.
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
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center shadow-md shrink-0">
                  <IconVideo className="w-5 h-5 sm:w-7 sm:h-7 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Video Content</h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {(videos || []).length} total videos
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 w-full sm:w-auto"
              >
                <IconPlus className="h-4 w-4" strokeWidth={2.5} />
                Upload Video
              </button>
            </div>

            {/* Search */}
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

            {/* Filter Pills & Dropdown */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-xs font-semibold text-gray-500 mr-1">Status:</span>
              {(["all", "ready", "processing", "uploading", "errored"] as const).map((status) => (
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

              {availableLanguages.length > 0 && (
                <>
                  <div className="w-px h-6 bg-gray-200 mx-1" />
                  <span className="text-xs font-semibold text-gray-500 mr-1">Language:</span>
                  <select
                    value={filterLanguage}
                    onChange={(e) => setFilterLanguage(e.target.value)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900/20 cursor-pointer"
                  >
                    <option value="all">All</option>
                    {availableLanguages.map((lang) => (
                      <option key={lang} value={lang}>{lang}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </motion.div>

          {/* Stats Summary */}
          {!loading && filteredVideos.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-2 gap-2.5 sm:gap-3 md:gap-5 md:grid-cols-4"
            >
              <div className="rounded-2xl bg-violet-200 p-3 sm:p-4 md:p-5 border border-gray-200">
                <div className="flex items-center gap-2 sm:gap-3 mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-900/10 flex items-center justify-center">
                    <IconVideo className="w-4 h-4 sm:w-5 sm:h-5 text-gray-900" strokeWidth={2} />
                  </div>
                  <p className="text-xs font-semibold text-gray-500">Total Videos</p>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{(videos || []).length}</p>
              </div>

              <div className="rounded-2xl bg-white p-3 sm:p-4 md:p-5 border border-gray-200">
                <div className="flex items-center gap-2 sm:gap-3 mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <IconCheck className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" strokeWidth={2} />
                  </div>
                  <p className="text-xs font-semibold text-gray-500">Ready</p>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {(videos || []).filter(v => v.upload_status === "ready").length}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-3 sm:p-4 md:p-5 border border-gray-200">
                <div className="flex items-center gap-2 sm:gap-3 mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <IconClock className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" strokeWidth={2} />
                  </div>
                  <p className="text-xs font-semibold text-gray-500">Processing</p>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {(videos || []).filter(v => v.upload_status === "processing" || v.upload_status === "uploading").length}
                </p>
              </div>

              <div className="rounded-2xl bg-emerald-200 p-3 sm:p-4 md:p-5 border border-gray-200">
                <div className="flex items-center gap-2 sm:gap-3 mb-3">
                  <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-900/10 flex items-center justify-center">
                    <IconSchool className="w-4 h-4 sm:w-5 sm:h-5 text-gray-900" strokeWidth={2} />
                  </div>
                  <p className="text-xs font-semibold text-gray-500">Total Duration</p>
                </div>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {Math.floor((videos || []).reduce((acc, v) => acc + (v.duration || 0), 0) / 60)}m
                </p>
              </div>
            </motion.div>
          )}

          {/* Videos Grid */}
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center h-64 rounded-2xl bg-white border border-gray-200"
            >
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center mx-auto mb-3 animate-pulse">
                  <IconVideo className="w-6 h-6 text-white" />
                </div>
                <p className="text-gray-500 text-sm font-medium">Loading videos...</p>
              </div>
            </motion.div>
          ) : filteredVideos.length === 0 ? (
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
              <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-5 lg:grid-cols-2 xl:grid-cols-3">
              {filteredVideos.map((video, idx) => {
                const statusColor = getStatusColor(video.upload_status);
                const isReady = video.upload_status === "ready";
                return (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + idx * 0.08 }}
                    className="rounded-2xl bg-white p-3 sm:p-4 md:p-5 border border-gray-200 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden"
                  >
                    {/* Thumbnail */}
                    <div className="relative rounded-xl overflow-hidden mb-4 bg-gray-100 h-40">
                      {video.thumbnail_url ? (
                        <img
                          src={video.thumbnail_url}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <IconVideo className="w-16 h-16 text-gray-300" strokeWidth={1.5} />
                        </div>
                      )}
                      {isReady && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                            <IconPlayerPlay className="w-8 h-8 text-gray-900 ml-1" strokeWidth={2} />
                          </div>
                        </div>
                      )}
                      {video.duration && (
                        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs font-semibold px-2 py-1 rounded">
                          {formatDuration(video.duration)}
                        </div>
                      )}
                    </div>

                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-900 mb-1.5 line-clamp-2">
                          {video.title}
                        </h3>
                        {video.description && (
                          <p className="text-xs text-gray-500 line-clamp-2">
                            {video.description}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => {
                            setSelectedVideoForBatch(video);
                            setSelectedBatchIds(video.batches?.map(b => b.id) || []);
                            setShowAssignBatchModal(true);
                          }}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-purple-600 hover:text-purple-700 p-1"
                          title="Assign to Batches"
                        >
                          <IconSchool className="w-4 h-4" strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => handleDeleteVideo(video.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 p-1"
                        >
                          <IconTrash className="w-4 h-4" strokeWidth={2} />
                        </button>
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm",
                          statusColor.bg,
                          statusColor.text
                        )}
                      >
                        <div className={cn("w-1.5 h-1.5 rounded-full", statusColor.dot)} />
                        {video.upload_status.charAt(0).toUpperCase() + video.upload_status.slice(1)}
                      </span>
                      {(video.batches || []).length > 0 && (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm bg-gray-100 text-gray-700">
                          <IconSchool className="w-3.5 h-3.5" strokeWidth={2} />
                          {(video.batches || []).length}
                        </span>
                      )}
                    </div>

                    {/* Batches */}
                    {(video.batches || []).length > 0 && (
                      <div className="rounded-xl bg-gray-50 px-3.5 py-3 mb-3">
                        <p className="text-xs font-semibold text-gray-700 mb-2">Assigned to:</p>
                        <div className="flex flex-wrap gap-1.5">
                          {(video.batches || []).slice(0, 2).map((batch) => (
                            <span key={batch.id} className="text-xs bg-white px-2 py-1 rounded-lg text-gray-600 font-medium">
                              {batch.batch_name}
                            </span>
                          ))}
                          {(video.batches || []).length > 2 && (
                            <span className="text-xs bg-white px-2 py-1 rounded-lg text-gray-600 font-medium">
                              +{(video.batches || []).length - 2} more
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      {isReady && (
                        <button className="flex-1 rounded-xl py-2.5 text-xs font-bold bg-gradient-to-br from-violet-400 to-violet-600 text-white hover:shadow-lg transition-all hover:scale-105">
                          View Details
                        </button>
                      )}
                      <button className="rounded-xl px-4 py-2.5 text-xs font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all">
                        Assign
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <UploadVideoModal
            onClose={() => setShowUploadModal(false)}
            onSuccess={() => {
              setShowUploadModal(false);
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
                prev.includes(batchId)
                  ? prev.filter((id) => id !== batchId)
                  : [...prev, batchId]
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

// Upload Video Modal Component
const UploadVideoModal = ({
  onClose,
  onSuccess,
  batches,
}: {
  onClose: () => void;
  onSuccess: () => void;
  batches: Batch[];
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    batch_id: "",
    topic_id: "",
  });
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingTopics, setLoadingTopics] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (formData.batch_id) {
      fetchTopics(formData.batch_id);
    } else {
      setTopics([]);
      setFormData(prev => ({ ...prev, topic_id: "" }));
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.title) {
      setError("Please enter a video title");
      return;
    }

    try {
      setLoading(true);
      const response = await videosApi.createDirectUpload({
        title: formData.title,
        description: formData.description || undefined,
        topic_id: formData.topic_id ? parseInt(formData.topic_id) : undefined,
        batch_ids: formData.batch_id ? [formData.batch_id] : undefined
      });

      // In a real implementation, you would handle the upload URL here
      alert(`Video created! Upload URL: ${response.upload_url}`);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to create video upload");
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
              <h2 className="text-3xl font-bold text-gray-900">Upload Video</h2>
              <p className="text-sm text-gray-500 mt-1">Create a new video upload</p>
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
          {/* Video Title */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2.5">
              Video Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all"
              placeholder="e.g., Introduction to React Hooks"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2.5">
              Description <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={4}
              className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent resize-none transition-all"
              placeholder="Add a description for this video..."
            />
          </div>

          {/* Batch & Topic Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2.5">
                Batch <span className="text-gray-400 font-normal">(Optional)</span>
              </label>
              <select
                value={formData.batch_id}
                onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-400 transition-all"
              >
                <option value="">Select Batch</option>
                {(batches || []).map(b => (
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
                disabled={!formData.batch_id || loadingTopics}
                className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-400 transition-all disabled:opacity-50"
              >
                <option value="">{loadingTopics ? "Loading..." : "Select Topic"}</option>
                {(topics || []).map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
            </div>
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
              className="rounded-xl px-6 py-3 text-sm font-bold bg-gradient-to-br from-violet-400 to-violet-600 text-white hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : (
                <>
                  <IconUpload className="w-4 h-4" strokeWidth={2.5} />
                  Create Upload
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// Assign Batch Modal Component
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
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center shadow-lg">
              <IconSchool className="w-7 h-7 text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Assign to Batches</h2>
              <p className="text-sm text-gray-500 mt-1">{video.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100 transition-colors"
          >
            <IconX className="w-6 h-6 text-gray-500" strokeWidth={2} />
          </button>
        </div>

        <div className="space-y-3">
          <p className="text-sm font-bold text-gray-900 mb-4">
            Select batches to assign this video to:
          </p>

          {(batches || []).length === 0 ? (
            <div className="rounded-xl bg-gray-50 p-6 text-center">
              <IconSchool className="w-12 h-12 text-gray-300 mx-auto mb-2" strokeWidth={1.5} />
              <p className="text-sm text-gray-500 font-medium">No batches available</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {(batches || []).map((batch) => {
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
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onBatchToggle(batch.id)}
                        className="w-5 h-5 rounded border-2 border-gray-300 text-violet-600 focus:ring-2 focus:ring-violet-400 cursor-pointer"
                      />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900 text-sm">{batch.batch_name}</p>
                      {batch.course && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {batch.course.title}
                        </p>
                      )}
                    </div>
                    {isSelected && (
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center">
                        <IconCheck className="w-5 h-5 text-white" strokeWidth={2.5} />
                      </div>
                    )}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
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
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                Assigning...
              </>
            ) : (
              <>
                <IconSchool className="w-4 h-4" strokeWidth={2.5} />
                Assign to Batches
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
};
