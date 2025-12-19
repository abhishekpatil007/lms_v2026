import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  IconSchool,
  IconBook,
  IconVideo,
  IconFile,
  IconBrandZoom,
  IconClock,
  IconPlayerPlay,
  IconDownload,
  IconCalendar,
  IconArrowLeft,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { batchesApi } from "@/api/endpoints/batches";
import { videosApi } from "@/api/endpoints/videos";
import { documentsApi } from "@/api/endpoints/documents";
import { liveClassesApi } from "@/api/endpoints/liveClasses";
import type { Batch, Video, Document, LiveClass } from "@/types";

export const StudentDashboard = () => {
  const { user } = useAuthStore();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [activeTab, setActiveTab] = useState<"videos" | "documents" | "classes">("videos");
  const [batchVideos, setBatchVideos] = useState<Video[]>([]);
  const [batchDocuments, setBatchDocuments] = useState<Document[]>([]);
  const [batchClasses, setBatchClasses] = useState<LiveClass[]>([]);
  const [contentLoading, setContentLoading] = useState(false);

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      fetchBatchContent();
    }
  }, [selectedBatch, activeTab]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const { batches: data } = await batchesApi.getStudentBatches();
      setBatches(data);
    } catch (error) {
      console.error("Error fetching batches:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchBatchContent = async () => {
    if (!selectedBatch) return;

    try {
      setContentLoading(true);
      if (activeTab === "videos") {
        const { videos } = await videosApi.list({ batch_id: selectedBatch.id });
        setBatchVideos(videos);
      } else if (activeTab === "documents") {
        const { documents } = await documentsApi.list({ batch_id: selectedBatch.id });
        setBatchDocuments(documents);
      } else if (activeTab === "classes") {
        const { liveClasses } = await liveClassesApi.listByBatch(selectedBatch.id);
        setBatchClasses(liveClasses);
      }
    } catch (error) {
      console.error("Error fetching batch content:", error);
    } finally {
      setContentLoading(false);
    }
  };

  const handleDownloadDocument = async (doc: Document) => {
    try {
      const blob = await documentsApi.download(doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.href = url;
      // Extract filename from path or use title
      const fileName = doc.file_path?.split(/[\\/]/).pop() || `${doc.title}.${doc.file_type}`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading document:", error);
      alert("Failed to download document");
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getClassStatusColor = (status: string) => {
    switch (status) {
      case "scheduled":
        return { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" };
      case "ongoing":
        return { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" };
      case "completed":
        return { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" };
      case "cancelled":
        return { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" };
    }
  };

  // Dashboard Data State
  const [dashboardLiveClasses, setDashboardLiveClasses] = useState<LiveClass[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(false);

  useEffect(() => {
    if (batches.length > 0) {
      fetchDashboardData();
    }
  }, [batches]);

  const fetchDashboardData = async () => {
    setDashboardLoading(true);
    try {
      const liveClassPromises = batches.map(batch => liveClassesApi.listByBatch(batch.id));
      const results = await Promise.all(liveClassPromises);

      const allLiveClasses = results.flatMap(r => r.liveClasses);
      const now = new Date();

      const validClasses = allLiveClasses.filter(c => {
        const status = c.status as string;
        const startTime = new Date(c.start_time);
        const endTime = new Date(startTime.getTime() + c.duration * 60000);
        return status === "ongoing" || (status === "scheduled" && startTime > now) || (status === "ongoing" && endTime > now);
      });

      // Sort: Ongoing first, then by start time
      validClasses.sort((a, b) => {
        if (a.status === "ongoing" && b.status !== "ongoing") return -1;
        if (a.status !== "ongoing" && b.status === "ongoing") return 1;
        return new Date(a.start_time).getTime() - new Date(b.start_time).getTime();
      });

      setDashboardLiveClasses(validClasses);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setDashboardLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500 text-lg">Loading your batches...</div>
      </div>
    );
  }

  // Batch Selection View (Dashboard Overview)
  if (!selectedBatch) {
    return (
      <div className="px-4 sm:px-0 max-w-7xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.name.split(' ')[0]}!
          </h1>
          <p className="text-lg text-gray-500">
            Here's what's happening today
          </p>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          {/* Profile Highlights */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="col-span-1 rounded-[28px] bg-white p-6 shadow-lg border border-gray-100"
          >
            <div className="flex items-center gap-4 mb-6">
              <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-2xl font-bold text-white shadow-md">
                {user?.name.charAt(0)}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
                <p className="text-sm text-gray-500">{user?.email}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                    <IconSchool className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-gray-700">Enrolled Courses</span>
                </div>
                <span className="text-lg font-bold text-gray-900">{batches.length}</span>
              </div>

              {/* Test Performance Placeholder - API Not Available */}
              {/* <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                    <IconBook className="w-5 h-5" />
                  </div>
                  <span className="font-medium text-gray-700">Avg. Test Score</span>
                </div>
                <span className="text-lg font-bold text-gray-900">--</span>
              </div> */}
            </div>
          </motion.div>

          {/* Live Classes Feed */}
          <div className="col-span-1 lg:col-span-2 space-y-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <IconBrandZoom className="w-6 h-6 text-[#2D96FF]" />
              Live & Upcoming Classes
            </h2>

            {dashboardLoading ? (
              <div className="flex items-center justify-center h-48 rounded-[28px] bg-white shadow-sm border border-gray-100">
                <div className="text-gray-400">Loading schedule...</div>
              </div>
            ) : dashboardLiveClasses.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-48 rounded-[28px] bg-white shadow-sm border border-gray-100"
              >
                <IconCalendar className="w-12 h-12 text-gray-300 mb-2" strokeWidth={1.5} />
                <p className="text-gray-500 font-medium">No live or upcoming classes</p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {dashboardLiveClasses.map((liveClass, idx) => {
                  const statusColor = getClassStatusColor(liveClass.status);
                  const isOngoing = liveClass.status === 'ongoing';

                  return (
                    <motion.div
                      key={liveClass.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.1 }}
                      className={cn(
                        "rounded-[24px] p-6 shadow-md transition-all border",
                        isOngoing ? "bg-white border-blue-200 ring-4 ring-blue-50/50" : "bg-white border-gray-100"
                      )}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <span className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider",
                              statusColor.bg,
                              statusColor.text
                            )}>
                              <span className={cn("w-2 h-2 rounded-full animate-pulse", statusColor.dot)}></span>
                              {liveClass.status}
                            </span>
                            <span className="text-sm text-gray-400 font-medium">
                              {liveClass.batch?.batch_name || "Batch Class"}
                            </span>
                          </div>

                          <h3 className="text-lg font-bold text-gray-900 mb-2">
                            {liveClass.topic}
                          </h3>

                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-600">
                            <div className="flex items-center gap-1.5">
                              <IconCalendar className="w-4 h-4 text-gray-400" />
                              <span className={isOngoing ? "text-blue-600 font-semibold" : ""}>
                                {new Date(liveClass.start_time).toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <IconClock className="w-4 h-4 text-gray-400" />
                              {liveClass.duration} min
                            </div>
                            {liveClass.instructor && (
                              <div className="flex items-center gap-1.5">
                                <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[10px] font-bold text-gray-500">
                                  {liveClass.instructor.name.charAt(0)}
                                </div>
                                {liveClass.instructor.name}
                              </div>
                            )}
                          </div>
                        </div>

                        {liveClass.zoom_join_url && (isOngoing || liveClass.status === 'scheduled') && (
                          <a
                            href={liveClass.zoom_join_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "hidden sm:flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold text-white transition-all shadow-lg",
                              isOngoing
                                ? "bg-gradient-to-br from-[#2D96FF] to-[#0B7FE8] hover:shadow-blue-200 hover:scale-105"
                                : "bg-gray-900 hover:bg-gray-800"
                            )}
                          >
                            {isOngoing ? "Join Now" : "Join Link"}
                            <IconBrandZoom className="w-4 h-4" />
                          </a>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Batches</h2>
          {batches.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-64 rounded-[28px] bg-white shadow-lg p-8"
            >
              <IconSchool className="w-16 h-16 text-gray-300 mb-4" strokeWidth={1.5} />
              <p className="text-gray-900 font-semibold text-lg mb-1">No batches yet</p>
              <p className="text-gray-500 text-sm text-center">
                You haven't been enrolled in any batches yet. Contact your administrator.
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {batches.map((batch, idx) => (
                <motion.div
                  key={batch.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  onClick={() => setSelectedBatch(batch)}
                  className="rounded-[24px] bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] p-6 shadow-lg hover:shadow-xl transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-14 h-14 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                      <IconSchool className="w-7 h-7 text-white" strokeWidth={2} />
                    </div>
                    <span className="inline-flex items-center rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-white">
                      {batch.status}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-2 group-hover:scale-105 transition-transform">
                    {batch.batch_name}
                  </h3>

                  {batch.course && (
                    <p className="text-sm text-white/80 mb-4">{batch.course.title}</p>
                  )}

                  {batch.instructor && (
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">
                        {batch.instructor.name.charAt(0)}
                      </div>
                      <span className="text-sm text-white/90">{batch.instructor.name}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 text-xs text-white/80">
                    <IconCalendar className="w-4 h-4" strokeWidth={2} />
                    {new Date(batch.start_date).toLocaleDateString()} - {new Date(batch.end_date).toLocaleDateString()}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Batch Content View
  return (
    <div className="px-4 sm:px-0">
      {/* Header with Back Button */}
      <div className="mb-6">
        <button
          onClick={() => {
            setSelectedBatch(null);
            setBatchVideos([]);
            setBatchDocuments([]);
            setBatchClasses([]);
          }}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <IconArrowLeft className="w-5 h-5" strokeWidth={2} />
          <span className="font-medium">Back to My Batches</span>
        </button>

        <div className="rounded-[24px] bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] p-6 shadow-lg">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{selectedBatch.batch_name}</h1>
              {selectedBatch.course && (
                <p className="text-white/90 mb-2">{selectedBatch.course.title}</p>
              )}
              {selectedBatch.instructor && (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">
                    {selectedBatch.instructor.name.charAt(0)}
                  </div>
                  <span className="text-sm text-white/90">Instructor: {selectedBatch.instructor.name}</span>
                </div>
              )}
            </div>
            <span className="inline-flex items-center rounded-full bg-white/20 px-4 py-2 text-sm font-semibold text-white">
              {selectedBatch.status}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 bg-white rounded-[20px] p-2 shadow-md">
        <button
          onClick={() => setActiveTab("videos")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 rounded-[16px] px-4 py-3 text-sm font-semibold transition-all",
            activeTab === "videos"
              ? "bg-gradient-to-br from-[#A78BFA] to-[#8B5CF6] text-white shadow-md"
              : "text-gray-600 hover:bg-gray-50"
          )}
        >
          <IconVideo className="w-5 h-5" strokeWidth={2} />
          Videos
        </button>
        <button
          onClick={() => setActiveTab("documents")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 rounded-[16px] px-4 py-3 text-sm font-semibold transition-all",
            activeTab === "documents"
              ? "bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] text-white shadow-md"
              : "text-gray-600 hover:bg-gray-50"
          )}
        >
          <IconFile className="w-5 h-5" strokeWidth={2} />
          Documents
        </button>
        <button
          onClick={() => setActiveTab("classes")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 rounded-[16px] px-4 py-3 text-sm font-semibold transition-all",
            activeTab === "classes"
              ? "bg-gradient-to-br from-[#2D96FF] to-[#0B7FE8] text-white shadow-md"
              : "text-gray-600 hover:bg-gray-50"
          )}
        >
          <IconBrandZoom className="w-5 h-5" strokeWidth={2} />
          Live Classes
        </button>
      </div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {contentLoading ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex items-center justify-center h-64"
          >
            <div className="text-gray-500 text-lg">Loading content...</div>
          </motion.div>
        ) : (
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {/* Videos Tab */}
            {activeTab === "videos" && (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {batchVideos.length === 0 ? (
                  <div className="col-span-full flex flex-col items-center justify-center h-64 rounded-[24px] bg-white shadow-lg">
                    <IconVideo className="w-16 h-16 text-gray-300 mb-4" strokeWidth={1.5} />
                    <p className="text-gray-900 font-semibold text-lg mb-1">No videos available</p>
                    <p className="text-gray-500 text-sm">Videos will appear here once added to this batch</p>
                  </div>
                ) : (
                  batchVideos.map((video, idx) => (
                    <motion.div
                      key={video.id}
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.05 }}
                      className="rounded-[20px] bg-white p-5 shadow-md hover:shadow-lg transition-all group"
                    >
                      <div className="relative rounded-xl bg-gradient-to-br from-[#A78BFA] to-[#8B5CF6] h-40 mb-4 flex items-center justify-center overflow-hidden">
                        {video.thumbnail_url ? (
                          <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover" />
                        ) : (
                          <IconPlayerPlay className="w-12 h-12 text-white" strokeWidth={1.5} />
                        )}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                            <IconPlayerPlay className="w-8 h-8 text-[#8B5CF6]" strokeWidth={2} />
                          </div>
                        </div>
                      </div>

                      <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{video.title}</h3>
                      {video.description && (
                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{video.description}</p>
                      )}

                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <IconClock className="w-4 h-4" strokeWidth={2} />
                        {formatDuration(video.duration)}
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* Documents Tab */}
            {activeTab === "documents" && (
              <div className="space-y-3">
                {batchDocuments.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 rounded-[24px] bg-white shadow-lg">
                    <IconFile className="w-16 h-16 text-gray-300 mb-4" strokeWidth={1.5} />
                    <p className="text-gray-900 font-semibold text-lg mb-1">No documents available</p>
                    <p className="text-gray-500 text-sm">Documents will appear here once added to this batch</p>
                  </div>
                ) : (
                  batchDocuments.map((doc, idx) => (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className="rounded-[20px] bg-white p-5 shadow-md hover:shadow-lg transition-all flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] flex items-center justify-center shrink-0">
                          <IconFile className="w-6 h-6 text-white" strokeWidth={2} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 truncate">{doc.title}</h3>
                          <p className="text-sm text-gray-500 truncate">{doc.file_path?.split(/[\\/]/).pop() || doc.title}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                            {/* <span>{formatFileSize(doc.file_size)}</span> */}
                            {doc.language && <span>• {doc.language}</span>}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDownloadDocument(doc)}
                        className="shrink-0 w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center hover:bg-[#3B82F6] hover:text-white transition-all opacity-0 group-hover:opacity-100"
                      >
                        <IconDownload className="w-5 h-5" strokeWidth={2} />
                      </button>
                    </motion.div>
                  ))
                )}
              </div>
            )}

            {/* Live Classes Tab */}
            {activeTab === "classes" && (
              <div className="space-y-4">
                {batchClasses.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 rounded-[24px] bg-white shadow-lg">
                    <IconBrandZoom className="w-16 h-16 text-gray-300 mb-4" strokeWidth={1.5} />
                    <p className="text-gray-900 font-semibold text-lg mb-1">No live classes scheduled</p>
                    <p className="text-gray-500 text-sm">Live classes will appear here once scheduled</p>
                  </div>
                ) : (
                  batchClasses.map((liveClass, idx) => {
                    const statusColor = getClassStatusColor(liveClass.status);
                    return (
                      <motion.div
                        key={liveClass.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.05 }}
                        className="rounded-[20px] bg-white p-6 shadow-md hover:shadow-lg transition-all"
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-start gap-4 flex-1">
                            <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#2D96FF] to-[#0B7FE8] flex items-center justify-center shrink-0">
                              <IconBrandZoom className="w-7 h-7 text-white" strokeWidth={2} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="text-lg font-bold text-gray-900 mb-1">{liveClass.topic}</h3>
                              {liveClass.description && (
                                <p className="text-sm text-gray-600 mb-3">{liveClass.description}</p>
                              )}
                              <div className="flex flex-wrap items-center gap-3 text-sm text-gray-500">
                                <div className="flex items-center gap-1.5">
                                  <IconCalendar className="w-4 h-4" strokeWidth={2} />
                                  {new Date(liveClass.start_time).toLocaleString()}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <IconClock className="w-4 h-4" strokeWidth={2} />
                                  {liveClass.duration} minutes
                                </div>
                              </div>
                            </div>
                          </div>
                          <span className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                            statusColor.bg,
                            statusColor.text
                          )}>
                            <span className={cn("w-1.5 h-1.5 rounded-full", statusColor.dot)}></span>
                            {liveClass.status}
                          </span>
                        </div>

                        {liveClass.status === "scheduled" && liveClass.zoom_join_url && (
                          <a
                            href={liveClass.zoom_join_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#2D96FF] to-[#0B7FE8] px-6 py-3 text-sm font-semibold text-white hover:shadow-lg transition-all"
                          >
                            <IconBrandZoom className="w-5 h-5" strokeWidth={2} />
                            Join Class
                          </a>
                        )}
                      </motion.div>
                    );
                  })
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
