import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  IconSchool,
  IconUsers,
  IconCalendar,
  IconSearch,
  IconVideo,
  IconFile,
  IconBrandZoom,
  IconChecklist,
  IconArrowRight,
  IconBooks,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { batchesApi } from "@/api/endpoints/batches";
import type { Batch } from "@/types";

interface BatchCounts {
  students: number;
  topics: number;
  videos: number;
  documents: number;
  liveClasses: number;
  tests: number;
}

export const InstructorBatches = () => {
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [batchCounts, setBatchCounts] = useState<Record<string, BatchCounts>>({});
  const [loading, setLoading] = useState(true);
  const [countsLoading, setCountsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const { batches: data } = await batchesApi.getInstructorBatches();
      setBatches(data);
      // Fetch counts for each batch in parallel
      fetchAllBatchCounts(data);
    } catch (error) {
      console.error("Error fetching batches:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllBatchCounts = async (batchList: Batch[]) => {
    setCountsLoading(true);
    const countsMap: Record<string, BatchCounts> = {};
    try {
      const results = await Promise.allSettled(
        batchList.map((batch) => batchesApi.getById(batch.id))
      );
      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          countsMap[batchList[index].id] = result.value.counts;
        }
      });
      setBatchCounts(countsMap);
    } catch (error) {
      console.error("Error fetching batch counts:", error);
    } finally {
      setCountsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ongoing":
        return { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" };
      case "completed":
        return { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-500" };
      case "draft":
        return { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" };
      case "inactive":
        return { bg: "bg-rose-100", text: "text-rose-700", dot: "bg-rose-500" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" };
    }
  };

  const filteredBatches = batches.filter((batch) =>
    batch.batch_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const ongoingBatches = batches.filter((b) => b.status === "ongoing").length;
  const totalStudents = Object.values(batchCounts).reduce(
    (sum, counts) => sum + (counts?.students || 0),
    0
  );

  // ---------- Skeleton Loading ----------
  if (loading) {
    return (
      <div>
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="h-10 w-64 rounded-xl bg-gray-200 animate-pulse mb-2" />
          <div className="h-5 w-96 rounded-lg bg-gray-100 animate-pulse" />
        </div>

        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 md:gap-5 mb-8">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={cn(
                "rounded-2xl p-3 sm:p-4 md:p-6 animate-pulse",
                i === 2 ? "col-span-2 md:col-span-1" : "",
                i === 0
                  ? "bg-violet-200/60"
                  : i === 1
                  ? "bg-emerald-200/60"
                  : "bg-sky-200/60"
              )}
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-3">
                <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/30" />
                <div className="h-4 w-20 rounded bg-white/30" />
              </div>
              <div className="h-8 w-16 rounded-lg bg-white/30" />
            </div>
          ))}
        </div>

        {/* Search bar skeleton */}
        <div className="rounded-2xl bg-white p-4 sm:p-5 md:p-6 shadow-lg mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="h-7 w-40 rounded-lg bg-gray-200 animate-pulse mb-1" />
              <div className="h-4 w-28 rounded bg-gray-100 animate-pulse" />
            </div>
          </div>
          <div className="h-10 w-full rounded-xl bg-gray-100 animate-pulse" />
        </div>

        {/* Batch cards skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="rounded-2xl bg-white p-4 sm:p-5 md:p-6 shadow-lg animate-pulse"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-14 h-14 rounded-full bg-gray-200" />
                <div className="h-6 w-20 rounded-full bg-gray-100" />
              </div>
              <div className="h-6 w-3/4 rounded-lg bg-gray-200 mb-2" />
              <div className="h-4 w-1/2 rounded bg-gray-100 mb-4" />
              <div className="rounded-xl bg-gray-50 p-3 mb-4">
                <div className="grid grid-cols-2 gap-2">
                  {[0, 1, 2, 3].map((j) => (
                    <div key={j} className="h-10 rounded-lg bg-gray-100" />
                  ))}
                </div>
              </div>
              <div className="h-4 w-2/3 rounded bg-gray-100 mb-4" />
              <div className="h-10 w-full rounded-xl bg-gray-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ---------- Main Render ----------
  return (
    <div>
      {/* Page Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-xl sm:text-2xl md:text-5xl font-bold text-gray-900 mb-2">
          My Batches
        </h1>
        <p className="text-sm sm:text-base text-gray-500">
          View and manage all your assigned batches
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 md:gap-5 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-3 sm:p-4 md:p-6 shadow-lg shadow-violet-500/20"
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center">
              <IconSchool className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2} />
            </div>
            <span className="text-xs sm:text-sm font-semibold text-white/80">
              Total Batches
            </span>
          </div>
          <p className="text-xl sm:text-2xl md:text-4xl font-bold text-white">
            {batches.length}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 p-3 sm:p-4 md:p-6 shadow-lg shadow-emerald-500/20"
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-gray-900/10 flex items-center justify-center">
              <IconSchool className="w-5 h-5 sm:w-6 sm:h-6 text-gray-900" strokeWidth={2} />
            </div>
            <span className="text-xs sm:text-sm font-semibold text-gray-700">
              Ongoing
            </span>
          </div>
          <p className="text-xl sm:text-2xl md:text-4xl font-bold text-gray-900">
            {ongoingBatches}
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="col-span-2 md:col-span-1 rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 p-3 sm:p-4 md:p-6 shadow-lg shadow-sky-500/20"
        >
          <div className="flex items-center gap-2 sm:gap-3 mb-2">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-white/20 flex items-center justify-center">
              <IconUsers className="w-5 h-5 sm:w-6 sm:h-6 text-white" strokeWidth={2} />
            </div>
            <span className="text-xs sm:text-sm font-semibold text-white/80">
              Total Students
            </span>
          </div>
          <p className="text-xl sm:text-2xl md:text-4xl font-bold text-white">
            {countsLoading ? "..." : totalStudents}
          </p>
        </motion.div>
      </div>

      {/* Search / Filter Bar */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="rounded-2xl bg-white p-3 sm:p-5 md:p-6 shadow-lg mb-6"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">All Batches</h2>
            <p className="mt-0.5 text-xs text-gray-500">
              Showing {filteredBatches.length} of {batches.length} batches
            </p>
          </div>
        </div>
        <div className="relative">
          <IconSearch
            className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            strokeWidth={2}
          />
          <input
            type="text"
            placeholder="Search batches by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-xl border-0 bg-gray-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/10"
          />
        </div>
      </motion.div>

      {/* Batch Cards */}
      {filteredBatches.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center h-64 rounded-2xl bg-white shadow-lg"
        >
          <IconBooks className="w-16 h-16 text-gray-300 mb-4" strokeWidth={1.5} />
          <p className="text-gray-900 font-semibold text-lg mb-1">
            {batches.length === 0 ? "No batches assigned" : "No batches found"}
          </p>
          <p className="text-gray-500 text-sm">
            {batches.length === 0
              ? "You haven't been assigned to any batches yet."
              : "Try adjusting your search query."}
          </p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
          {filteredBatches.map((batch, idx) => {
            const statusBadge = getStatusBadge(batch.status);
            const isOngoing = batch.status === "ongoing";
            const counts = batchCounts[batch.id];

            return (
              <motion.div
                key={batch.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className={cn(
                  "rounded-2xl overflow-hidden shadow-lg hover:shadow-xl transition-all group",
                  isOngoing
                    ? "bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-500/20"
                    : "bg-white"
                )}
              >
                {/* Card Content */}
                <div className="p-4 sm:p-5 md:p-6">
                  {/* Top: Icon + Status */}
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className={cn(
                        "w-14 h-14 rounded-full flex items-center justify-center",
                        isOngoing
                          ? "bg-gray-900/10"
                          : "bg-gradient-to-br from-violet-500 to-purple-600"
                      )}
                    >
                      <IconSchool
                        className={cn(
                          "w-7 h-7",
                          isOngoing ? "text-gray-900" : "text-white"
                        )}
                        strokeWidth={2}
                      />
                    </div>
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold capitalize",
                        isOngoing
                          ? "bg-gray-900/10 text-gray-900"
                          : statusBadge.bg + " " + statusBadge.text
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          isOngoing ? "bg-gray-900" : statusBadge.dot
                        )}
                      />
                      {batch.status}
                    </span>
                  </div>

                  {/* Batch Name */}
                  <h3
                    className={cn(
                      "text-xl font-bold mb-1 line-clamp-1",
                      "text-gray-900"
                    )}
                  >
                    {batch.batch_name}
                  </h3>

                  {/* Course Title */}
                  {batch.course && (
                    <p
                      className={cn(
                        "text-sm mb-1 line-clamp-1",
                        isOngoing ? "text-gray-600" : "text-gray-500"
                      )}
                    >
                      {batch.course.title}
                    </p>
                  )}

                  {/* Instructor Info */}
                  {batch.instructor && (
                    <p
                      className={cn(
                        "text-xs mb-4",
                        isOngoing ? "text-gray-500" : "text-gray-400"
                      )}
                    >
                      Instructor: {batch.instructor.name}
                    </p>
                  )}

                  {/* Date Range */}
                  <div
                    className={cn(
                      "flex items-center gap-2 text-xs mb-4",
                      isOngoing ? "text-gray-500" : "text-gray-400"
                    )}
                  >
                    <IconCalendar className="w-4 h-4" strokeWidth={2} />
                    {new Date(batch.start_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    -{" "}
                    {new Date(batch.end_date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </div>

                  {/* Content Counts Grid */}
                  <div
                    className={cn(
                      "rounded-xl p-3 mb-4",
                      isOngoing ? "bg-gray-900/5" : "bg-gray-50"
                    )}
                  >
                    {countsLoading || !counts ? (
                      <div className="grid grid-cols-2 gap-2">
                        {[0, 1, 2, 3].map((j) => (
                          <div
                            key={j}
                            className="h-10 rounded-lg bg-gray-100/60 animate-pulse"
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <div
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-2.5 py-2",
                            isOngoing ? "bg-gray-900/5" : "bg-white"
                          )}
                        >
                          <IconVideo
                            className={cn(
                              "w-4 h-4",
                              isOngoing ? "text-gray-900" : "text-violet-500"
                            )}
                            strokeWidth={2}
                          />
                          <div>
                            <p
                              className={cn(
                                "text-sm font-bold leading-none",
                                "text-gray-900"
                              )}
                            >
                              {counts.videos}
                            </p>
                            <p
                              className={cn(
                                "text-[10px] mt-0.5",
                                isOngoing ? "text-gray-500" : "text-gray-400"
                              )}
                            >
                              Videos
                            </p>
                          </div>
                        </div>

                        <div
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-2.5 py-2",
                            isOngoing ? "bg-gray-900/5" : "bg-white"
                          )}
                        >
                          <IconFile
                            className={cn(
                              "w-4 h-4",
                              isOngoing ? "text-gray-900" : "text-blue-500"
                            )}
                            strokeWidth={2}
                          />
                          <div>
                            <p
                              className={cn(
                                "text-sm font-bold leading-none",
                                "text-gray-900"
                              )}
                            >
                              {counts.documents}
                            </p>
                            <p
                              className={cn(
                                "text-[10px] mt-0.5",
                                isOngoing ? "text-gray-500" : "text-gray-400"
                              )}
                            >
                              Documents
                            </p>
                          </div>
                        </div>

                        <div
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-2.5 py-2",
                            isOngoing ? "bg-gray-900/5" : "bg-white"
                          )}
                        >
                          <IconBrandZoom
                            className={cn(
                              "w-4 h-4",
                              isOngoing ? "text-gray-900" : "text-sky-500"
                            )}
                            strokeWidth={2}
                          />
                          <div>
                            <p
                              className={cn(
                                "text-sm font-bold leading-none",
                                "text-gray-900"
                              )}
                            >
                              {counts.liveClasses}
                            </p>
                            <p
                              className={cn(
                                "text-[10px] mt-0.5",
                                isOngoing ? "text-gray-500" : "text-gray-400"
                              )}
                            >
                              Classes
                            </p>
                          </div>
                        </div>

                        <div
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-2.5 py-2",
                            isOngoing ? "bg-gray-900/5" : "bg-white"
                          )}
                        >
                          <IconChecklist
                            className={cn(
                              "w-4 h-4",
                              isOngoing ? "text-gray-900" : "text-amber-500"
                            )}
                            strokeWidth={2}
                          />
                          <div>
                            <p
                              className={cn(
                                "text-sm font-bold leading-none",
                                "text-gray-900"
                              )}
                            >
                              {counts.tests}
                            </p>
                            <p
                              className={cn(
                                "text-[10px] mt-0.5",
                                isOngoing ? "text-gray-500" : "text-gray-400"
                              )}
                            >
                              Tests
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Students count */}
                  <div
                    className={cn(
                      "flex items-center justify-between mb-4 text-xs",
                      isOngoing ? "text-gray-600" : "text-gray-500"
                    )}
                  >
                    <span className="font-semibold">Students Enrolled</span>
                    <div className="flex items-center gap-1.5">
                      <IconUsers
                        className={cn(
                          "w-4 h-4",
                          isOngoing ? "text-gray-900" : "text-gray-600"
                        )}
                        strokeWidth={2}
                      />
                      <span
                        className={cn("text-sm font-bold", "text-gray-900")}
                      >
                        {counts?.students ?? batch.students?.length ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* View Batch Button */}
                  <button
                    onClick={() =>
                      navigate(`/instructor/batches/${batch.id}`)
                    }
                    className={cn(
                      "w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all",
                      isOngoing
                        ? "bg-gray-900/10 hover:bg-gray-900/20 text-gray-900"
                        : "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md shadow-violet-200/50 hover:shadow-lg"
                    )}
                  >
                    View Batch
                    <IconArrowRight className="w-4 h-4" strokeWidth={2} />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};
