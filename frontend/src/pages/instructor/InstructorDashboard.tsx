import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  IconSchool,
  IconUsers,
  IconCalendar,
  IconBrandZoom,
  IconBook,
  IconVideo,
  IconFile,
  IconArrowRight,
} from "@tabler/icons-react";
import { cn, formatDateIST } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { batchesApi } from "@/api/endpoints/batches";
import type { Batch } from "@/types";

export const InstructorDashboard = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBatches();
  }, []);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const { batches: data } = await batchesApi.getInstructorBatches();
      setBatches(data);
    } catch (error) {
      console.error("Error fetching batches:", error);
    } finally {
      setLoading(false);
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-gray-500 text-lg">Loading your batches...</div>
      </div>
    );
  }

  const ongoingBatches = batches.filter(b => b.status === "ongoing").length;
  const totalStudents = batches.reduce((sum, b) => sum + (b.students?.length || 0), 0);

  return (
    <div>
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-xl sm:text-2xl md:text-5xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.name.split(' ')[0]}!
        </h1>
        <p className="text-sm sm:text-base text-gray-500">
          Manage your batches and track student progress
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
            <span className="text-xs sm:text-sm font-semibold text-white/80">Total Batches</span>
          </div>
          <p className="text-xl sm:text-2xl md:text-4xl font-bold text-white">{batches.length}</p>
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
            <span className="text-xs sm:text-sm font-semibold text-gray-700">Ongoing Batches</span>
          </div>
          <p className="text-xl sm:text-2xl md:text-4xl font-bold text-gray-900">{ongoingBatches}</p>
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
            <span className="text-xs sm:text-sm font-semibold text-white/80">Total Students</span>
          </div>
          <p className="text-xl sm:text-2xl md:text-4xl font-bold text-white">{totalStudents}</p>
        </motion.div>
      </div>

      {/* Batches List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mb-6"
      >
        <h2 className="text-lg sm:text-2xl font-bold text-gray-900 mb-4">Your Batches</h2>
      </motion.div>

      {batches.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center h-64 rounded-2xl bg-white shadow-lg"
        >
          <IconSchool className="w-16 h-16 text-gray-300 mb-4" strokeWidth={1.5} />
          <p className="text-gray-900 font-semibold text-lg mb-1">No batches assigned</p>
          <p className="text-gray-500 text-sm">You haven't been assigned to any batches yet</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
          {batches.map((batch, idx) => {
            const statusColor = getStatusColor(batch.status);
            const isOngoing = batch.status === "ongoing";

            return (
              <motion.div
                key={batch.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.08 }}
                onClick={() => navigate(`/instructor/batches/${batch.id}`)}
                className={cn(
                  "rounded-2xl p-4 sm:p-5 md:p-6 shadow-lg hover:shadow-xl transition-all group cursor-pointer",
                  isOngoing
                    ? "bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-500/20"
                    : "bg-white"
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center",
                    isOngoing ? "bg-gray-900/10" : "bg-gradient-to-br from-violet-500 to-purple-600"
                  )}>
                    <IconSchool className={cn("w-7 h-7", isOngoing ? "text-gray-900" : "text-white")} strokeWidth={2} />
                  </div>
                  <span className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                    isOngoing ? "bg-gray-900/10 text-gray-900" : statusColor.bg + " " + statusColor.text
                  )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", isOngoing ? "bg-gray-900" : statusColor.dot)}></span>
                    {batch.status}
                  </span>
                </div>

                <h3 className={cn(
                  "text-xl font-bold mb-2",
                  isOngoing ? "text-gray-900" : "text-gray-900"
                )}>
                  {batch.batch_name}
                </h3>

                {batch.course && (
                  <p className={cn(
                    "text-sm mb-4",
                    isOngoing ? "text-gray-600" : "text-gray-500"
                  )}>
                    {batch.course.title}
                  </p>
                )}

                <div className={cn(
                  "rounded-xl p-3 mb-4",
                  isOngoing ? "bg-gray-900/5" : "bg-gray-50"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "text-xs font-semibold",
                      isOngoing ? "text-gray-600" : "text-gray-500"
                    )}>
                      Students Enrolled
                    </span>
                    <div className="flex items-center gap-1.5">
                      <IconUsers className={cn("w-4 h-4", isOngoing ? "text-gray-900" : "text-gray-600")} strokeWidth={2} />
                      <span className={cn(
                        "text-sm font-bold",
                        isOngoing ? "text-gray-900" : "text-gray-900"
                      )}>
                        {batch.students?.length || 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={cn(
                  "flex items-center gap-2 text-xs",
                  isOngoing ? "text-gray-500" : "text-gray-400"
                )}>
                  <IconCalendar className="w-4 h-4" strokeWidth={2} />
                  {formatDateIST(batch.start_date)} - {formatDateIST(batch.end_date)}
                </div>

                {/* Quick Actions */}
                <div className="mt-4 pt-4 border-t border-current/10">
                  <div className="grid grid-cols-3 gap-2">
                    <button className={cn(
                      "flex flex-col items-center gap-1 py-2 rounded-lg transition-all",
                      isOngoing
                        ? "bg-gray-900/5 hover:bg-gray-900/10 text-gray-900"
                        : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                    )}>
                      <IconVideo className="w-5 h-5" strokeWidth={2} />
                      <span className="text-xs font-medium">Videos</span>
                    </button>
                    <button className={cn(
                      "flex flex-col items-center gap-1 py-2 rounded-lg transition-all",
                      isOngoing
                        ? "bg-gray-900/5 hover:bg-gray-900/10 text-gray-900"
                        : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                    )}>
                      <IconFile className="w-5 h-5" strokeWidth={2} />
                      <span className="text-xs font-medium">Docs</span>
                    </button>
                    <button className={cn(
                      "flex flex-col items-center gap-1 py-2 rounded-lg transition-all",
                      isOngoing
                        ? "bg-gray-900/5 hover:bg-gray-900/10 text-gray-900"
                        : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                    )}>
                      <IconBrandZoom className="w-5 h-5" strokeWidth={2} />
                      <span className="text-xs font-medium">Classes</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Quick Links Section */}
      {batches.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-5"
        >
          <div className="rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 p-4 sm:p-5 md:p-6 shadow-lg shadow-sky-500/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <IconBrandZoom className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Schedule Live Classes</h3>
                <p className="text-sm text-white/70">Create Zoom sessions for your batches</p>
              </div>
            </div>
            <button className="mt-3 flex items-center gap-2 text-white hover:text-white/80 transition-colors font-medium text-sm">
              Schedule Now
              <IconArrowRight className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>

          <div className="rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 p-4 sm:p-5 md:p-6 shadow-lg shadow-sky-500/20">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <IconBook className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Upload Resources</h3>
                <p className="text-sm text-white/70">Add videos and documents for students</p>
              </div>
            </div>
            <button className="mt-3 flex items-center gap-2 text-white hover:text-white/80 transition-colors font-medium text-sm">
              Upload Now
              <IconArrowRight className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
