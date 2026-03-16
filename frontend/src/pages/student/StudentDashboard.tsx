import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  IconSchool,
  IconVideo,
  IconFileText,
  IconBrandZoom,
  IconCalendar,
  IconChecklist,
  IconChevronRight,
  IconArrowLeft,
  IconClock,
  IconHistory,
  IconFileTypePdf,
  IconFileTypeDoc,
  IconPlayerPlay,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useNavigate } from "react-router-dom";
import { batchesApi } from "@/api/endpoints/batches";
import { videosApi } from "@/api/endpoints/videos";
import { documentsApi } from "@/api/endpoints/documents";
import { liveClassesApi } from "@/api/endpoints/liveClasses";
import { testsApi } from "@/api/endpoints/tests";
import { attemptsApi } from "@/api/endpoints/attempts";
import type { Batch, Video, Document, LiveClass, Test } from "@/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface ScheduleItem {
  id: string;
  type: "class" | "test";
  title: string;
  startTime: string;
  batchName: string;
}

// ---------------------------------------------------------------------------
// Stagger helpers
// ---------------------------------------------------------------------------
const container = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } };
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/** Single stat card */
const StatCard: React.FC<{
  label: string;
  count: number;
  gradient: string;
  shadow: string;
  icon: React.ReactNode;
  onClick: () => void;
}> = ({ label, count, gradient, shadow, icon, onClick }) => (
  <motion.div
    variants={fadeUp}
    onClick={onClick}
    className={cn(
      "rounded-2xl p-3 sm:p-4 md:p-5 cursor-pointer transition-transform hover:scale-[1.03]",
      "shadow-lg",
      gradient,
      shadow
    )}
  >
    <div className="flex items-center justify-between mb-3">
      <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
        {icon}
      </div>
      <IconChevronRight className="w-4 h-4 text-white/60" />
    </div>
    <p className="text-2xl sm:text-3xl font-extrabold text-white">{count}</p>
    <p className="text-xs font-medium text-white/80 mt-0.5">{label}</p>
  </motion.div>
);

/** Single quick-action button */
const QuickAction: React.FC<{
  label: string;
  icon: React.ReactNode;
  color: string;
  onClick: () => void;
}> = ({ label, icon, color, onClick }) => (
  <motion.button
    variants={fadeUp}
    whileHover={{ scale: 1.04 }}
    whileTap={{ scale: 0.97 }}
    onClick={onClick}
    className={cn(
      "flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white whitespace-nowrap shadow-md transition-colors",
      color
    )}
  >
    {icon}
    {label}
  </motion.button>
);

/** Single upcoming-schedule row */
const ScheduleRow: React.FC<{ item: ScheduleItem; idx: number }> = ({ item, idx }) => (
  <motion.div
    initial={{ opacity: 0, x: -12 }}
    animate={{ opacity: 1, x: 0 }}
    transition={{ delay: idx * 0.06 }}
    className="flex items-center gap-3 rounded-xl bg-white border border-gray-100 p-3 hover:border-violet-200 transition-colors"
  >
    <div
      className={cn(
        "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
        item.type === "class" ? "bg-sky-100" : "bg-violet-100"
      )}
    >
      {item.type === "class" ? (
        <IconBrandZoom className="w-4 h-4 text-sky-600" />
      ) : (
        <IconChecklist className="w-4 h-4 text-violet-600" />
      )}
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
      <p className="text-[11px] text-gray-500 truncate">
        {new Date(item.startTime).toLocaleString(undefined, {
          dateStyle: "medium",
          timeStyle: "short",
        })}{" "}
        &middot; {item.batchName}
      </p>
    </div>
  </motion.div>
);

// ---------------------------------------------------------------------------
// Recently Accessed (localStorage-based)
// ---------------------------------------------------------------------------
const RecentlyAccessed: React.FC = () => {
  const navigate = useNavigate();
  const recentVideos = JSON.parse(localStorage.getItem('lms_recent_videos') || '[]').slice(0, 4);
  const recentDocs = JSON.parse(localStorage.getItem('lms_recent_documents') || '[]').slice(0, 4);
  const combined = [
    ...recentVideos.map((v: any) => ({ ...v, type: 'video' })),
    ...recentDocs.map((d: any) => ({ ...d, type: 'document' })),
  ].sort((a, b) => new Date(b.watchedAt || b.viewedAt).getTime() - new Date(a.watchedAt || a.viewedAt).getTime()).slice(0, 6);

  if (combined.length === 0) return null;

  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  };

  return (
    <div>
      <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
        <IconHistory className="w-5 h-5 text-violet-500" />
        Recently Accessed
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {combined.map((item: any, idx: number) => (
          <motion.button
            key={`${item.type}-${item.id}`}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: idx * 0.05 }}
            onClick={() => navigate(item.type === 'video' ? '/student/videos' : '/student/documents')}
            className="flex items-center gap-3 rounded-xl bg-white border border-gray-100 p-3 hover:border-violet-200 hover:shadow-sm transition-all text-left w-full"
          >
            <div className={cn(
              "w-9 h-9 rounded-lg flex items-center justify-center shrink-0",
              item.type === 'video' ? "bg-emerald-100" : "bg-amber-100"
            )}>
              {item.type === 'video' ? (
                <IconPlayerPlay className="w-4 h-4 text-emerald-600" />
              ) : (
                <IconFileText className="w-4 h-4 text-amber-600" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{item.title}</p>
              <p className="text-[11px] text-gray-400">
                {getTimeAgo(item.watchedAt || item.viewedAt)}
              </p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export const StudentDashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();

  // Core data
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  // Stats
  const [testsPending, setTestsPending] = useState(0);
  const [upcomingClassCount, setUpcomingClassCount] = useState(0);
  const [videosCount, setVideosCount] = useState(0);
  const [docsCount, setDocsCount] = useState(0);

  // Schedule
  const [scheduleItems, setScheduleItems] = useState<ScheduleItem[]>([]);

  // All live classes (for counting + schedule)
  const [allLiveClasses, setAllLiveClasses] = useState<LiveClass[]>([]);

  // Batch drill-down
  const [selectedBatch, setSelectedBatch] = useState<Batch | null>(null);
  const [batchContentCounts, setBatchContentCounts] = useState({ videos: 0, documents: 0, classes: 0 });
  const [batchContentLoading, setBatchContentLoading] = useState(false);

  // -----------------------------------------------------------------------
  // Fetch everything on mount
  // -----------------------------------------------------------------------
  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [batchRes, videosRes, docsRes, testsRes, attemptsRes] = await Promise.all([
        batchesApi.getStudentBatches().catch(() => ({ batches: [] as Batch[] })),
        videosApi.list().catch(() => ({ videos: [] as Video[] })),
        documentsApi.list().catch(() => ({ documents: [] as Document[] })),
        testsApi.list().catch(() => ({ tests: [] as Test[] })),
        attemptsApi.getMyAttempts().catch(() => ({ attempts: [] as any[] })),
      ]);

      const fetchedBatches = batchRes.batches ?? [];
      setBatches(fetchedBatches);
      setVideosCount(videosRes.videos?.length ?? 0);
      setDocsCount(docsRes.documents?.length ?? 0);

      // Pending tests: tests that have no completed attempt
      const completedTestIds = new Set(
        (attemptsRes.attempts ?? [])
          .filter((a: any) => a.status === "completed")
          .map((a: any) => a.test_id)
      );
      const pending = (testsRes.tests ?? []).filter(
        (t) => t.status === "published" && !completedTestIds.has(t.id)
      );
      setTestsPending(pending.length);

      // Fetch live classes from each batch in parallel
      if (fetchedBatches.length > 0) {
        const classResults = await Promise.all(
          fetchedBatches.map((b) =>
            liveClassesApi.listByBatch(b.id).catch(() => ({ liveClasses: [] as LiveClass[] }))
          )
        );
        const classes = classResults.flatMap((r) => r.liveClasses ?? []);
        setAllLiveClasses(classes);

        // Upcoming class count
        const now = new Date();
        const upcoming = classes.filter(
          (c) => c.status === "scheduled" && new Date(c.start_time) > now
        );
        setUpcomingClassCount(upcoming.length);

        // Build schedule: upcoming classes + tests with future start_time
        const classItems: ScheduleItem[] = upcoming.map((c) => ({
          id: `class-${c.id}`,
          type: "class",
          title: c.topic,
          startTime: c.start_time,
          batchName: c.batch?.batch_name ?? fetchedBatches.find((b) => b.id === c.batch_id)?.batch_name ?? "Batch",
        }));
        const testItems: ScheduleItem[] = pending
          .filter((t) => new Date(t.start_time) > now)
          .map((t) => ({
            id: `test-${t.id}`,
            type: "test",
            title: t.title,
            startTime: t.start_time,
            batchName: fetchedBatches.find((b) => b.id === t.batch_id)?.batch_name ?? "Batch",
          }));

        const combined = [...classItems, ...testItems].sort(
          (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
        setScheduleItems(combined);
      }
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // -----------------------------------------------------------------------
  // Batch drill-down content
  // -----------------------------------------------------------------------
  useEffect(() => {
    if (!selectedBatch) return;
    fetchBatchCounts(selectedBatch.id);
  }, [selectedBatch]);

  const fetchBatchCounts = async (batchId: string) => {
    setBatchContentLoading(true);
    try {
      const [vRes, dRes] = await Promise.all([
        videosApi.list({ batch_id: batchId }).catch(() => ({ videos: [] })),
        documentsApi.list({ batch_id: batchId }).catch(() => ({ documents: [] })),
      ]);
      const classCount = allLiveClasses.filter((c) => c.batch_id === batchId).length;
      setBatchContentCounts({
        videos: vRes.videos?.length ?? 0,
        documents: dRes.documents?.length ?? 0,
        classes: classCount,
      });
    } catch {
      setBatchContentCounts({ videos: 0, documents: 0, classes: 0 });
    } finally {
      setBatchContentLoading(false);
    }
  };

  // -----------------------------------------------------------------------
  // Loading state
  // -----------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-violet-200 border-t-violet-600 mx-auto mb-4" />
          <p className="text-gray-500">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Batch detail view
  // -----------------------------------------------------------------------
  if (selectedBatch) {
    return (
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => setSelectedBatch(null)}
          className="flex items-center gap-2 text-gray-500 hover:text-violet-600 mb-4 transition-colors"
        >
          <IconArrowLeft className="w-4 h-4" />
          <span className="font-medium text-sm">Back to Dashboard</span>
        </button>

        <div className="rounded-2xl bg-gradient-to-r from-violet-500 to-purple-600 p-4 sm:p-5 shadow-lg shadow-violet-500/20 mb-5">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-white mb-1">{selectedBatch.batch_name}</h1>
              {selectedBatch.course && <p className="text-white/70 text-sm mb-1">{selectedBatch.course.title}</p>}
              {selectedBatch.instructor && (
                <div className="flex items-center gap-2 mt-2">
                  <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold text-white">
                    {selectedBatch.instructor.name.charAt(0)}
                  </div>
                  <span className="text-xs text-white/80">{selectedBatch.instructor.name}</span>
                </div>
              )}
            </div>
            <span className={cn(
              "inline-flex items-center rounded-full px-3 py-1 text-xs font-bold",
              selectedBatch.status === "ongoing" && "bg-emerald-200 text-emerald-800",
              selectedBatch.status === "completed" && "bg-violet-200 text-violet-800",
              selectedBatch.status === "draft" && "bg-amber-200 text-amber-800",
              !["ongoing", "completed", "draft"].includes(selectedBatch.status) && "bg-white/20 text-white"
            )}>
              {selectedBatch.status}
            </span>
          </div>
        </div>

        {batchContentLoading ? (
          <p className="text-gray-500 text-sm">Loading content...</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div
              onClick={() => navigate("/student/videos")}
              className="rounded-2xl bg-white border border-gray-100 p-3 sm:p-4 md:p-5 hover:border-violet-300 cursor-pointer transition-colors"
            >
              <IconVideo className="w-6 h-6 text-emerald-500 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{batchContentCounts.videos}</p>
              <p className="text-xs text-gray-500">Videos</p>
            </div>
            <div
              onClick={() => navigate("/student/documents")}
              className="rounded-2xl bg-white border border-gray-100 p-3 sm:p-4 md:p-5 hover:border-amber-300 cursor-pointer transition-colors"
            >
              <IconFileText className="w-6 h-6 text-amber-500 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{batchContentCounts.documents}</p>
              <p className="text-xs text-gray-500">Documents</p>
            </div>
            <div
              onClick={() => navigate("/student/live-classes")}
              className="rounded-2xl bg-white border border-gray-100 p-3 sm:p-4 md:p-5 hover:border-sky-300 cursor-pointer transition-colors"
            >
              <IconBrandZoom className="w-6 h-6 text-sky-500 mb-2" />
              <p className="text-2xl font-bold text-gray-900">{batchContentCounts.classes}</p>
              <p className="text-xs text-gray-500">Live Classes</p>
            </div>
          </div>
        )}
      </div>
    );
  }

  // -----------------------------------------------------------------------
  // Main dashboard view
  // -----------------------------------------------------------------------
  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Welcome Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-2xl sm:text-3xl md:text-5xl font-bold text-gray-900 mb-1">
          Welcome back, {user?.name?.split(" ")[0]}!
        </h1>
        <p className="text-sm md:text-base text-gray-500">Here's what's happening today</p>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
      >
        <StatCard
          label="Tests Pending"
          count={testsPending}
          gradient="bg-gradient-to-br from-violet-500 to-purple-600"
          shadow="shadow-violet-500/20"
          icon={<IconChecklist className="w-5 h-5 text-white" />}
          onClick={() => navigate("/student/tests")}
        />
        <StatCard
          label="Upcoming Classes"
          count={upcomingClassCount}
          gradient="bg-gradient-to-br from-sky-400 to-blue-600"
          shadow="shadow-sky-500/20"
          icon={<IconBrandZoom className="w-5 h-5 text-white" />}
          onClick={() => navigate("/student/live-classes")}
        />
        <StatCard
          label="Videos Available"
          count={videosCount}
          gradient="bg-gradient-to-br from-emerald-400 to-emerald-600"
          shadow="shadow-emerald-500/20"
          icon={<IconVideo className="w-5 h-5 text-white" />}
          onClick={() => navigate("/student/videos")}
        />
        <StatCard
          label="Documents"
          count={docsCount}
          gradient="bg-gradient-to-br from-amber-400 to-orange-500"
          shadow="shadow-amber-500/20"
          icon={<IconFileText className="w-5 h-5 text-white" />}
          onClick={() => navigate("/student/documents")}
        />
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        variants={container}
        initial="hidden"
        animate="show"
        className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide"
      >
        <QuickAction
          label="Take a Test"
          icon={<IconChecklist className="w-4 h-4" />}
          color="bg-violet-600 hover:bg-violet-700"
          onClick={() => navigate("/student/tests")}
        />
        <QuickAction
          label="Join Live Class"
          icon={<IconBrandZoom className="w-4 h-4" />}
          color="bg-sky-500 hover:bg-sky-600"
          onClick={() => navigate("/student/live-classes")}
        />
        <QuickAction
          label="Watch Videos"
          icon={<IconVideo className="w-4 h-4" />}
          color="bg-emerald-500 hover:bg-emerald-600"
          onClick={() => navigate("/student/videos")}
        />
        <QuickAction
          label="Browse Documents"
          icon={<IconFileText className="w-4 h-4" />}
          color="bg-amber-500 hover:bg-amber-600"
          onClick={() => navigate("/student/documents")}
        />
      </motion.div>

      {/* Recently Accessed */}
      <RecentlyAccessed />

      {/* Upcoming Schedule */}
      {scheduleItems.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <IconCalendar className="w-5 h-5 text-violet-500" />
              Upcoming Schedule
            </h2>
            {scheduleItems.length > 5 && (
              <button
                onClick={() => navigate("/student/live-classes")}
                className="text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors"
              >
                View All
              </button>
            )}
          </div>
          <div className="space-y-2">
            {scheduleItems.slice(0, 5).map((item, idx) => (
              <ScheduleRow key={item.id} item={item} idx={idx} />
            ))}
          </div>
        </div>
      )}

      {/* Your Batches */}
      <div>
        <h2 className="text-base font-bold text-gray-900 mb-3 flex items-center gap-2">
          <IconSchool className="w-5 h-5 text-violet-500" />
          Your Batches
        </h2>

        {batches.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-48 rounded-2xl bg-white border border-gray-100 p-6"
          >
            <IconSchool className="w-12 h-12 text-violet-300 mb-3" strokeWidth={1.5} />
            <p className="text-gray-900 font-semibold text-sm mb-1">No batches yet</p>
            <p className="text-gray-500 text-xs text-center">
              You haven't been enrolled in any batches yet. Contact your administrator.
            </p>
          </motion.div>
        ) : (
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4"
          >
            {batches.map((batch, idx) => {
              const palette = [
                "bg-gradient-to-br from-violet-500 to-purple-600 shadow-violet-500/20",
                "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-500/20",
                "bg-gradient-to-br from-sky-500 to-blue-600 shadow-sky-500/20",
                "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-500/20",
              ];

              return (
                <motion.div
                  key={batch.id}
                  variants={fadeUp}
                  onClick={() => setSelectedBatch(batch)}
                  className={cn(
                    "rounded-2xl p-4 sm:p-5 cursor-pointer group shadow-lg transition-transform hover:scale-[1.02]",
                    palette[idx % 4]
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                      <IconSchool className="w-5 h-5 text-white" />
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                        batch.status === "ongoing" && "bg-emerald-200 text-emerald-800",
                        batch.status === "completed" && "bg-violet-200 text-violet-800",
                        batch.status === "draft" && "bg-amber-200 text-amber-800",
                        batch.status === "inactive" && "bg-rose-200 text-rose-800",
                        !["ongoing", "completed", "draft", "inactive"].includes(batch.status) &&
                          "bg-white/20 text-white"
                      )}
                    >
                      {batch.status}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-white mb-1 group-hover:text-white/90 transition-colors">
                    {batch.batch_name}
                  </h3>
                  {batch.course && <p className="text-xs text-white/70 mb-3">{batch.course.title}</p>}
                  {batch.instructor && (
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold text-white">
                        {batch.instructor.name.charAt(0)}
                      </div>
                      <span className="text-xs text-white/80">{batch.instructor.name}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[10px] text-white/60">
                    <IconClock className="w-3.5 h-3.5" />
                    {new Date(batch.start_date).toLocaleDateString()} -{" "}
                    {new Date(batch.end_date).toLocaleDateString()}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </div>
  );
};
