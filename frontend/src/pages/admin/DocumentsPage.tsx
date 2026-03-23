import React, { useState, useEffect, useCallback } from "react";
import {
  IconSearch,
  IconPlus,
  IconFile,
  IconDownload,
  IconX,
  IconUpload,
  IconTrash,
  IconFileTypePdf,
  IconFileTypeDoc,
  IconSortAscending,
  IconFilter,
  IconAlertCircle,
  IconCircleCheck,
  IconLanguage,
  IconEye,
  IconPhoto,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { documentsApi } from "@/api/endpoints/documents";
import { batchesApi } from "@/api/endpoints/batches";
import { topicsApi } from "@/api/endpoints/topics";
import type { Document, DocumentType, Batch, Topic } from "@/types";

// ---------------------------------------------------------------------------
// Toast notification system
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
            t.type === "success" &&
              "bg-emerald-50 border-emerald-200 text-emerald-800",
            t.type === "error" && "bg-red-50 border-red-200 text-red-800",
            t.type === "info" && "bg-blue-50 border-blue-200 text-blue-800"
          )}
        >
          {t.type === "success" && (
            <IconCircleCheck className="w-5 h-5 text-emerald-500 shrink-0" />
          )}
          {t.type === "error" && (
            <IconAlertCircle className="w-5 h-5 text-red-500 shrink-0" />
          )}
          {t.type === "info" && (
            <IconFile className="w-5 h-5 text-blue-500 shrink-0" />
          )}
          <span className="flex-1">{t.message}</span>
          <button
            onClick={() => onDismiss(t.id)}
            className="text-gray-400 hover:text-gray-600 shrink-0"
          >
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
type SortOption =
  | "newest"
  | "oldest"
  | "title_az"
  | "title_za"
  | "size_large"
  | "size_small";

const sortLabels: Record<SortOption, string> = {
  newest: "Newest First",
  oldest: "Oldest First",
  title_az: "Title A \u2192 Z",
  title_za: "Title Z \u2192 A",
  size_large: "Largest Size",
  size_small: "Smallest Size",
};

const applySortDocuments = (
  docs: Document[],
  sort: SortOption
): Document[] => {
  const sorted = [...docs];
  switch (sort) {
    case "newest":
      return sorted.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    case "oldest":
      return sorted.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
    case "title_az":
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case "title_za":
      return sorted.sort((a, b) => b.title.localeCompare(a.title));
    case "size_large":
      return sorted.sort((a, b) => (b.file_size || 0) - (a.file_size || 0));
    case "size_small":
      return sorted.sort((a, b) => (a.file_size || 0) - (b.file_size || 0));
    default:
      return sorted;
  }
};

// ---------------------------------------------------------------------------
// Document Preview Modal
// ---------------------------------------------------------------------------
const DocumentPreviewModal = ({
  doc,
  onClose,
  onDownload,
}: {
  doc: Document;
  onClose: () => void;
  onDownload: (doc: Document) => void;
}) => {
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const isPdf = doc.file_type === "pdf";
  const imageTypes = ["png", "jpg", "jpeg", "gif", "webp", "svg"];
  const isImage = imageTypes.includes(doc.file_type?.toLowerCase() || "");
  const canPreview = isPdf || isImage;

  useEffect(() => {
    if (!canPreview) {
      setLoading(false);
      return;
    }
    let revoked = false;
    const fetchBlob = async () => {
      try {
        const blob = await documentsApi.download(doc.id);
        if (revoked) return;
        const url = window.URL.createObjectURL(blob);
        setBlobUrl(url);
      } catch {
        if (!revoked) setError(isPdf ? "Failed to load PDF preview." : "Failed to load image preview.");
      } finally {
        if (!revoked) setLoading(false);
      }
    };
    fetchBlob();
    return () => {
      revoked = true;
      if (blobUrl) window.URL.revokeObjectURL(blobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc.id, canPreview]);

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        transition={{ type: "spring", duration: 0.4 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-4xl rounded-2xl bg-gray-900 overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
          <div className="flex-1 min-w-0">
            <h3 className="font-bold text-white text-lg truncate">
              {doc.title}
            </h3>
            {doc.description && (
              <p className="text-sm text-gray-400 truncate mt-0.5">
                {doc.description}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-white/10 transition-colors ml-3 shrink-0"
          >
            <IconX className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* Preview Area */}
        <div className="flex-1 min-h-0 bg-black">
          {canPreview ? (
            loading ? (
              <div className="w-full h-96 flex items-center justify-center">
                <div className="w-10 h-10 border-[3px] border-white/30 border-t-white rounded-full animate-spin" />
              </div>
            ) : error || !blobUrl ? (
              <div className="w-full h-96 flex flex-col items-center justify-center text-center px-6">
                <IconAlertCircle className="w-12 h-12 text-gray-500 mb-3" />
                <p className="text-gray-400 font-medium">
                  {error || (isPdf ? "Unable to load PDF preview" : "Unable to load image preview")}
                </p>
                <button
                  onClick={() => onDownload(doc)}
                  className="mt-4 flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 transition-all"
                >
                  <IconDownload className="w-4 h-4" />
                  Download Instead
                </button>
              </div>
            ) : isPdf ? (
              <iframe
                src={blobUrl}
                className="w-full h-[60vh]"
                title={doc.title}
              />
            ) : (
              <div className="w-full h-[60vh] flex items-center justify-center p-4 overflow-auto">
                <img
                  src={blobUrl}
                  alt={doc.title}
                  className="max-w-full max-h-full object-contain rounded-lg"
                />
              </div>
            )
          ) : (
            <div className="w-full h-64 flex flex-col items-center justify-center text-center px-6">
              <IconFile className="w-16 h-16 text-gray-500 mb-4" strokeWidth={1.5} />
              <p className="text-gray-400 font-medium text-base mb-1">
                Preview not available for .{doc.file_type} files
              </p>
              <p className="text-gray-500 text-sm mb-4">
                Download the file to view its contents
              </p>
              <button
                onClick={() => onDownload(doc)}
                className="flex items-center gap-2 rounded-xl bg-blue-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-600 transition-all"
              >
                <IconDownload className="w-4 h-4" />
                Download File
              </button>
            </div>
          )}
        </div>

        {/* Footer meta */}
        <div className="flex items-center gap-4 px-5 py-3 border-t border-white/10 text-xs text-gray-400 flex-wrap shrink-0">
          {doc.file_size != null && doc.file_size > 0 && (
            <span>Size: {formatFileSize(doc.file_size)}</span>
          )}
          {doc.language && <span>Language: {doc.language}</span>}
          <span className="uppercase">Type: {doc.file_type}</span>
          <span>
            Uploaded:{" "}
            {new Date(doc.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        </div>
      </motion.div>
    </motion.div>
  );
};

// ---------------------------------------------------------------------------
// Skeleton Loading Placeholders
// ---------------------------------------------------------------------------
const SkeletonDocumentItem = () => (
  <div className="rounded-2xl bg-white p-3 sm:p-4 md:p-5 border border-gray-200 animate-pulse">
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
      {/* Icon placeholder */}
      <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-xl bg-gray-100 shrink-0" />
      {/* Text placeholders */}
      <div className="flex-1 min-w-0">
        <div className="h-5 bg-gray-100 rounded-lg w-3/5 mb-2" />
        <div className="flex items-center gap-3">
          <div className="h-3 bg-gray-100 rounded-lg w-32" />
          <div className="h-3 bg-gray-100 rounded-lg w-16" />
          <div className="h-5 bg-gray-100 rounded w-14" />
        </div>
      </div>
      {/* Button placeholders */}
      <div className="flex items-center gap-2">
        <div className="h-9 bg-gray-100 rounded-xl w-10" />
        <div className="h-9 bg-gray-100 rounded-xl w-24" />
        <div className="h-9 bg-gray-100 rounded-xl w-9" />
      </div>
    </div>
  </div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const DocumentsPage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLanguage, setFilterLanguage] = useState<string>("all");
  const [filterFileType, setFilterFileType] = useState<string>("all");
  const [filterBatch, setFilterBatch] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [documents, setDocuments] = useState<Document[]>([]);
  const [languages, setLanguages] = useState<string[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Document | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 9;

  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((type: Toast["type"], message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      4000
    );
  }, []);
  const dismissToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [filterLanguage, filterFileType, filterBatch, searchQuery]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchDocuments();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, filterLanguage, filterFileType, filterBatch, searchQuery]);

  useEffect(() => {
    fetchLanguages();
    fetchBatches();
  }, []);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page: currentPage,
        limit: itemsPerPage,
      };
      if (filterLanguage !== "all") params.language = filterLanguage;
      if (filterFileType !== "all")
        params.file_type = filterFileType as DocumentType;
      if (filterBatch !== "all") params.batch_id = filterBatch;
      if (searchQuery.trim() !== "") params.search = searchQuery.trim();

      const response = await documentsApi.list(params);
      setDocuments(response.documents);
      if (response.totalPages) setTotalPages(response.totalPages);
      if (response.total !== undefined) setTotalCount(response.total);
    } catch (error) {
      console.error("Error fetching documents:", error);
      addToast("error", "Failed to load documents. Please try again.");
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

  const displayDocuments = applySortDocuments(documents || [], sortBy);

  // Derive unique file types from fetched documents for filter pills
  const availableFileTypes = Array.from(
    new Set((documents || []).map((d) => d.file_type).filter(Boolean))
  ) as string[];

  const imageFileTypes = ["png", "jpg", "jpeg", "gif", "webp", "svg"];

  const getFileIcon = (fileType: DocumentType | string) => {
    if (fileType === "pdf")
      return <IconFileTypePdf className="w-8 h-8" strokeWidth={1.5} />;
    if (fileType === "doc" || fileType === "docx")
      return <IconFileTypeDoc className="w-8 h-8" strokeWidth={1.5} />;
    if (imageFileTypes.includes(fileType?.toLowerCase()))
      return <IconPhoto className="w-8 h-8" strokeWidth={1.5} />;
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
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.file_name || "download";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      addToast("success", `"${doc.title}" download started`);
    } catch (error) {
      console.error("Error downloading document:", error);
      addToast("error", "Failed to download document. Please try again.");
    }
  };

  const handleDelete = async (doc: Document) => {
    if (!confirm(`Delete "${doc.title}"? This action cannot be undone.`))
      return;

    try {
      await documentsApi.delete(doc.id);
      addToast("success", `"${doc.title}" deleted successfully`);
      await fetchDocuments();
    } catch (error) {
      console.error("Error deleting document:", error);
      addToast("error", "Failed to delete document. Please try again.");
    }
  };

  const hasActiveFilters =
    filterFileType !== "all" ||
    filterLanguage !== "all" ||
    filterBatch !== "all" ||
    searchQuery.trim() !== "";

  const clearAllFilters = () => {
    setSearchQuery("");
    setFilterFileType("all");
    setFilterLanguage("all");
    setFilterBatch("all");
  };

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
          >
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-gray-900 mb-2">
              Document Library
            </h1>
            <p className="text-sm md:text-base text-gray-500">
              Upload and share documents with your students.
            </p>
          </motion.div>

          {/* Header Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-white p-3 sm:p-5 md:p-6 border border-gray-200"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center shadow-md shrink-0">
                  <IconFile
                    className="w-5 h-5 sm:w-7 sm:h-7 text-white"
                    strokeWidth={2}
                  />
                </div>
                <div>
                  <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900">
                    All Documents
                  </h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {totalCount || (documents || []).length} total documents
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 w-full sm:w-auto"
              >
                <IconPlus className="h-4 w-4" strokeWidth={2.5} />
                Upload Document
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <IconSearch
                className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
                strokeWidth={2}
              />
              <input
                type="text"
                placeholder="Search documents by title or filename..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border-0 bg-gray-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
              />
            </div>

            {/* Filter Pills, Dropdowns & Sort */}
            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mt-3">
              {/* File type pills */}
              <span className="text-xs font-semibold text-gray-500 mr-1">
                File Type:
              </span>
              <button
                onClick={() => setFilterFileType("all")}
                className={cn(
                  "rounded-xl px-2.5 py-1 sm:px-3.5 sm:py-1.5 text-xs font-semibold transition-all",
                  filterFileType === "all"
                    ? "bg-gray-900 text-white shadow-sm"
                    : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                )}
              >
                All
              </button>
              {availableFileTypes.map((ft) => (
                <button
                  key={ft}
                  onClick={() => setFilterFileType(ft)}
                  className={cn(
                    "rounded-xl px-2.5 py-1 sm:px-3.5 sm:py-1.5 text-xs font-semibold transition-all uppercase",
                    filterFileType === ft
                      ? "bg-gray-900 text-white shadow-sm"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  )}
                >
                  {ft}
                </button>
              ))}

              {/* Language dropdown */}
              {(languages || []).length > 0 && (
                <>
                  <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />
                  <div className="flex items-center gap-1.5">
                    <IconLanguage className="w-3.5 h-3.5 text-gray-400" />
                    <select
                      value={filterLanguage}
                      onChange={(e) => setFilterLanguage(e.target.value)}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900/20 cursor-pointer"
                    >
                      <option value="all">All Languages</option>
                      {(languages || []).map((lang) => (
                        <option key={lang} value={lang}>
                          {lang}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {/* Batch dropdown */}
              {(batches || []).length > 0 && (
                <>
                  <div className="w-px h-6 bg-gray-200 mx-1 hidden sm:block" />
                  <div className="flex items-center gap-1.5">
                    <IconFilter className="w-3.5 h-3.5 text-gray-400" />
                    <select
                      value={filterBatch}
                      onChange={(e) => setFilterBatch(e.target.value)}
                      className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900/20 cursor-pointer max-w-[130px] sm:max-w-[160px]"
                    >
                      <option value="all">All Batches</option>
                      {(batches || []).map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.batch_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
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
                    <option key={key} value={key}>
                      {label}
                    </option>
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
                    <button
                      onClick={() => setSearchQuery("")}
                      className="hover:text-gray-900"
                    >
                      <IconX className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filterFileType !== "all" && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600 uppercase">
                    {filterFileType}
                    <button
                      onClick={() => setFilterFileType("all")}
                      className="hover:text-gray-900"
                    >
                      <IconX className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filterLanguage !== "all" && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    {filterLanguage}
                    <button
                      onClick={() => setFilterLanguage("all")}
                      className="hover:text-gray-900"
                    >
                      <IconX className="w-3 h-3" />
                    </button>
                  </span>
                )}
                {filterBatch !== "all" && (
                  <span className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2 py-1 text-xs text-gray-600">
                    {batches.find((b) => b.id === filterBatch)?.batch_name ||
                      "Batch"}
                    <button
                      onClick={() => setFilterBatch("all")}
                      className="hover:text-gray-900"
                    >
                      <IconX className="w-3 h-3" />
                    </button>
                  </span>
                )}
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold ml-1"
                >
                  Clear all
                </button>
              </div>
            )}
          </motion.div>

          {/* Documents List */}
          {loading ? (
            <div className="grid grid-cols-1 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonDocumentItem key={i} />
              ))}
            </div>
          ) : displayDocuments.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center justify-center h-64 rounded-2xl bg-white border border-gray-200"
            >
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <IconFile
                  className="w-10 h-10 text-gray-400"
                  strokeWidth={1.5}
                />
              </div>
              <p className="text-gray-900 font-semibold text-base mb-1">
                No documents found
              </p>
              <p className="text-gray-500 text-sm mb-4">
                {hasActiveFilters
                  ? "Try adjusting your search or filters"
                  : "Upload your first document to get started"}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                >
                  Clear all filters
                </button>
              )}
            </motion.div>
          ) : (
            <>
              {/* Results count */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">
                  Showing{" "}
                  <span className="font-semibold text-gray-700">
                    {displayDocuments.length}
                  </span>
                  {totalCount > 0 && (
                    <>
                      {" "}
                      of{" "}
                      <span className="font-semibold text-gray-700">
                        {totalCount}
                      </span>
                    </>
                  )}{" "}
                  documents
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {displayDocuments.map((doc, idx) => (
                  <motion.div
                    key={doc.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.05 + idx * 0.04 }}
                    className="rounded-2xl bg-white p-3 sm:p-4 md:p-5 border border-gray-200 hover:shadow-lg transition-all group"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
                      {/* File Icon -- clickable to preview */}
                      <div
                        className={cn(
                          "w-12 h-12 sm:w-14 sm:h-14 rounded-xl flex items-center justify-center text-white shrink-0 cursor-pointer hover:scale-105 transition-transform",
                          imageFileTypes.includes(doc.file_type?.toLowerCase())
                            ? "bg-gradient-to-br from-emerald-400 to-teal-500"
                            : doc.file_type === "pdf"
                            ? "bg-gradient-to-br from-red-400 to-red-500"
                            : "bg-gradient-to-br from-blue-400 to-blue-500"
                        )}
                        onClick={() => setPreviewDoc(doc)}
                        title="Click to preview"
                      >
                        {getFileIcon(doc.file_type)}
                      </div>

                      {/* Document Info */}
                      <div
                        className="flex-1 min-w-0 cursor-pointer"
                        onClick={() => setPreviewDoc(doc)}
                      >
                        <h3 className="font-bold text-base text-gray-900 mb-1 truncate">
                          {doc.title}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                          <span className="font-medium">
                            {doc.file_name || "Unknown Filename"}
                          </span>
                          <span>&#183;</span>
                          <span>{formatFileSize(doc.file_size || 0)}</span>
                          {doc.language && (
                            <>
                              <span>&#183;</span>
                              <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 font-semibold">
                                {doc.language}
                              </span>
                            </>
                          )}
                          <span className="hidden sm:inline">&#183;</span>
                          <span className="hidden sm:inline text-gray-400">
                            {new Date(doc.createdAt).toLocaleDateString(
                              "en-US",
                              {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              }
                            )}
                          </span>
                        </div>
                      </div>

                      {/* Actions -- always visible (no hover-only hide) */}
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="rounded-xl px-3 py-2.5 text-sm font-bold bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all flex items-center gap-1.5"
                          title="Preview"
                        >
                          <IconEye className="w-4 h-4" strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => handleDownload(doc)}
                          className="rounded-xl px-4 py-2.5 text-sm font-bold bg-gradient-to-br from-blue-400 to-blue-500 text-white hover:shadow-lg transition-all flex items-center gap-2"
                        >
                          <IconDownload className="w-4 h-4" strokeWidth={2} />
                          <span className="hidden sm:inline">Download</span>
                        </button>
                        <button
                          onClick={() => handleDelete(doc)}
                          className="rounded-xl px-3 py-2.5 text-xs font-bold text-red-500 bg-red-50 hover:bg-red-100 transition-all"
                          title="Delete document"
                        >
                          <IconTrash className="w-4 h-4" strokeWidth={2} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Pagination with page numbers */}
              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-1.5 sm:gap-2 mt-4 pb-6 md:pb-4">
                  <button
                    onClick={() =>
                      setCurrentPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={currentPage === 1}
                    className="px-2.5 sm:px-4 py-1.5 sm:py-2 text-xs sm:text-sm font-bold rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    Prev
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        p === 1 ||
                        p === totalPages ||
                        Math.abs(p - currentPage) <= 1
                    )
                    .map((page, idx, arr) => (
                      <React.Fragment key={page}>
                        {idx > 0 && arr[idx - 1] !== page - 1 && (
                          <span className="text-gray-400 text-xs sm:text-sm px-0.5 sm:px-1">
                            &hellip;
                          </span>
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
                    onClick={() =>
                      setCurrentPage((prev) => Math.min(totalPages, prev + 1))
                    }
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
      </div>

      {/* Document Preview Modal */}
      <AnimatePresence>
        {previewDoc && (
          <DocumentPreviewModal
            doc={previewDoc}
            onClose={() => setPreviewDoc(null)}
            onDownload={handleDownload}
          />
        )}
      </AnimatePresence>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <UploadDocumentModal
            onClose={() => setShowUploadModal(false)}
            onSuccess={(msg) => {
              setShowUploadModal(false);
              addToast("success", msg);
              fetchDocuments();
            }}
            batches={batches}
          />
        )}
      </AnimatePresence>
    </>
  );
};

// ---------------------------------------------------------------------------
// Upload Document Modal Component (kept as-is, only onSuccess updated)
// ---------------------------------------------------------------------------
const UploadDocumentModal = ({
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
    language: "",
    batch_id: "",
    topic_id: "",
  });
  const [topics, setTopics] = useState<Topic[]>([]);
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const [loadingTopics, setLoadingTopics] = useState(false);

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
      uploadData.append("file", file);
      uploadData.append("title", formData.title);
      if (formData.description)
        uploadData.append("description", formData.description);
      if (formData.language) uploadData.append("language", formData.language);
      if (formData.batch_id)
        uploadData.append("batch_ids[]", formData.batch_id);
      if (formData.topic_id) uploadData.append("topic_id", formData.topic_id);

      await documentsApi.upload(uploadData);
      onSuccess(`"${formData.title}" uploaded successfully`);
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
        className="w-full max-w-2xl rounded-[28px] bg-white p-4 sm:p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center shadow-lg">
              <IconUpload className="w-7 h-7 text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                Upload Document
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Share a document with your students
              </p>
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
              accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.gif,.webp,.svg"
              className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
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
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              placeholder="e.g., React Study Guide"
            />
          </div>

          {/* Language & Batch */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2.5">
                Language
              </label>
              <input
                type="text"
                value={formData.language}
                onChange={(e) =>
                  setFormData({ ...formData, language: e.target.value })
                }
                className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
                placeholder="e.g., English"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2.5">
                Batch
              </label>
              <select
                value={formData.batch_id}
                onChange={(e) =>
                  setFormData({ ...formData, batch_id: e.target.value })
                }
                className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent cursor-pointer transition-all"
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
                onChange={(e) =>
                  setFormData({ ...formData, topic_id: e.target.value })
                }
                disabled={!formData.batch_id || loadingTopics}
                className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent cursor-pointer transition-all disabled:opacity-50"
              >
                <option value="">
                  {loadingTopics ? "Loading..." : "Select Topic"}
                </option>
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
              Description{" "}
              <span className="text-gray-400 font-normal">(Optional)</span>
            </label>
            <textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent resize-none transition-all"
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
              className="rounded-xl px-6 py-3 text-sm font-bold bg-gradient-to-br from-blue-400 to-blue-500 text-white hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
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