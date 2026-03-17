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
  uploading: "bg-amber-100 text-amber-700 border-amber-200",
  ready: "bg-emerald-100 text-emerald-700 border-emerald-200",
  processing: "bg-sky-100 text-sky-700 border-sky-200",
  errored: "bg-rose-100 text-rose-700 border-rose-200",
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

const cardVariants = {
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
  const [topics, setTopics] = useState<Topic[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [tests, setTests] = useState<Test[]>([]);

  useEffect(() => {
    if (batchId) {
      fetchAllData();
    }
  }, [batchId]);

  const fetchAllData = async () => {
    try {
      setLoading(true);
      const [batchRes, topicsRes, videosRes, documentsRes, liveClassesRes, testsRes] =
        await Promise.all([
          batchesApi.getById(batchId!),
          topicsApi.listByBatch(batchId!).catch(() => ({ topics: [] })),
          videosApi.list({ batch_id: batchId! }).catch(() => ({ videos: [] })),
          documentsApi.list({ batch_id: batchId! }).catch(() => ({ documents: [] })),
          liveClassesApi.listByBatch(batchId!).catch(() => ({ liveClasses: [] })),
          testsApi.list({ batch_id: batchId! }).catch(() => ({ tests: [] })),
        ]);

      setBatch(batchRes.batch);
      setTopics(topicsRes.topics || []);
      setVideos(videosRes.videos || []);
      setDocuments(documentsRes.documents || []);
      setLiveClasses(liveClassesRes.liveClasses || []);
      setTests(testsRes.tests || []);
    } catch (error) {
      console.error("Error fetching batch details:", error);
    } finally {
      setLoading(false);
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
      count: students.length,
      icon: <IconUsers size={22} />,
      gradient: "from-violet-500 to-purple-600",
    },
    {
      label: "Topics",
      count: topics.length,
      icon: <IconBook size={22} />,
      gradient: "from-emerald-500 to-teal-600",
    },
    {
      label: "Videos",
      count: videos.length,
      icon: <IconVideo size={22} />,
      gradient: "from-sky-500 to-blue-600",
    },
    {
      label: "Documents",
      count: documents.length,
      icon: <IconFile size={22} />,
      gradient: "from-amber-500 to-orange-600",
    },
    {
      label: "Live Classes",
      count: liveClasses.length,
      icon: <IconBrandZoom size={22} />,
      gradient: "from-rose-500 to-pink-600",
    },
    {
      label: "Tests",
      count: tests.length,
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
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">
                {batch.batch_name}
              </h1>
              <StatusBadge status={batch.status} />
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
          <OverviewTab
            batch={batch}
            videos={videos}
            documents={documents}
            liveClasses={liveClasses}
            tests={tests}
          />
        )}
        {activeTab === "students" && <StudentsTab students={students} />}
        {activeTab === "topics" && <TopicsTab topics={topics} />}
        {activeTab === "videos" && <VideosTab videos={videos} />}
        {activeTab === "documents" && <DocumentsTab documents={documents} />}
        {activeTab === "liveclasses" && <LiveClassesTab liveClasses={liveClasses} />}
        {activeTab === "tests" && <TestsTab tests={tests} />}
      </motion.div>
    </div>
  );
};

/* --- Tab Components -------------------------------------------------------- */

const OverviewTab = ({
  batch,
  videos,
  documents,
  liveClasses,
  tests,
}: {
  batch: Batch;
  videos: Video[];
  documents: Document[];
  liveClasses: LiveClass[];
  tests: Test[];
}) => {
  const now = new Date();
  const start = new Date(batch.start_date);
  const end = new Date(batch.end_date);
  const totalDuration = end.getTime() - start.getTime();
  const elapsed = now.getTime() - start.getTime();
  const progressPct = totalDuration > 0 ? Math.min(100, Math.max(0, Math.round((elapsed / totalDuration) * 100))) : 0;

  const videosByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    videos.forEach((v) => {
      map[v.upload_status] = (map[v.upload_status] || 0) + 1;
    });
    return map;
  }, [videos]);

  const testsByStatus = useMemo(() => {
    const map: Record<string, number> = {};
    tests.forEach((t) => {
      map[t.status] = (map[t.status] || 0) + 1;
    });
    return map;
  }, [tests]);

  const classesByTime = useMemo(() => {
    const upcoming = liveClasses.filter((lc) => new Date(lc.start_time) > now);
    const past = liveClasses.filter((lc) => new Date(lc.start_time) <= now);
    return { upcoming: upcoming.length, past: past.length };
  }, [liveClasses]);

  // Upcoming schedule: merge live classes and tests, sort by date
  const upcomingEvents = useMemo(() => {
    const events: { type: "class" | "test"; title: string; date: string; status: string }[] = [];
    liveClasses
      .filter((lc) => new Date(lc.start_time) > now)
      .forEach((lc) => events.push({ type: "class", title: lc.topic, date: lc.start_time, status: lc.status }));
    tests
      .filter((t) => new Date(t.start_time) > now)
      .forEach((t) => events.push({ type: "test", title: t.title, date: t.start_time, status: t.status }));
    events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return events.slice(0, 5);
  }, [liveClasses, tests]);

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

      {/* Content Summary */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Videos summary */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="rounded-lg bg-gradient-to-br from-sky-500 to-blue-600 p-1.5 text-white">
              <IconVideo size={16} />
            </div>
            <span className="text-sm font-semibold text-gray-700">Videos</span>
            <span className="ml-auto text-lg font-bold text-gray-900">{videos.length}</span>
          </div>
          <div className="space-y-1 text-xs text-gray-500">
            {Object.entries(videosByStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between">
                <span className="capitalize">{status}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
            {videos.length === 0 && <span className="text-gray-400">No videos yet</span>}
          </div>
        </div>

        {/* Documents summary */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 p-1.5 text-white">
              <IconFile size={16} />
            </div>
            <span className="text-sm font-semibold text-gray-700">Documents</span>
            <span className="ml-auto text-lg font-bold text-gray-900">{documents.length}</span>
          </div>
          <div className="space-y-1 text-xs text-gray-500">
            {(() => {
              const byType: Record<string, number> = {};
              documents.forEach((d) => { byType[d.file_type] = (byType[d.file_type] || 0) + 1; });
              return Object.entries(byType).map(([type, count]) => (
                <div key={type} className="flex justify-between">
                  <span className="uppercase">{type}</span>
                  <span className="font-medium">{count}</span>
                </div>
              ));
            })()}
            {documents.length === 0 && <span className="text-gray-400">No documents yet</span>}
          </div>
        </div>

        {/* Live Classes summary */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="rounded-lg bg-gradient-to-br from-rose-500 to-pink-600 p-1.5 text-white">
              <IconBrandZoom size={16} />
            </div>
            <span className="text-sm font-semibold text-gray-700">Live Classes</span>
            <span className="ml-auto text-lg font-bold text-gray-900">{liveClasses.length}</span>
          </div>
          <div className="space-y-1 text-xs text-gray-500">
            <div className="flex justify-between">
              <span>Upcoming</span>
              <span className="font-medium">{classesByTime.upcoming}</span>
            </div>
            <div className="flex justify-between">
              <span>Completed</span>
              <span className="font-medium">{classesByTime.past}</span>
            </div>
            {liveClasses.length === 0 && <span className="text-gray-400">No classes yet</span>}
          </div>
        </div>

        {/* Tests summary */}
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <div className="rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 p-1.5 text-white">
              <IconClipboard size={16} />
            </div>
            <span className="text-sm font-semibold text-gray-700">Tests</span>
            <span className="ml-auto text-lg font-bold text-gray-900">{tests.length}</span>
          </div>
          <div className="space-y-1 text-xs text-gray-500">
            {Object.entries(testsByStatus).map(([status, count]) => (
              <div key={status} className="flex justify-between">
                <span className="capitalize">{status}</span>
                <span className="font-medium">{count}</span>
              </div>
            ))}
            {tests.length === 0 && <span className="text-gray-400">No tests yet</span>}
          </div>
        </div>
      </div>

      {/* Upcoming Schedule + Batch Info */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Upcoming Schedule */}
        <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">
            Upcoming Schedule
          </h3>
          {upcomingEvents.length === 0 ? (
            <p className="py-4 text-center text-sm text-gray-400">No upcoming events</p>
          ) : (
            <div className="space-y-3">
              {upcomingEvents.map((event, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl bg-gray-50 p-3">
                  <div
                    className={cn(
                      "shrink-0 rounded-lg p-1.5 text-white",
                      event.type === "class"
                        ? "bg-gradient-to-br from-rose-500 to-pink-600"
                        : "bg-gradient-to-br from-indigo-500 to-violet-600"
                    )}
                  >
                    {event.type === "class" ? <IconBrandZoom size={14} /> : <IconClipboard size={14} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-gray-900">{event.title}</p>
                    <p className="text-xs text-gray-500">{formatDateTime(event.date)}</p>
                  </div>
                  <span className="shrink-0 text-xs font-medium text-violet-600">
                    {relativeTime(event.date)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Batch Info + Course/Instructor (compact) */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">
              Batch Details
            </h3>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-gray-500">Status</dt>
                <dd><StatusBadge status={batch.status} /></dd>
              </div>
              {batch.description && (
                <div>
                  <dt className="mb-0.5 text-gray-500">Description</dt>
                  <dd className="text-gray-700">{batch.description}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-gray-500">Duration</dt>
                <dd className="font-medium text-gray-900">
                  {formatDate(batch.start_date)} &ndash; {formatDate(batch.end_date)}
                </dd>
              </div>
              {batch.createdAt && (
                <div className="flex justify-between">
                  <dt className="text-gray-500">Created</dt>
                  <dd className="font-medium text-gray-900">{formatDate(batch.createdAt)}</dd>
                </div>
              )}
            </dl>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {batch.course && (
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 p-1.5 text-white">
                    <IconSchool size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{batch.course.title}</p>
                    <p className="text-[10px] text-gray-400">Course</p>
                  </div>
                </div>
              </div>
            )}
            {batch.instructor && (
              <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 p-1.5 text-white">
                    <IconUsers size={16} />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{batch.instructor.name}</p>
                    <p className="truncate text-[10px] text-gray-400">{batch.instructor.email}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const StudentsTab = ({ students }: { students: Batch["students"] }) => {
  const list = students || [];
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");

  const filtered = useMemo(() => {
    return list.filter((s) => {
      const matchesSearch =
        !search ||
        s.name.toLowerCase().includes(search.toLowerCase()) ||
        s.email.toLowerCase().includes(search.toLowerCase());
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "active" && s.is_active) ||
        (statusFilter === "inactive" && !s.is_active);
      return matchesSearch && matchesStatus;
    });
  }, [list, search, statusFilter]);

  const activeCount = list.filter((s) => s.is_active).length;
  const inactiveCount = list.length - activeCount;

  if (list.length === 0) {
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
            {list.length} Student{list.length !== 1 ? "s" : ""}
          </h3>
          <div className="flex gap-1.5">
            <FilterPill label="All" active={statusFilter === "all"} count={list.length} onClick={() => setStatusFilter("all")} />
            {/* <FilterPill label="Active" active={statusFilter === "active"} count={activeCount} onClick={() => setStatusFilter("active")} />
            <FilterPill label="Inactive" active={statusFilter === "inactive"} count={inactiveCount} onClick={() => setStatusFilter("inactive")} /> */}
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
                {/* <th className="px-6 py-3 font-semibold text-gray-500">Status</th> */}
              </tr>
            </thead>
            <tbody>
              {filtered.map((student, i) => (
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
                  {/* <td className="px-6 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                        student.is_active
                          ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                          : "border-rose-200 bg-rose-100 text-rose-700"
                      )}
                    >
                      {student.is_active ? "Active" : "Inactive"}
                    </span>
                  </td> */}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">No students match your filters.</p>
        )}
      </div>

      {/* Mobile Cards */}
      <div className="space-y-3 md:hidden">
        {filtered.map((student, i) => (
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
              {/* <span
                className={cn(
                  "shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
                  student.is_active
                    ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                    : "border-rose-200 bg-rose-100 text-rose-700"
                )}
              >
                {student.is_active ? "Active" : "Inactive"}
              </span> */}
            </div>
          </motion.div>
        ))}
        {filtered.length === 0 && (
          <p className="py-8 text-center text-sm text-gray-400">No students match your filters.</p>
        )}
      </div>
    </div>
  );
};

const TopicsTab = ({ topics }: { topics: Topic[] }) => {
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
    </div>
  );
};

const VideosTab = ({ videos }: { videos: Video[] }) => {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = { all: videos.length };
    videos.forEach((v) => {
      map[v.upload_status] = (map[v.upload_status] || 0) + 1;
    });
    return map;
  }, [videos]);

  const filtered = useMemo(
    () => (statusFilter === "all" ? videos : videos.filter((v) => v.upload_status === statusFilter)),
    [videos, statusFilter]
  );

  const totalDuration = useMemo(
    () => videos.reduce((acc, v) => acc + (v.duration || 0), 0),
    [videos]
  );

  if (videos.length === 0) {
    return (
      <EmptyState
        icon={<IconVideo size={32} />}
        title="No Videos Yet"
        description="No videos have been added to this batch."
      />
    );
  }

  const statusOptions = ["all", "ready", "processing", "uploading", "errored"];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {statusOptions.map((s) =>
            statusCounts[s] !== undefined || s === "all" ? (
              <FilterPill
                key={s}
                label={s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
                active={statusFilter === s}
                count={statusCounts[s] || 0}
                onClick={() => setStatusFilter(s)}
              />
            ) : null
          )}
        </div>
        <div className="flex items-center gap-1.5 text-sm text-gray-500">
          <IconClock size={14} />
          <span>Total: <span className="font-semibold text-gray-700">{formatDuration(totalDuration)}</span></span>
        </div>
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((video, i) => (
          <motion.div
            key={video.id}
            custom={i}
            variants={cardVariants}
            initial="hidden"
            animate="visible"
            className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 p-2 text-white">
                <IconVideo size={18} />
              </div>
              <div className="flex items-center gap-2">
                <LanguageBadge language={video.language} />
                <StatusBadge status={video.upload_status} />
              </div>
            </div>
            <h4 className="font-semibold text-gray-900 line-clamp-1">{video.title}</h4>
            {video.description && (
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">{video.description}</p>
            )}
            <div className="mt-3 flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <IconClock size={12} />
                {formatDuration(video.duration)}
              </span>
              <span>{formatDate(video.createdAt)}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const DocumentsTab = ({ documents }: { documents: Document[] }) => {
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const typeCounts = useMemo(() => {
    const map: Record<string, number> = { all: documents.length };
    documents.forEach((d) => {
      map[d.file_type] = (map[d.file_type] || 0) + 1;
    });
    return map;
  }, [documents]);

  const filtered = useMemo(
    () => (typeFilter === "all" ? documents : documents.filter((d) => d.file_type === typeFilter)),
    [documents, typeFilter]
  );

  if (documents.length === 0) {
    return (
      <EmptyState
        icon={<IconFile size={32} />}
        title="No Documents Yet"
        description="No documents have been uploaded to this batch."
      />
    );
  }

  const typeOptions = ["all", ...Object.keys(typeCounts).filter((k) => k !== "all")];

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {typeOptions.map((t) => (
          <FilterPill
            key={t}
            label={t === "all" ? "All" : t.toUpperCase()}
            active={typeFilter === t}
            count={typeCounts[t] || 0}
            onClick={() => setTypeFilter(t)}
          />
        ))}
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((doc, i) => (
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
    </div>
  );
};

const LiveClassesTab = ({ liveClasses }: { liveClasses: LiveClass[] }) => {
  const [timeFilter, setTimeFilter] = useState<"all" | "upcoming" | "past">("all");
  const now = new Date();

  const counts = useMemo(() => {
    const upcoming = liveClasses.filter((lc) => new Date(lc.start_time) > now).length;
    return { all: liveClasses.length, upcoming, past: liveClasses.length - upcoming };
  }, [liveClasses]);

  const filtered = useMemo(() => {
    const sorted = [...liveClasses].sort(
      (a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
    );
    if (timeFilter === "upcoming") return sorted.filter((lc) => new Date(lc.start_time) > now);
    if (timeFilter === "past") return sorted.filter((lc) => new Date(lc.start_time) <= now);
    return sorted;
  }, [liveClasses, timeFilter]);

  if (liveClasses.length === 0) {
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
        <FilterPill label="All" active={timeFilter === "all"} count={counts.all} onClick={() => setTimeFilter("all")} />
        <FilterPill label="Upcoming" active={timeFilter === "upcoming"} count={counts.upcoming} onClick={() => setTimeFilter("upcoming")} />
        <FilterPill label="Past" active={timeFilter === "past"} count={counts.past} onClick={() => setTimeFilter("past")} />
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
    </div>
  );
};

const TestsTab = ({ tests }: { tests: Test[] }) => {
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const statusCounts = useMemo(() => {
    const map: Record<string, number> = { all: tests.length };
    tests.forEach((t) => {
      map[t.status] = (map[t.status] || 0) + 1;
    });
    return map;
  }, [tests]);

  const filtered = useMemo(
    () => (statusFilter === "all" ? tests : tests.filter((t) => t.status === statusFilter)),
    [tests, statusFilter]
  );

  if (tests.length === 0) {
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
            count={statusCounts[s] || 0}
            onClick={() => setStatusFilter(s)}
          />
        ))}
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((test, i) => {
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
                <p className="mt-0.5 text-[10px]">
                  {formatDateTime(test.start_time)} &ndash; {formatDateTime(test.end_time)}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};
