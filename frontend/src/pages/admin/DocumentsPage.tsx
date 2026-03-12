import React, { useState, useEffect } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import {
  IconLayoutDashboard,
  IconUsers,
  IconBook,
  IconSchool,
  IconSettings,
  IconLogout,
  IconSearch,
  IconPlus,
  IconFilter,
  IconFile,
  IconDownload,
  IconX,
  IconUpload,
  IconTrash,
  IconFileTypePdf,
  IconFileTypeDoc,
  IconVideo,
  IconBrandZoom,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { Logo, LogoIcon } from "./AdminDashboard";
import { documentsApi } from "@/api/endpoints/documents";
import { batchesApi } from "@/api/endpoints/batches";
import { topicsApi } from "@/api/endpoints/topics";
import type { Document, DocumentType, Batch, Topic } from "@/types";

export const DocumentsPage = () => {
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLanguage, setFilterLanguage] = useState<string>("all");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const links = [
    {
      label: "Dashboard",
      href: "/admin/dashboard",
      icon: <IconLayoutDashboard className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
    },
    {
      label: "Users",
      href: "/admin/users",
      icon: <IconUsers className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
    },
    {
      label: "Courses",
      href: "/admin/courses",
      icon: <IconBook className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
    },
    {
      label: "Batches",
      href: "/admin/batches",
      icon: <IconSchool className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
    },
    {
      label: "Videos",
      href: "/admin/videos",
      icon: <IconVideo className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
    },
    {
      label: "Documents",
      href: "/admin/documents",
      icon: <IconFile className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
    },
    {
      label: "Live Classes",
      href: "/admin/live-classes",
      icon: <IconBrandZoom className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
    },
    {
      label: "Webinars",
      href: "/admin/webinars",
      icon: <IconBrandZoom className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
    },
    {
      label: "Settings",
      href: "/admin/settings",
      icon: <IconSettings className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
    },
  ];

  useEffect(() => {
    fetchDocuments();
    fetchLanguages();
    fetchBatches();
  }, [filterLanguage]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params = filterLanguage !== "all" ? { language: filterLanguage } : {};
      const { documents: data } = await documentsApi.list(params);
      setDocuments(data);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchLanguages = async () => {
    try {
      const { languages: data } = await documentsApi.getLanguages();
      setLanguages(data);
    } catch (error) {
      console.error("Error fetching languages:", error);
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

  const filteredDocuments = (documents || []).filter(
    (doc) =>
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (doc.file_name || "").toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFileIcon = (fileType: DocumentType) => {
    if (fileType === "pdf") return <IconFileTypePdf className="w-8 h-8" strokeWidth={1.5} />;
    if (fileType === "doc" || fileType === "docx") return <IconFileTypeDoc className="w-8 h-8" strokeWidth={1.5} />;
    return <IconFile className="w-8 h-8" strokeWidth={1.5} />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = async (doc: Document) => {
    try {
      const blob = await documentsApi.download(doc.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.file_name || 'download';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Error downloading document:", error);
      alert("Failed to download document");
    }
  };

  const handleDelete = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    try {
      await documentsApi.delete(docId);
      await fetchDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
      alert("Failed to delete document");
    }
  };

  return (
    <div className="flex w-full h-screen bg-[#E8E6E1]">
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="justify-between gap-10">
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
            {open ? <Logo /> : <LogoIcon />}
            <div className="mt-8 flex flex-col gap-1">
              {links.map((link, idx) => (
                <SidebarLink key={idx} link={link} />
              ))}
            </div>
          </div>
          <div>
            <SidebarLink
              link={{
                label: user?.name || "Admin",
                href: "/admin/profile",
                icon: (
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-[#3D3532] shadow-sm">
                    {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                  </div>
                ),
              }}
            />
            <button
              onClick={handleLogout}
              className="mt-2 flex w-full items-center gap-3 py-3 px-3 rounded-lg transition-all duration-200 hover:bg-white/10 text-white"
              title="Logout"
            >
              <IconLogout className="h-6 w-6 shrink-0" strokeWidth={2} />
              <motion.span
                animate={{
                  display: open ? "inline-block" : "none",
                  opacity: open ? 1 : 0,
                }}
                className="!m-0 inline-block whitespace-pre !p-0 text-sm font-semibold"
              >
                Logout
              </motion.span>
            </button>
          </div>
        </SidebarBody>
      </Sidebar>

      <div className="flex flex-1 overflow-auto">
        <div className="flex h-full w-full flex-1 flex-col gap-6 p-6 md:p-10">
          {/* Welcome Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-2"
          >
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-2">
              Document Library
            </h1>
            <p className="text-lg text-gray-500">
              Upload and share documents with your students.
            </p>
          </motion.div>

          {/* Header Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-[28px] bg-white p-6 shadow-lg"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] flex items-center justify-center shadow-md">
                  <IconFile className="w-7 h-7 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">All Documents</h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {(documents || []).length} total documents
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 rounded-xl bg-[#2D2D2D] px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                <IconPlus className="h-4 w-4" strokeWidth={2.5} />
                Upload Document
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <IconSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Search documents by title or filename..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border-0 bg-gray-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20"
                />
              </div>
              <div className="flex gap-2.5">
                <select
                  value={filterLanguage}
                  onChange={(e) => setFilterLanguage(e.target.value)}
                  className="rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20 cursor-pointer"
                >
                  <option value="all">All Languages</option>
                  {(languages || []).map((lang) => (
                    <option key={lang} value={lang}>{lang}</option>
                  ))}
                </select>
                <button className="flex items-center gap-1.5 rounded-xl bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                  <IconFilter className="h-4 w-4" strokeWidth={2} />
                  Filters
                </button>
              </div>
            </div>
          </motion.div>

          {/* Documents List */}
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center h-64 rounded-[28px] bg-white shadow-lg"
            >
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] flex items-center justify-center mx-auto mb-3 animate-pulse">
                  <IconFile className="w-6 h-6 text-white" />
                </div>
                <p className="text-gray-500 text-sm font-medium">Loading documents...</p>
              </div>
            </motion.div>
          ) : filteredDocuments.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center justify-center h-64 rounded-[28px] bg-white shadow-lg"
            >
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <IconFile className="w-10 h-10 text-gray-400" strokeWidth={1.5} />
              </div>
              <p className="text-gray-900 font-semibold text-base mb-1">No documents found</p>
              <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {(filteredDocuments || []).map((doc, idx) => (
                <motion.div
                  key={doc.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 + idx * 0.05 }}
                  className="rounded-[24px] bg-white p-5 shadow-lg hover:shadow-xl transition-all group"
                >
                  <div className="flex items-center gap-4">
                    {/* File Icon */}
                    <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] flex items-center justify-center text-white shrink-0">
                      {getFileIcon(doc.file_type)}
                    </div>

                    {/* Document Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-bold text-base text-gray-900 mb-1 truncate">
                        {doc.title}
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="font-medium">{doc.file_name || "Unknown Filename"}</span>
                        <span>•</span>
                        <span>{formatFileSize(doc.file_size || 0)}</span>
                        {doc.language && (
                          <>
                            <span>•</span>
                            <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold">
                              {doc.language}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="rounded-xl px-4 py-2.5 text-sm font-bold bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] text-white hover:shadow-lg transition-all flex items-center gap-2"
                      >
                        <IconDownload className="w-4 h-4" strokeWidth={2} />
                        Download
                      </button>
                      <button
                        onClick={() => handleDelete(doc.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 p-2"
                      >
                        <IconTrash className="w-4 h-4" strokeWidth={2} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <UploadDocumentModal
            onClose={() => setShowUploadModal(false)}
            onSuccess={() => {
              setShowUploadModal(false);
              fetchDocuments();
            }}
            batches={batches}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Upload Document Modal Component
const UploadDocumentModal = ({
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
    language: "",
    batch_id: "",
    topic_id: "",
  });
  const [topics, setTopics] = useState<Topic[]>([]);
  const [file, setFile] = useState<File | null>(null);
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

    if (!formData.title || !file) {
      setError("Please enter a title and select a file");
      return;
    }

    try {
      setLoading(true);
      const uploadData = new FormData();
      uploadData.append('file', file);
      uploadData.append('title', formData.title);
      if (formData.description) uploadData.append('description', formData.description);
      if (formData.language) uploadData.append('language', formData.language);
      if (formData.batch_id) uploadData.append('batch_ids[]', formData.batch_id);
      if (formData.topic_id) uploadData.append('topic_id', formData.topic_id);

      await documentsApi.upload(uploadData);
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to upload document");
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
        className="w-full max-w-2xl rounded-[28px] bg-white p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] flex items-center justify-center shadow-lg">
              <IconUpload className="w-7 h-7 text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Upload Document</h2>
              <p className="text-sm text-gray-500 mt-1">Share a document with your students</p>
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
          {/* File Upload */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2.5">
              Select File <span className="text-red-500">*</span>
            </label>
            <input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
              className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#60A5FA] focus:border-transparent transition-all"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2.5">
              Document Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#60A5FA] focus:border-transparent transition-all"
              placeholder="e.g., React Study Guide"
            />
          </div>

          {/* Language & Batch */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2.5">
                Language
              </label>
              <input
                type="text"
                value={formData.language}
                onChange={(e) => setFormData({ ...formData, language: e.target.value })}
                className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#60A5FA] focus:border-transparent transition-all"
                placeholder="e.g., English"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2.5">
                Batch
              </label>
              <select
                value={formData.batch_id}
                onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#60A5FA] focus:border-transparent cursor-pointer transition-all"
              >
                <option value="">All Batches</option>
                {(batches || []).map((batch) => (
                  <option key={batch.id} value={batch.id}>
                    {batch.batch_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2.5">
                Topic
              </label>
              <select
                value={formData.topic_id}
                onChange={(e) => setFormData({ ...formData, topic_id: e.target.value })}
                disabled={!formData.batch_id || loadingTopics}
                className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#60A5FA] focus:border-transparent cursor-pointer transition-all disabled:opacity-50"
              >
                <option value="">{loadingTopics ? "Loading..." : "Select Topic"}</option>
                {topics.map((topic) => (
                  <option key={topic.id} value={topic.id}>
                    {topic.title}
                  </option>
                ))}
              </select>
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
              className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#60A5FA] focus:border-transparent resize-none transition-all"
              placeholder="Add a description..."
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
              className="rounded-xl px-6 py-3 text-sm font-bold bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] text-white hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <IconUpload className="w-4 h-4" strokeWidth={2.5} />
                  Upload Document
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
