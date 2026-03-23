import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import {
  IconArrowLeft,
  IconVideo,
  IconFile,
  IconBrandZoom,
  IconUpload,
  IconEdit,
  IconTrash,
  IconDownload,
  IconCopy,
  IconExternalLink,
  IconClock,
  IconCalendar,
  IconUsers,
  IconPlayerPlay,
  IconFileText,
  IconPlus,
  IconX,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { batchesApi } from "@/api/endpoints/batches";
import { videosApi } from "@/api/endpoints/videos";
import { documentsApi } from "@/api/endpoints/documents";
import { liveClassesApi } from "@/api/endpoints/liveClasses";
import { useAuthStore } from "@/store/authStore";
import ZoomMeeting from "@/components/Zoom/ZoomMeeting";
import type { Batch, Video, Document, LiveClass } from "@/types";

import { BatchTestsTab } from "./tabs/BatchTestsTab";

type TabType = "videos" | "documents" | "classes" | "tests";

export const BatchDetailPage = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();

  const [batch, setBatch] = useState<Batch | null>(null);
  const [videos, setVideos] = useState<Video[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("videos");
  const [loading, setLoading] = useState(true);

  // Modal states
  const [showVideoUploadModal, setShowVideoUploadModal] = useState(false);
  const [showDocumentUploadModal, setShowDocumentUploadModal] = useState(false);
  const [showScheduleClassModal, setShowScheduleClassModal] = useState(false);
  const [showEditClassModal, setShowEditClassModal] = useState(false);
  const [showEditVideoModal, setShowEditVideoModal] = useState(false);
  const [editingClass, setEditingClass] = useState<LiveClass | null>(null);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [activeZoomMeeting, setActiveZoomMeeting] = useState<any>(null);
  const { user } = useAuthStore();

  useEffect(() => {
    if (batchId) {
      fetchBatchDetails();
      fetchContent();
    }
  }, [batchId]);

  const fetchBatchDetails = async () => {
    try {
      const { batch: data } = await batchesApi.getById(batchId!);
      setBatch(data);
    } catch (error) {
      console.error("Error fetching batch details:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchContent = async () => {
    try {
      // Fetch videos
      const { videos: videoData } = await videosApi.list({ batch_id: batchId });
      setVideos(videoData || []);

      // Fetch documents
      const { documents: docData } = await documentsApi.list({ batch_id: batchId });
      setDocuments(docData || []);

      // Fetch live classes
      const { liveClasses: classData } = await liveClassesApi.listByBatch(batchId!);
      setLiveClasses(classData || []);
    } catch (error) {
      console.error("Error fetching content:", error);
    }
  };

  const handleDeleteVideo = async (videoId: string) => {
    if (!confirm("Are you sure you want to delete this video?")) return;
    try {
      await videosApi.delete(videoId);
      setVideos(videos.filter(v => v.id !== videoId));
      toast.success("Video deleted successfully");
    } catch (error) {
      console.error("Error deleting video:", error);
      toast.error("Failed to delete video");
    }
  };

  const handleDeleteDocument = async (documentId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await documentsApi.delete(documentId);
      setDocuments(documents.filter(d => d.id !== documentId));
      toast.success("Document deleted successfully");
    } catch (error) {
      console.error("Error deleting document:", error);
      toast.error("Failed to delete document");
    }
  };

  const handleDownloadDocument = async (documentId: string, fileName: string) => {
    try {
      const blob = await documentsApi.download(documentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("Document downloaded successfully");
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to download document");
    }
  };

  const handleDeleteLiveClass = async (classId: number) => {
    if (!confirm("Are you sure you want to delete this live class?")) return;
    try {
      await liveClassesApi.delete(classId);
      setLiveClasses(liveClasses.filter(c => c.id !== classId));
      toast.success("Live class deleted successfully");
    } catch (error) {
      console.error("Error deleting live class:", error);
      toast.error("Failed to delete live class");
    }
  };

  const handleCopyZoomLink = (url: string) => {
    navigator.clipboard.writeText(url);
    toast.success("Zoom link copied to clipboard!");
  };

  const handleJoinClass = async (lcId: number) => {
    try {
      const role = user?.role === "admin" || user?.role === "instructor" ? 1 : 0;
      const signatureResponse = await liveClassesApi.getSignature(lcId, { role });
      setActiveZoomMeeting(signatureResponse);
    } catch (error: any) {
      console.error("Error getting Zoom signature:", error);
      toast.error(error.response?.data?.message || "Failed to join meeting");
    }
  };

  const handleEditClass = (liveClass: LiveClass) => {
    setEditingClass(liveClass);
    setShowEditClassModal(true);
  };

  const handleEditVideo = (video: Video) => {
    setEditingVideo(video);
    setShowEditVideoModal(true);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return "N/A";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case 'pdf':
        return <IconFileText className="w-8 h-8 text-red-500" strokeWidth={2} />;
      case 'doc':
      case 'docx':
        return <IconFileText className="w-8 h-8 text-blue-500" strokeWidth={2} />;
      case 'ppt':
      case 'pptx':
        return <IconFileText className="w-8 h-8 text-orange-500" strokeWidth={2} />;
      default:
        return <IconFile className="w-8 h-8 text-gray-500" strokeWidth={2} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ongoing":
        return { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" };
      case "completed":
        return { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" };
      case "draft":
        return { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" };
      case "inactive":
        return { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" };
    }
  };

  const getLiveClassStatusColor = (status: string) => {
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500 text-lg">Loading batch details...</div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <div className="text-gray-900 font-semibold text-lg mb-2">Batch not found</div>
        <button
          onClick={() => navigate('/instructor/dashboard')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Return to dashboard
        </button>
      </div>
    );
  }

  const statusColor = getStatusColor(batch.status);

  return (
    <div className="px-4 sm:px-0">
      {/* Header with Back Button */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <button
          onClick={() => navigate('/instructor/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-4"
        >
          <IconArrowLeft className="w-5 h-5" strokeWidth={2} />
          <span className="font-medium">Back to Dashboard</span>
        </button>
      </motion.div>

      {/* Batch Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-[28px] bg-gradient-to-br from-[#C4B5FD] to-[#A78BFA] p-8 shadow-xl mb-6"
      >
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-3">
              <span className={cn(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                "bg-white/20 text-white"
              )}>
                <span className={cn("w-1.5 h-1.5 rounded-full bg-white")}></span>
                {batch.status}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
              {batch.batch_name}
            </h1>

            {batch.course && (
              <p className="text-lg text-white/90 mb-4 font-medium">
                {batch.course.title}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <div className="flex items-center gap-3 text-white/90">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <IconUsers className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <div>
                  <div className="text-xs text-white/70 font-medium">Enrolled Students</div>
                  <div className="text-lg font-bold text-white">{batch.students?.length || 0}</div>
                </div>
              </div>

              <div className="flex items-center gap-3 text-white/90">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <IconCalendar className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <div>
                  <div className="text-xs text-white/70 font-medium">Duration</div>
                  <div className="text-sm font-semibold text-white">
                    {new Date(batch.start_date).toLocaleDateString()} - {new Date(batch.end_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
            </div>

            {batch.instructor && (
              <div className="mt-4 pt-4 border-t border-white/20">
                <div className="text-xs text-white/70 font-medium mb-1">Instructor</div>
                <div className="text-sm font-semibold text-white">{batch.instructor.name}</div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6"
      >
        <div className="rounded-[24px] bg-white p-2 shadow-lg inline-flex gap-2">
          <button
            onClick={() => setActiveTab("videos")}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-[18px] font-semibold transition-all",
              activeTab === "videos"
                ? "bg-gradient-to-br from-[#C4B5FD] to-[#A78BFA] text-white shadow-md"
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <IconVideo className="w-5 h-5" strokeWidth={2} />
            <span>Videos</span>
            <span className={cn(
              "ml-1 px-2 py-0.5 rounded-full text-xs font-bold",
              activeTab === "videos" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
            )}>
              {videos?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("documents")}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-[18px] font-semibold transition-all",
              activeTab === "documents"
                ? "bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] text-white shadow-md"
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <IconFile className="w-5 h-5" strokeWidth={2} />
            <span>Documents</span>
            <span className={cn(
              "ml-1 px-2 py-0.5 rounded-full text-xs font-bold",
              activeTab === "documents" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-600"
            )}>
              {documents?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("classes")}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-[18px] font-semibold transition-all",
              activeTab === "classes"
                ? "bg-gradient-to-br from-[#B4F481] to-[#9FE66F] text-[#2D2D2D] shadow-md"
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <IconBrandZoom className="w-5 h-5" strokeWidth={2} />
            <span>Live Classes</span>
            <span className={cn(
              "ml-1 px-2 py-0.5 rounded-full text-xs font-bold",
              activeTab === "classes" ? "bg-[#2D2D2D]/10 text-[#2D2D2D]" : "bg-gray-100 text-gray-600"
            )}>
              {liveClasses?.length || 0}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("tests")}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-[18px] font-semibold transition-all",
              activeTab === "tests"
                ? "bg-gradient-to-br from-[#FCD34D] to-[#F59E0B] text-white shadow-md"
                : "text-gray-600 hover:bg-gray-50"
            )}
          >
            <IconFileText className="w-5 h-5" strokeWidth={2} />
            <span>Tests</span>
            {/* TODO: Add count for tests or pending evaluations if available in main fetch */}
          </button>
        </div>
      </motion.div>

      {/* Content Area */}
      <AnimatePresence mode="wait">
        {/* Videos Tab */}
        {activeTab === "videos" && (
          <motion.div
            key="videos"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Video Library</h2>
              <button
                onClick={() => setShowVideoUploadModal(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-[18px] bg-gradient-to-br from-[#C4B5FD] to-[#A78BFA] text-white font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                <IconPlus className="w-5 h-5" strokeWidth={2} />
                Upload Video
              </button>
            </div>

            {videos.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-64 rounded-[28px] bg-white shadow-lg"
              >
                <IconVideo className="w-16 h-16 text-gray-300 mb-4" strokeWidth={1.5} />
                <p className="text-gray-900 font-semibold text-lg mb-1">No videos yet</p>
                <p className="text-gray-500 text-sm">Upload your first video to get started</p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {videos.map((video, idx) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="rounded-[24px] bg-white shadow-lg hover:shadow-xl transition-all overflow-hidden group"
                  >
                    {/* Video Thumbnail */}
                    <div className="relative h-48 bg-gradient-to-br from-[#C4B5FD] to-[#A78BFA]">
                      {video.thumbnail_url ? (
                        <img
                          src={video.thumbnail_url}
                          alt={video.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <IconPlayerPlay className="w-16 h-16 text-white/50" strokeWidth={1.5} />
                        </div>
                      )}
                      <div className="absolute top-3 right-3">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                          video.upload_status === "ready" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                        )}>
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            video.upload_status === "ready" ? "bg-green-500" : "bg-yellow-500"
                          )}></span>
                          {video.upload_status}
                        </span>
                      </div>
                      {video.duration && (
                        <div className="absolute bottom-3 right-3">
                          <span className="inline-flex items-center gap-1 bg-black/60 backdrop-blur-sm text-white px-2 py-1 rounded-lg text-xs font-semibold">
                            <IconClock className="w-3 h-3" strokeWidth={2} />
                            {formatDuration(video.duration)}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Video Info */}
                    <div className="p-5">
                      <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                        {video.title}
                      </h3>
                      {video.description && (
                        <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                          {video.description}
                        </p>
                      )}

                      {/* Action Buttons */}
                      <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                        <button
                          onClick={() => handleEditVideo(video)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium transition-all text-sm"
                        >
                          <IconEdit className="w-4 h-4" strokeWidth={2} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteVideo(video.id)}
                          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-medium transition-all text-sm"
                        >
                          <IconTrash className="w-4 h-4" strokeWidth={2} />
                          Delete
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Documents Tab */}
        {activeTab === "documents" && (
          <motion.div
            key="documents"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Document Library</h2>
              <button
                onClick={() => setShowDocumentUploadModal(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-[18px] bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] text-white font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                <IconPlus className="w-5 h-5" strokeWidth={2} />
                Upload Document
              </button>
            </div>

            {documents.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-64 rounded-[28px] bg-white shadow-lg"
              >
                <IconFile className="w-16 h-16 text-gray-300 mb-4" strokeWidth={1.5} />
                <p className="text-gray-900 font-semibold text-lg mb-1">No documents yet</p>
                <p className="text-gray-500 text-sm">Upload your first document to get started</p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {documents.map((doc, idx) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="rounded-[24px] bg-white p-6 shadow-lg hover:shadow-xl transition-all"
                  >
                    <div className="flex items-start gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center flex-shrink-0">
                        {getFileIcon(doc.file_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-bold text-gray-900 mb-1 line-clamp-2">
                           {doc.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="font-medium uppercase">{doc.file_type}</span>
                          {/* doc.file_size is not in the type definition */}
                        </div>
                      </div>
                    </div>

                    {doc.description && (
                      <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                        {doc.description}
                      </p>
                    )}

                    <div className="text-xs text-gray-400 mb-4">
                      Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2 pt-4 border-t border-gray-100">
                      <button
                        onClick={() => handleDownloadDocument(doc.id, doc.title)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-600 font-medium transition-all text-sm"
                      >
                        <IconDownload className="w-4 h-4" strokeWidth={2} />
                        Download
                      </button>
                      <button
                        onClick={() => handleDeleteDocument(doc.id)}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-medium transition-all text-sm"
                      >
                        <IconTrash className="w-4 h-4" strokeWidth={2} />
                        Delete
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Live Classes Tab */}
        {activeTab === "classes" && (
          <motion.div
            key="classes"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Live Classes</h2>
              <button
                onClick={() => setShowScheduleClassModal(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-[18px] bg-gradient-to-br from-[#B4F481] to-[#9FE66F] text-[#2D2D2D] font-semibold shadow-lg hover:shadow-xl transition-all"
              >
                <IconPlus className="w-5 h-5" strokeWidth={2} />
                Schedule Class
              </button>
            </div>

            {liveClasses.length === 0 ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center h-64 rounded-[28px] bg-white shadow-lg"
              >
                <IconBrandZoom className="w-16 h-16 text-gray-300 mb-4" strokeWidth={1.5} />
                <p className="text-gray-900 font-semibold text-lg mb-1">No live classes yet</p>
                <p className="text-gray-500 text-sm">Schedule your first class to get started</p>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {liveClasses.map((liveClass, idx) => {
                  const classStatusColor = getLiveClassStatusColor(liveClass.status);
                  const scheduledDate = new Date(liveClass.start_time);
                  const isUpcoming = scheduledDate > new Date();

                  return (
                    <motion.div
                      key={liveClass.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={cn(
                        "rounded-[24px] p-6 shadow-lg hover:shadow-xl transition-all",
                        isUpcoming
                          ? "bg-gradient-to-br from-[#B4F481] to-[#9FE66F]"
                          : "bg-white"
                      )}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center",
                          isUpcoming ? "bg-[#2D2D2D]/10" : "bg-gradient-to-br from-[#B4F481] to-[#9FE66F]"
                        )}>
                          <IconBrandZoom className={cn("w-6 h-6", isUpcoming ? "text-[#2D2D2D]" : "text-white")} strokeWidth={2} />
                        </div>
                        <span className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                          isUpcoming ? "bg-[#2D2D2D]/10 text-[#2D2D2D]" : classStatusColor.bg + " " + classStatusColor.text
                        )}>
                          <span className={cn(
                            "w-1.5 h-1.5 rounded-full",
                            isUpcoming ? "bg-[#2D2D2D]" : classStatusColor.dot
                          )}></span>
                          {liveClass.status}
                        </span>
                      </div>

                      <h3 className={cn(
                        "text-xl font-bold mb-2",
                        isUpcoming ? "text-[#2D2D2D]" : "text-gray-900"
                      )}>
                        {liveClass.topic}
                      </h3>

                      {liveClass.description && (
                        <p className={cn(
                          "text-sm mb-4 line-clamp-2",
                          isUpcoming ? "text-[#2D2D2D]/70" : "text-gray-500"
                        )}>
                          {liveClass.description}
                        </p>
                      )}

                      <div className={cn(
                        "rounded-xl p-3 mb-4",
                        isUpcoming ? "bg-[#2D2D2D]/5" : "bg-gray-50"
                      )}>
                        <div className="flex items-center gap-2 mb-2">
                          <IconCalendar className={cn("w-4 h-4", isUpcoming ? "text-[#2D2D2D]" : "text-gray-600")} strokeWidth={2} />
                          <span className={cn(
                            "text-sm font-semibold",
                            isUpcoming ? "text-[#2D2D2D]" : "text-gray-900"
                          )}>
                            {scheduledDate.toLocaleDateString()} at {scheduledDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <IconClock className={cn("w-4 h-4", isUpcoming ? "text-[#2D2D2D]" : "text-gray-600")} strokeWidth={2} />
                          <span className={cn(
                            "text-sm font-semibold",
                            isUpcoming ? "text-[#2D2D2D]" : "text-gray-900"
                          )}>
                            {liveClass.duration} minutes
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          onClick={() => handleEditClass(liveClass)}
                          className={cn(
                            "flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium transition-all text-sm",
                            isUpcoming
                              ? "bg-[#2D2D2D]/5 hover:bg-[#2D2D2D]/10 text-[#2D2D2D]"
                              : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                          )}
                        >
                          <IconEdit className="w-4 h-4" strokeWidth={2} />
                          Edit
                        </button>
                        <button
                          onClick={() => handleCopyZoomLink(liveClass.zoom_start_url)}
                          className={cn(
                            "flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium transition-all text-sm",
                            isUpcoming
                              ? "bg-[#2D2D2D]/5 hover:bg-[#2D2D2D]/10 text-[#2D2D2D]"
                              : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                          )}
                        >
                          <IconCopy className="w-4 h-4" strokeWidth={2} />
                          Copy Link
                        </button>
                        <button
                          onClick={() => handleJoinClass(liveClass.id)}
                          className={cn(
                            "flex items-center justify-center gap-2 px-4 py-2 rounded-xl font-medium transition-all text-sm",
                            isUpcoming
                              ? "bg-[#2D2D2D] hover:bg-[#2D2D2D]/90 text-white"
                              : "bg-gradient-to-br from-[#B4F481] to-[#9FE66F] text-[#2D2D2D] hover:shadow-md"
                          )}
                        >
                          <IconExternalLink className="w-4 h-4" strokeWidth={2} />
                          Start Class
                        </button>
                        <button
                          onClick={() => handleDeleteLiveClass(liveClass.id)}
                          className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-medium transition-all text-sm"
                        >
                          <IconTrash className="w-4 h-4" strokeWidth={2} />
                          Delete
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
        {/* Tests Tab */}
        {activeTab === "tests" && (
          <motion.div
            key="tests"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.2 }}
          >
            <BatchTestsTab batchId={batchId!} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Video Upload Modal */}
      <VideoUploadModal
        isOpen={showVideoUploadModal}
        onClose={() => setShowVideoUploadModal(false)}
        batchId={batchId!}
        onSuccess={() => {
          fetchContent();
          setShowVideoUploadModal(false);
        }}
      />

      {/* Edit Video Modal */}
      <EditVideoModal
        isOpen={showEditVideoModal}
        onClose={() => {
          setShowEditVideoModal(false);
          setEditingVideo(null);
        }}
        video={editingVideo}
      />

      {/* Document Upload Modal */}
      <DocumentUploadModal
        isOpen={showDocumentUploadModal}
        onClose={() => setShowDocumentUploadModal(false)}
        batchId={batchId!}
        onSuccess={() => {
          fetchContent();
          setShowDocumentUploadModal(false);
        }}
      />

      {/* Schedule Live Class Modal */}
      <ScheduleClassModal
        isOpen={showScheduleClassModal}
        onClose={() => setShowScheduleClassModal(false)}
        batchId={batchId!}
        onSuccess={() => {
          fetchContent();
          setShowScheduleClassModal(false);
        }}
      />

      {/* Edit Live Class Modal */}
      <EditClassModal
        isOpen={showEditClassModal}
        onClose={() => {
          setShowEditClassModal(false);
          setEditingClass(null);
        }}
        liveClass={editingClass}
        onSuccess={() => {
          fetchContent();
          setShowEditClassModal(false);
          setEditingClass(null);
        }}
      />
      <AnimatePresence>
        {activeZoomMeeting && user && (
          <ZoomMeeting
            status={true}
            meetingNumber={activeZoomMeeting.meetingNumber}
            userName={user.name}
            userEmail={user.email}
            signature={activeZoomMeeting.signature}
            sdkKey={activeZoomMeeting.sdkKey}
            passWord={activeZoomMeeting.passWord}
            onLeave={() => setActiveZoomMeeting(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Modal Components

// Video Upload Modal
interface VideoUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  onSuccess: () => void;
}

const VideoUploadModal: React.FC<VideoUploadModalProps> = ({ isOpen, onClose, batchId, onSuccess }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !videoFile) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      // Step 1: Create upload and get upload URL
      const { video, uploadUrl } = await videosApi.createUpload({
        title: title.trim(),
        description: description.trim() || undefined,
      });

      // Step 2: Upload video file to the upload URL
      await fetch(uploadUrl, {
        method: 'PUT',
        body: videoFile,
        headers: {
          'Content-Type': videoFile.type,
        },
      });

      // Step 3: Assign to batch
      await videosApi.assignBatches(video.id, { batch_ids: [batchId] });

      toast.success("Video uploaded successfully! Processing will begin shortly.");
      setTitle("");
      setDescription("");
      setVideoFile(null);
      onSuccess();
    } catch (error: any) {
      console.error("Error uploading video:", error);
      toast.error(error?.response?.data?.message || "Failed to upload video");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setTitle("");
      setDescription("");
      setVideoFile(null);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg bg-white rounded-[24px] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-[#C4B5FD] to-[#A78BFA] p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <IconUpload className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <h2 className="text-2xl font-bold text-white">Upload Video</h2>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <IconX className="w-5 h-5 text-white" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter video title"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#A78BFA] focus:ring-2 focus:ring-[#A78BFA]/20 outline-none transition-all"
                disabled={loading}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter video description (optional)"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#A78BFA] focus:ring-2 focus:ring-[#A78BFA]/20 outline-none transition-all resize-none"
                disabled={loading}
              />
            </div>

            {/* Video File */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Video File <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setVideoFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="video-upload"
                  disabled={loading}
                  required
                />
                <label
                  htmlFor="video-upload"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#A78BFA] cursor-pointer transition-colors"
                >
                  <IconUpload className="w-5 h-5 text-gray-400" strokeWidth={2} />
                  <span className="text-sm text-gray-600">
                    {videoFile ? videoFile.name : "Choose video file"}
                  </span>
                </label>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Note: Video will be uploaded and processing will begin
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !title.trim() || !videoFile}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-br from-[#C4B5FD] to-[#A78BFA] text-white font-semibold hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? "Uploading..." : "Upload Video"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// Edit Video Modal
interface EditVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  video: Video | null;
}

const EditVideoModal: React.FC<EditVideoModalProps> = ({ isOpen, onClose, video }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (video) {
      setTitle(video.title);
      setDescription(video.description || "");
    }
  }, [video]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Video editing coming soon!");
    onClose();
  };

  const handleClose = () => {
    setTitle("");
    setDescription("");
    onClose();
  };

  if (!isOpen || !video) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg bg-white rounded-[24px] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-[#C4B5FD] to-[#A78BFA] p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <IconEdit className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <h2 className="text-2xl font-bold text-white">Edit Video</h2>
              </div>
              <button
                onClick={handleClose}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <IconX className="w-5 h-5 text-white" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter video title"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#A78BFA] focus:ring-2 focus:ring-[#A78BFA]/20 outline-none transition-all"
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter video description"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#A78BFA] focus:ring-2 focus:ring-[#A78BFA]/20 outline-none transition-all resize-none"
              />
            </div>

            <p className="text-sm text-gray-500">
              Note: Video file cannot be changed after upload
            </p>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-br from-[#C4B5FD] to-[#A78BFA] text-white font-semibold hover:shadow-lg transition-all"
              >
                Save Changes
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// Document Upload Modal
interface DocumentUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  onSuccess: () => void;
}

const DocumentUploadModal: React.FC<DocumentUploadModalProps> = ({ isOpen, onClose, batchId, onSuccess }) => {
  const [description, setDescription] = useState("");
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!documentFile) {
      toast.error("Please select a file to upload");
      return;
    }

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', documentFile);
      if (description.trim()) {
        formData.append('description', description.trim());
      }
      formData.append('batch_ids', JSON.stringify([batchId]));

      await documentsApi.upload(formData);

      toast.success("Document uploaded successfully!");
      setDescription("");
      setDocumentFile(null);
      onSuccess();
    } catch (error: any) {
      console.error("Error uploading document:", error);
      toast.error(error?.response?.data?.message || "Failed to upload document");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setDescription("");
      setDocumentFile(null);
      onClose();
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg bg-white rounded-[24px] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <IconFile className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <h2 className="text-2xl font-bold text-white">Upload Document</h2>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
              >
                <IconX className="w-5 h-5 text-white" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* File Upload */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                File <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
                  onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                  className="hidden"
                  id="document-upload"
                  disabled={loading}
                  required
                />
                <label
                  htmlFor="document-upload"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border-2 border-dashed border-gray-300 hover:border-[#3B82F6] cursor-pointer transition-colors"
                >
                  {documentFile ? (
                    <>
                      <IconFileText className="w-5 h-5 text-blue-500" strokeWidth={2} />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">{documentFile.name}</div>
                        <div className="text-xs text-gray-500">{formatFileSize(documentFile.size)}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <IconUpload className="w-5 h-5 text-gray-400" strokeWidth={2} />
                      <span className="text-sm text-gray-600">Choose document file</span>
                    </>
                  )}
                </label>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter document description (optional)"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/20 outline-none transition-all resize-none"
                disabled={loading}
              />
            </div>

            {/* Batch Assignment */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Batch Assignment
              </label>
              <input
                type="text"
                value="Current Batch (Auto-assigned)"
                disabled
                className="w-full px-4 py-3 rounded-xl border border-gray-200 bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !documentFile}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] text-white font-semibold hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? "Uploading..." : "Upload Document"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// Schedule Live Class Modal
interface ScheduleClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  batchId: string;
  onSuccess: () => void;
}

const ScheduleClassModal: React.FC<ScheduleClassModalProps> = ({ isOpen, onClose, batchId, onSuccess }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !scheduledAt) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      await liveClassesApi.create({
        batch_id: batchId,
        topic: title.trim(),
        description: description.trim() || undefined,
        start_time: new Date(scheduledAt).toISOString(),
        duration: duration,
      });

      toast.success("Live class scheduled successfully!");
      setTitle("");
      setDescription("");
      setScheduledAt("");
      setDuration(60);
      onSuccess();
    } catch (error: any) {
      console.error("Error scheduling live class:", error);
      toast.error(error?.response?.data?.message || "Failed to schedule live class");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setTitle("");
      setDescription("");
      setScheduledAt("");
      setDuration(60);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg bg-white rounded-[24px] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-[#B4F481] to-[#9FE66F] p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2D2D2D]/10 flex items-center justify-center">
                  <IconCalendar className="w-5 h-5 text-[#2D2D2D]" strokeWidth={2} />
                </div>
                <h2 className="text-2xl font-bold text-[#2D2D2D]">Schedule Live Class</h2>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="w-8 h-8 rounded-full bg-[#2D2D2D]/10 hover:bg-[#2D2D2D]/20 flex items-center justify-center transition-colors"
              >
                <IconX className="w-5 h-5 text-[#2D2D2D]" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter class title"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#9FE66F] focus:ring-2 focus:ring-[#9FE66F]/20 outline-none transition-all"
                disabled={loading}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter class description (optional)"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#9FE66F] focus:ring-2 focus:ring-[#9FE66F]/20 outline-none transition-all resize-none"
                disabled={loading}
              />
            </div>

            {/* Date & Time */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#9FE66F] focus:ring-2 focus:ring-[#9FE66F]/20 outline-none transition-all"
                disabled={loading}
                required
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Duration (minutes) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                min="15"
                max="240"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#9FE66F] focus:ring-2 focus:ring-[#9FE66F]/20 outline-none transition-all"
                disabled={loading}
                required
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !title.trim() || !scheduledAt}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-br from-[#B4F481] to-[#9FE66F] text-[#2D2D2D] font-semibold hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? "Scheduling..." : "Schedule Class"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// Edit Live Class Modal
interface EditClassModalProps {
  isOpen: boolean;
  onClose: () => void;
  liveClass: LiveClass | null;
  onSuccess: () => void;
}

const EditClassModal: React.FC<EditClassModalProps> = ({ isOpen, onClose, liveClass, onSuccess }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [duration, setDuration] = useState(60);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (liveClass) {
      setTitle(liveClass.topic);
      setDescription(liveClass.description || "");
      // Convert ISO string to datetime-local format
      const date = new Date(liveClass.start_time);
      const localDateTime = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setScheduledAt(localDateTime);
      setDuration(liveClass.duration);
    }
  }, [liveClass]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !scheduledAt || !liveClass) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    try {
      await liveClassesApi.update(liveClass.id, {
        topic: title.trim(),
        description: description.trim() || undefined,
        start_time: new Date(scheduledAt).toISOString(),
        duration: duration,
      });

      toast.success("Live class updated successfully!");
      onSuccess();
    } catch (error: any) {
      console.error("Error updating live class:", error);
      toast.error(error?.response?.data?.message || "Failed to update live class");
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
    }
  };

  if (!isOpen || !liveClass) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleClose}
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="relative w-full max-w-lg bg-white rounded-[24px] shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-br from-[#B4F481] to-[#9FE66F] p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2D2D2D]/10 flex items-center justify-center">
                  <IconEdit className="w-5 h-5 text-[#2D2D2D]" strokeWidth={2} />
                </div>
                <h2 className="text-2xl font-bold text-[#2D2D2D]">Edit Live Class</h2>
              </div>
              <button
                onClick={handleClose}
                disabled={loading}
                className="w-8 h-8 rounded-full bg-[#2D2D2D]/10 hover:bg-[#2D2D2D]/20 flex items-center justify-center transition-colors"
              >
                <IconX className="w-5 h-5 text-[#2D2D2D]" strokeWidth={2} />
              </button>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter class title"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#9FE66F] focus:ring-2 focus:ring-[#9FE66F]/20 outline-none transition-all"
                disabled={loading}
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter class description (optional)"
                rows={3}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#9FE66F] focus:ring-2 focus:ring-[#9FE66F]/20 outline-none transition-all resize-none"
                disabled={loading}
              />
            </div>

            {/* Date & Time */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#9FE66F] focus:ring-2 focus:ring-[#9FE66F]/20 outline-none transition-all"
                disabled={loading}
                required
              />
            </div>

            {/* Duration */}
            <div>
              <label className="block text-sm font-semibold text-gray-900 mb-2">
                Duration (minutes) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 60)}
                min="15"
                max="240"
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#9FE66F] focus:ring-2 focus:ring-[#9FE66F]/20 outline-none transition-all"
                disabled={loading}
                required
              />
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="flex-1 px-6 py-3 rounded-xl border border-gray-200 text-gray-700 font-semibold hover:bg-gray-50 transition-all disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !title.trim() || !scheduledAt}
                className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-br from-[#B4F481] to-[#9FE66F] text-[#2D2D2D] font-semibold hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? "Updating..." : "Update Class"}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
