import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  IconArrowLeft,
  IconUsers,
  IconBook,
  IconVideo,
  IconFile,
  IconBrandZoom,
  IconClipboard,
  IconCalendar,
  IconClock,
  IconMail,
  IconSchool,
  IconExternalLink,
  IconSearch,
  IconPlayerPlay,
  IconLanguage,
  IconRefresh,
  IconEdit,
  IconCheck,
  IconX,
  IconArrowsSort,
  IconChevronUp,
  IconChevronDown,
} from "@tabler/icons-react";
import { batchesApi } from "@/api/endpoints/batches";
import { topicsApi } from "@/api/endpoints/topics";
import { videosApi } from "@/api/endpoints/videos";
import { documentsApi } from "@/api/endpoints/documents";
import { liveClassesApi } from "@/api/endpoints/liveClasses";
import { testsApi } from "@/api/endpoints/tests";
import type { Batch, Topic, Video, Document, LiveClass, Test } from "@/types";

type TabKey =
  | "overview"
  | "students"
  | "topics"
  | "videos"
  | "documents"
  | "liveclasses"
  | "tests";

const tabs: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "overview", label: "Overview", icon: <IconSchool size={16} /> },
  { key: "students", label: "Students", icon: <IconUsers size={16} /> },
  { key: "topics", label: "Topics", icon: <IconBook size={16} /> },
  { key: "videos", label: "Videos", icon: <IconVideo size={16} /> },
  { key: "documents", label: "Documents", icon: <IconFile size={16} /> },
  { key: "liveclasses", label: "Live Classes", icon: <IconBrandZoom size={16} /> },
  { key: "tests", label: "Tests", icon: <IconClipboard size={16} /> },
];

const statusColors: Record<string, string> = {
  ongoing: "bg-emerald-100 text-emerald-700 border-emerald-200",
  completed: "bg-violet-100 text-violet-700 border-violet-200",
  draft: "bg-amber-100 text-amber-700 border-amber-200",
  inactive: "bg-rose-100 text-rose-700 border-rose-200",
  scheduled: "bg-sky-100 text-sky-700 border-sky-200",
  live: "bg-emerald-100 text-emerald-700 border-emerald-200",
  cancelled: "bg-rose-100 text-rose-700 border-rose-200",
  published: "bg-emerald-100 text-emerald-700 border-emerald-200",
  archived: "bg-gray-100 text-gray-700 border-gray-200",
  pending: "bg-amber-100 text-amber-700 border-amber-200",
  ready: "bg-emerald-100 text-emerald-700 border-emerald-200",
  failed: "bg-rose-100 text-rose-700 border-rose-200",
};

const StatusBadge = ({ status }: { status: string }) => (
  <span
    className={cn(
      "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize",
      statusColors[status] || "bg-gray-100 text-gray-700 border-gray-200"
    )}
  >
    {status}
  </span>
);

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatDateTime = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return "N/A";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDuration = (seconds?: number) => {
  if (!seconds) return "N/A";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
};

const relativeTime = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = date.getTime() - now.getTime();
  const diffMins = Math.round(diffMs / 60000);
  const diffHours = Math.round(diffMs / 3600000);
  const diffDays = Math.round(diffMs / 86400000);

  if (Math.abs(diffMins) < 60) {
    return diffMins >= 0 ? `in ${diffMins}m` : `${Math.abs(diffMins)}m ago`;
  }
  if (Math.abs(diffHours) < 24) {
    return diffHours >= 0 ? `in ${diffHours}h` : `${Math.abs(diffHours)}h ago`;
  }
  return diffDays >= 0 ? `in ${diffDays}d` : `${Math.abs(diffDays)}d ago`;
};

const EmptyState = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="mb-4 rounded-2xl bg-gray-50 p-4 text-gray-400">{icon}</div>
    <h3 className="text-lg font-semibold text-gray-700">{title}</h3>
    <p className="mt-1 text-sm text-gray-500">{description}</p>
  </div>
);

const FilterPill = ({
  label,
  active,
  count,
  onClick,
}: {
  label: string;
  active: boolean;
  count?: number;
  onClick: () => void;
}) => (
  <button
    onClick={onClick}
    className={cn(
      "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-all",
      active
        ? "border-violet-200 bg-violet-100 text-violet-700"
        : "border-gray-200 bg-white text-gray-500 hover:bg-gray-50"
    )}
  >
    {label}
    {count !== undefined && (
      <span
        className={cn(
          "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
          active ? "bg-violet-200 text-violet-800" : "bg-gray-100 text-gray-500"
        )}
      >
        {count}
      </span>
    )}
  </button>
);

const LanguageBadge = ({ language }: { language?: string }) => {
  if (!language) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-indigo-200 bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold uppercase text-indigo-600">
      <IconLanguage size={10} />
      {language}
    </span>
  );
};

const cardVariants: any = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.4, ease: "easeOut" },
  }),
};

export const AdminBatchDetailPage = () => {
  const { batchId } = useParams<{ batchId: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState<{
    batch_name: string;
    description: string;
    start_date: string;
    end_date: string;
    status: string;
  }>({ batch_name: "", description: "", start_date: "", end_date: "", status: "draft" });
  const [editSaving, setEditSaving] = useState(false);
  const [counts, setCounts] = useState<{
    students: number;
    topics: number;
    videos: number;
    documents: number;
    liveClasses: number;
    tests: number;
  }>({
    students: 0,
    topics: 0,
    videos: 0,
    documents: 0,
    liveClasses: 0,
    tests: 0,
  });

  useEffect(() => {
    if (batchId) {
      fetchBatchDetails();
    }
  }, [batchId]);

  const fetchBatchDetails = async () => {
    try {
      setLoading(true);
      const res = await batchesApi.getById(batchId!);
      setBatch(res.batch);
      setCounts(res.counts);
    } catch (error) {
      console.error("Error fetching batch details:", error);
    } finally {
      setLoading(false);
    }
  };

  const startEdit = () => {
    if (!batch) return;
    setEditData({
      batch_name: batch.batch_name,
      description: batch.description || "",
      start_date: batch.start_date,
      end_date: batch.end_date,
      status: batch.status,
    });
    setEditMode(true);
  };

  const cancelEdit = () => {
    setEditMode(false);
  };

  const saveEdit = async () => {
    if (!batchId) return;
    try {
      setEditSaving(true);
      const res = await batchesApi.update(batchId, editData);
      setBatch(res.batch);
      setEditMode(false);
    } catch (error) {
      console.error("Error updating batch:", error);
    } finally {
      setEditSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-violet-500" />
          <p className="text-gray-500">Loading batch details...</p>
        </div>
      </div>
    );
  }

  if (!batch) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-gray-700">Batch not found</p>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-violet-600 hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  const students = batch.students || [];

  const statCards = [
    {
      label: "Students",
      count: counts.students,
      icon: <IconUsers size={22} />,
      gradient: "from-violet-500 to-purple-600",
    },
    {
      label: "Topics",
      count: counts.topics,
      icon: <IconBook size={22} />,
      gradient: "from-emerald-500 to-teal-600",
    },
    {
      label: "Videos",
      count: counts.videos,
      icon: <IconVideo size={22} />,
      gradient: "from-sky-500 to-blue-600",
    },
    {
      label: "Documents",
      count: counts.documents,
      icon: <IconFile size={22} />,
      gradient: "from-amber-500 to-orange-600",
    },
    {
      label: "Live Classes",
      count: counts.liveClasses,
      icon: <IconBrandZoom size={22} />,
      gradient: "from-rose-500 to-pink-600",
    },
    {
      label: "Tests",
      count: counts.tests,
      icon: <IconClipboard size={22} />,
      gradient: "from-indigo-500 to-violet-600",
    },
  ];

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <button
          onClick={() => navigate(-1)}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 transition-colors hover:text-violet-600"
        >
          <IconArrowLeft size={16} />
          Back
        </button>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex-1">
            {editMode ? (
              <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">Batch Name</label>
                    <input
                      type="text"
                      value={editData.batch_name}
                      onChange={(e) => setEditData({ ...editData, batch_name: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">Status</label>
                    <select
                      value={editData.status}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
                    >
                      <option value="draft">Draft</option>
                      <option value="ongoing">Ongoing</option>
                      <option value="completed">Completed</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">Start Date</label>
                    <input
                      type="date"
                      value={editData.start_date}
                      onChange={(e) => setEditData({ ...editData, start_date: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-gray-500">End Date</label>
                    <input
                      type="date"
                      value={editData.end_date}
                      onChange={(e) => setEditData({ ...editData, end_date: e.target.value })}
                      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-500">Description</label>
                  <textarea
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    rows={2}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-violet-400 focus:outline-none focus:ring-1 focus:ring-violet-400"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={saveEdit}
                    disabled={editSaving}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-700 disabled:opacity-50"
                  >
                    <IconCheck size={16} />
                    {editSaving ? "Saving..." : "Save"}
                  </button>
                  <button
                    onClick={cancelEdit}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-50"
                  >
                    <IconX size={16} />
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
                    {batch.batch_name}
                  </h1>
                  <StatusBadge status={batch.status} />
                  <button
                    onClick={startEdit}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-500 transition-colors hover:bg-gray-50 hover:text-violet-600"
                  >
                    <IconEdit size={14} />
                    Edit
                  </button>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-gray-500">
                  {batch.course && (
                    <span className="flex items-center gap-1">
                      <IconSchool size={14} />
                      {batch.course.title}
                    </span>
                  )}
                  {batch.instructor && (
                    <span className="flex items-center gap-1">
                      <IconUsers size={14} />
                      {batch.instructor.name}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <IconCalendar size={14} />
                    {formatDate(batch.start_date)} &ndash; {formatDate(batch.end_date)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {statCards.map((card, i) => (
          <motion.div
            key={card.label}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <div
              className={cn(
                "mb-2 inline-flex rounded-xl bg-gradient-to-br p-2 text-white",
                card.gradient
              )}
            >
              {card.icon}
            </div>
            <p className="text-2xl font-bold text-gray-900">{card.count}</p>
            <p className="text-xs font-medium text-gray-500">{card.label}</p>
          </motion.div>
        ))}
      </div>

      {/* Tab Bar */}
      <div className="-mx-4 overflow-x-auto px-4 md:-mx-6 md:px-6">
        <div className="flex gap-1.5 rounded-2xl border border-gray-100 bg-gray-50 p-1.5">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm font-medium transition-all",
                activeTab === tab.key
                  ? "bg-white text-violet-700 shadow-sm"
                  : "text-gray-500 hover:bg-white/60 hover:text-gray-700"
              )}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        {activeTab === "overview" && (
          <OverviewTab batch={batch} />
        )}
        {activeTab === "students" && <StudentsTab batchId={batchId!} />}
        {activeTab === "topics" && <TopicsTab batchId={batchId!} />}
        {activeTab === "videos" && <VideosTab batchId={batchId!} />}
        {activeTab === "documents" && <DocumentsTab batchId={batchId!} />}
        {activeTab === "liveclasses" && <LiveClassesTab batchId={batchId!} />}
        {activeTab === "tests" && <TestsTab batchId={batchId!} />}
      </motion.div>
    </div>
  );
};

/* --- Tab Components -------------------------------------------------------- */

const OverviewTab = ({ batch }: { batch: Batch }) => {
  const now = new Date();
  const start = new Date(batch.start_date);
  const end = new Date(batch.end_date);
  const totalDuration = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  const progressPct = totalDuration > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100))) : 0;

  return (
    <div className="space-y-6">
      {/* Timeline Progress */}
      <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
          Batch Timeline
        </h3>
        <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
          <span>{formatDate(batch.start_date)}</span>
          <span className="font-semibold text-violet-600">{progressPct}% elapsed</span>
          <span>{formatDate(batch.end_date)}</span>
        </div>
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-100">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-violet-500 to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          />
        </div>
        <p className="mt-2 text-xs text-gray-400">
          {now < start
            ? `Starts ${relativeTime(batch.start_date)}`
            : now > end
              ? "Batch has ended"
              : `${relativeTime(batch.end_date)} remaining`}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Batch Info + Course/Instructor (compact) */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Registration Info
            </h3>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-violet-50 p-2 text-violet-600">
                   <IconSchool size={20} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Course</p>
                  <p className="text-sm font-semibold text-gray-900">{batch.course?.title}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
                   <IconUsers size={20} />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500">Instructor</p>
                  <p className="text-sm font-semibold text-gray-900">{batch.instructor?.name || "Not assigned"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Description
          </h3>
          <p className="text-sm leading-relaxed text-gray-600">
            {batch.description || "No description provided for this batch."}
          </p>
        </div>
      </div>
    </div>
  );
};


const StudentsTab = ({ batchId }: { batchId: string }) => {
  const [list, setList] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  
  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [activeCount, setActiveCount] = useState(0);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [search]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchStudents();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [batchId, currentPage, search]);

  const handleUnenroll = async (studentId: number, studentName: string) => {
    if (!confirm(`Remove "${studentName}" from this batch?`)) return;
    try {
      await batchesApi.unenrollStudent(batchId, studentId);
      fetchStudents();
    } catch (error) {
      console.error("Error unenrolling student:", error);
      alert("Failed to remove student.");
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const res = await batchesApi.getStudents(batchId, {
        page: currentPage,
        limit: itemsPerPage,
        search: search.trim() !== "" ? search.trim() : undefined
      });
      setList(res.students);
      setTotalPages(res.totalPages || 1);
      setTotalStudents(res.total || 0);
      setActiveCount(res.activeCount || 0);
    } catch (error) {
      console.error("Error fetching paginated students:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && list.length === 0) {
    return (
      <div className="flex justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-violet-500" />
      </div>
    );
  }

  if (!loading && list.length === 0 && !search) {
    return (
      <EmptyState
        icon={<IconUsers size={32} />}
        title="No Students Enrolled"
        description="There are no students enrolled in this batch yet."
      />
    );
  }

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();

  return (
    <div className="space-y-4">
      {/* Header with count, search, filter */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">
            {totalStudents} Student{totalStudents !== 1 ? "s" : ""}
          </h3>
          <div className="flex gap-1.5">
            <FilterPill label="All" active={true} count={totalStudents} onClick={() => {}} />
          </div>
        </div>
        <div className="relative">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-700 placeholder-gray-400 outline-none transition-colors focus:border-violet-300 focus:ring-2 focus:ring-violet-100 sm:w-64"
          />
        </div>
      </div>

      {/* Desktop Table */}
      <div className="hidden rounded-2xl border border-gray-100 bg-white shadow-sm md:block">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-6 py-3 font-semibold text-gray-500">Student</th>
                <th className="px-6 py-3 font-semibold text-gray-500">Email</th>
                <th className="px-6 py-3 font-semibold text-gray-500 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((student, i) => (
                <motion.tr
                  key={student.id}
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  className="border-b border-gray-50 last:border-0"
                >
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-xs font-bold text-white">
                        {getInitials(student.name)}
                      </div>
                      <span className="font-medium text-gray-900">{student.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-gray-500">
                    <span className="flex items-center gap-1">
                      <IconMail size={14} />
                      {student.email}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-right">
                    <button
                      onClick={() => handleUnenroll(student.id, student.name)}
                      className="rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition-all"
                      title="Remove from batch"
                    >
                      Remove
                    </button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {!loading && list.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">No students match your search.</p>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3 md:hidden">
        {list.map((student, i) => (
          <motion.div
            key={student.id}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-sm font-bold text-white">
                {getInitials(student.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold text-gray-900">{student.name}</p>
                <p className="truncate text-xs text-gray-500">{student.email}</p>
              </div>
              <button
                onClick={() => handleUnenroll(student.id, student.name)}
                className="shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-red-500 hover:bg-red-50 transition-all"
              >
                Remove
              </button>
            </div>
          </motion.div>
        ))}
        {!loading && list.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">No students match your search.</p>
        )}
      </div>
      
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-4 pb-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-bold rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            Previous
          </button>
          <span className="text-sm font-bold text-gray-700 px-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm font-bold rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

const TopicsTab = ({ batchId }: { batchId: string }) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchTopics();
  }, [batchId, currentPage]);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const res = await topicsApi.listByBatch(batchId, {
        page: currentPage,
        limit: itemsPerPage,
      });
      setTopics(res.topics || []);
      setTotalPages(res.totalPages || 1);
    } catch (error) {
      console.error("Error fetching topics:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && topics.length === 0) {
    return (
      <div className="flex justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-violet-500" />
      </div>
    );
  }

  if (topics.length === 0) {
    return (
      <EmptyState
        icon={<IconBook size={32} />}
        title="No Topics Yet"
        description="No topics have been added to this batch."
      />
    );
  }

  const sorted = [...topics].sort((a, b) => a.order_index - b.order_index);

  return (
    <div className="space-y-3">
      {sorted.map((topic, i) => (
        <motion.div
          key={topic.id}
          custom={i}
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-sm font-bold text-white">
              {topic.order_index}
            </div>
            <div className="min-w-0">
              <h4 className="font-semibold text-gray-900">{topic.title}</h4>
              {topic.description && (
                <p className="mt-1 text-sm text-gray-500">{topic.description}</p>
              )}
              <p className="mt-1.5 text-xs text-gray-400">
                Created {formatDate(topic.createdAt)}
              </p>
            </div>
          </div>
        </motion.div>
      ))}
      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-4 pb-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-bold rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            Previous
          </button>
          <span className="text-sm font-bold text-gray-700 px-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm font-bold rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

const VideosTab = ({ batchId }: { batchId: string }) => {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reorderMode, setReorderMode] = useState(false);

  useEffect(() => {
    fetchVideos();
  }, [batchId]);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const res = await videosApi.list({ batch_id: batchId, limit: 500 });
      setVideos(res.videos || []);
    } catch (error) {
      console.error("Error fetching videos:", error);
    } finally {
      setLoading(false);
    }
  };

  const moveVideo = (index: number, direction: 'up' | 'down') => {
    const newVideos = [...videos];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newVideos.length) return;
    [newVideos[index], newVideos[targetIndex]] = [newVideos[targetIndex], newVideos[index]];
    setVideos(newVideos);
  };

  const saveOrder = async () => {
    try {
      setSaving(true);
      const order = videos.map((v, idx) => ({ video_id: v.id, order_index: idx }));
      await batchesApi.reorderVideos(batchId, order);
      setReorderMode(false);
    } catch (error) {
      console.error("Error saving order:", error);
      alert("Failed to save video order.");
    } finally {
      setSaving(false);
    }
  };

  if (loading && videos.length === 0) {
    return (
      <div className="flex justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-violet-500" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <EmptyState
        icon={<IconVideo size={32} />}
        title="No Videos Yet"
        description="No videos have been added to this batch."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {videos.length} Video{videos.length !== 1 ? 's' : ''}
        </h3>
        <div className="flex items-center gap-2">
          {reorderMode ? (
            <>
              <button
                onClick={() => { setReorderMode(false); fetchVideos(); }}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl text-gray-600 hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={saveOrder}
                disabled={saving}
                className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-all disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Order'}
              </button>
            </>
          ) : (
            <button
              onClick={() => setReorderMode(true)}
              className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-1.5"
            >
              <IconArrowsSort size={14} />
              Reorder
            </button>
          )}
        </div>
      </div>

      {/* Video List */}
      <div className="space-y-2">
        {videos.map((video, i) => (
          <motion.div
            key={video.id}
            layout={reorderMode}
            className={cn(
              "flex items-center gap-3 rounded-xl border p-3 transition-all",
              reorderMode ? "border-violet-200 bg-violet-50/30" : "border-gray-100 bg-white"
            )}
          >
            {/* Reorder controls */}
            {reorderMode && (
              <div className="flex flex-col gap-0.5 shrink-0">
                <button
                  onClick={() => moveVideo(i, 'up')}
                  disabled={i === 0}
                  className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <IconChevronUp size={14} />
                </button>
                <button
                  onClick={() => moveVideo(i, 'down')}
                  disabled={i === videos.length - 1}
                  className="p-1 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <IconChevronDown size={14} />
                </button>
              </div>
            )}

            {/* Order number */}
            <div className="shrink-0 w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
              {i + 1}
            </div>

            {/* Thumbnail */}
            {video.thumbnail_url ? (
              <div className="shrink-0 w-20 aspect-video rounded-lg overflow-hidden bg-gray-900">
                <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="shrink-0 w-20 aspect-video rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
                <IconVideo size={16} className="text-white" />
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-gray-900 truncate">{video.title}</h4>
              <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                {video.duration ? <span>{formatDuration(video.duration)}</span> : null}
                <LanguageBadge language={video.language} />
                <StatusBadge status={video.upload_status} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const DocumentsTab = ({ batchId }: { batchId: string }) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 6;
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    fetchDocuments();
  }, [batchId, currentPage, typeFilter]);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await documentsApi.list({
        batch_id: batchId,
        page: currentPage,
        limit: itemsPerPage,
        file_type: typeFilter === "all" ? undefined : (typeFilter as any),
      });
      setDocuments(res.documents || []);
      setTotalPages(res.totalPages || 1);
    } catch (error) {
      console.error("Error fetching documents:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && documents.length === 0) {
    return (
      <div className="flex justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-violet-500" />
      </div>
    );
  }

  if (!loading && documents.length === 0 && typeFilter === "all") {
    return (
      <EmptyState
        icon={<IconFile size={32} />}
        title="No Documents Yet"
        description="No documents have been uploaded to this batch."
      />
    );
  }

  // Common file types for filter
  const typeOptions = ["all", "pdf", "docx", "pptx", "xlsx", "txt", "zip"];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {typeOptions.map((t) => (
          <FilterPill
            key={t}
            label={t === "all" ? "All" : t.toUpperCase()}
            active={typeFilter === t}
            onClick={() => {
              setTypeFilter(t);
              setCurrentPage(1);
            }}
          />
        ))}
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {documents.map((doc, i) => (
          <motion.div
            key={doc.id}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 p-2 text-white">
                <IconFile size={18} />
              </div>
              <div className="flex items-center gap-2">
                <LanguageBadge language={doc.language} />
                <span className="rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-xs font-medium uppercase text-gray-600">
                  {doc.file_type}
                </span>
              </div>
            </div>
            <h4 className="font-semibold text-gray-900 line-clamp-1">{doc.title}</h4>
            {doc.description && (
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">{doc.description}</p>
            )}
            <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
              <span>{formatFileSize(doc.file_size)}</span>
              <span>{formatDate(doc.createdAt)}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {!loading && documents.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-400">No documents match your filter.</p>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-4 pb-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-bold rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            Previous
          </button>
          <span className="text-sm font-bold text-gray-700 px-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm font-bold rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

const LiveClassesTab = ({ batchId }: { batchId: string }) => {
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 6;
  const [timeFilter, setTimeFilter] = useState<"all" | "upcoming" | "past">("all");
  const now = new Date();

  useEffect(() => {
    fetchLiveClasses();
  }, [batchId, currentPage]);

  const fetchLiveClasses = async () => {
    try {
      setLoading(true);
      const res = await liveClassesApi.listByBatch(batchId, {
        page: currentPage,
        limit: itemsPerPage,
      });
      setLiveClasses(res.liveClasses || []);
      setTotalPages(res.totalPages || 1);
    } catch (error) {
      console.error("Error fetching live classes:", error);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    const sorted = [...liveClasses].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
    if (timeFilter === "upcoming") return sorted.filter((lc) => new Date(lc.start_time) > now);
    if (timeFilter === "past") return sorted.filter((lc) => new Date(lc.start_time) <= now);
    return sorted;
  }, [liveClasses, timeFilter]);

  if (loading && liveClasses.length === 0) {
    return (
      <div className="flex justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-violet-500" />
      </div>
    );
  }

  if (!loading && liveClasses.length === 0 && timeFilter === "all") {
    return (
      <EmptyState
        icon={<IconBrandZoom size={32} />}
        title="No Live Classes Yet"
        description="No live classes have been scheduled for this batch."
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <FilterPill label="All" active={timeFilter === "all"} onClick={() => setTimeFilter("all")} />
        <FilterPill label="Upcoming" active={timeFilter === "upcoming"} onClick={() => setTimeFilter("upcoming")} />
        <FilterPill label="Past" active={timeFilter === "past"} onClick={() => setTimeFilter("past")} />
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((lc, i) => {
          const isPast = new Date(lc.start_time) <= now;
          return (
            <motion.div
              key={lc.id}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 p-2 text-white">
                  <IconBrandZoom size={18} />
                </div>
                <StatusBadge status={lc.status} />
              </div>
              <h4 className="font-semibold text-gray-900 line-clamp-1">{lc.topic}</h4>
              {lc.description && (
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">{lc.description}</p>
              )}
              <div className="mt-3 space-y-1 text-xs text-gray-400">
                <p className="flex items-center gap-1">
                  <IconCalendar size={12} />
                  {formatDateTime(lc.start_time)}
                  <span className="ml-1 font-medium text-violet-500">
                    ({relativeTime(lc.start_time)})
                  </span>
                </p>
                <p className="flex items-center gap-1">
                  <IconClock size={12} />
                  {lc.duration} minutes
                </p>
              </div>
              <div className="mt-3 flex items-center gap-2">
                {lc.zoom_join_url && !isPast && (
                  <a
                    href={lc.zoom_join_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-violet-50 px-2.5 py-1.5 text-xs font-medium text-violet-600 transition-colors hover:bg-violet-100"
                  >
                    <IconExternalLink size={12} />
                    Join Zoom
                  </a>
                )}
                {lc.recording_url && (
                  <a
                    href={lc.recording_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 rounded-lg bg-sky-50 px-2.5 py-1.5 text-xs font-medium text-sky-600 transition-colors hover:bg-sky-100"
                  >
                    <IconPlayerPlay size={12} />
                    Recording
                  </a>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {!loading && filtered.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-400">No classes match your filter.</p>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-4 pb-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-bold rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            Previous
          </button>
          <span className="text-sm font-bold text-gray-700 px-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm font-bold rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

const TestsTab = ({ batchId }: { batchId: string }) => {
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 6;
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    fetchTests();
  }, [batchId, currentPage, statusFilter]);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const res = await testsApi.list({
        batch_id: batchId,
        page: currentPage,
        limit: itemsPerPage,
        status: statusFilter === "all" ? undefined : statusFilter,
      });
      setTests(res.tests || []);
      setTotalPages(res.totalPages || 1);
    } catch (error) {
      console.error("Error fetching tests:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading && tests.length === 0) {
    return (
      <div className="flex justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-violet-500" />
      </div>
    );
  }

  if (!loading && tests.length === 0 && statusFilter === "all") {
    return (
      <EmptyState
        icon={<IconClipboard size={32} />}
        title="No Tests Yet"
        description="No tests have been created for this batch."
      />
    );
  }

  const statusOptions = ["all", "draft", "published", "archived"];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {statusOptions.map((s) => (
          <FilterPill
            key={s}
            label={s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            active={statusFilter === s}
            onClick={() => {
              setStatusFilter(s);
              setCurrentPage(1);
            }}
          />
        ))}
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tests.map((test, i) => {
          const questionCount = test.blocks?.reduce((acc, b) => acc + (b.total_questions || 0), 0) || 0;
          return (
            <motion.div
              key={test.id}
              custom={i}
              variants={cardVariants}
              initial="hidden"
              animate="visible"
              className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
            >
              <div className="mb-3 flex items-center justify-between">
                <div className="rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 p-2 text-white">
                  <IconClipboard size={18} />
                </div>
                <StatusBadge status={test.status} />
              </div>
              <h4 className="font-semibold text-gray-900 line-clamp-1">{test.title}</h4>
              {test.description && (
                <p className="mt-1 text-sm text-gray-500 line-clamp-2">{test.description}</p>
              )}
              {/* Meta pills */}
              <div className="mt-3 flex flex-wrap gap-1.5">
                {test.duration_minutes && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                    <IconClock size={10} />
                    {test.duration_minutes} min
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                  <IconRefresh size={10} />
                  {test.max_attempts} attempt{test.max_attempts !== 1 ? "s" : ""}
                </span>
                {questionCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-gray-200 bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                    Q: {questionCount}
                  </span>
                )}
              </div>
              {/* Date range */}
              <div className="mt-3 text-xs text-gray-400">
                <p className="flex items-center gap-1">
                  <IconCalendar size={12} />
                  {formatDate(test.start_time)} &ndash; {formatDate(test.end_time)}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>

      {!loading && tests.length === 0 && (
        <p className="py-8 text-center text-sm text-gray-400">No tests match your filter.</p>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-3 mt-4 pb-2">
          <button
            onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
            disabled={currentPage === 1}
            className="px-4 py-2 text-sm font-bold rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            Previous
          </button>
          <span className="text-sm font-bold text-gray-700 px-2">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
            disabled={currentPage === totalPages}
            className="px-4 py-2 text-sm font-bold rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminBatchDetailPage;
