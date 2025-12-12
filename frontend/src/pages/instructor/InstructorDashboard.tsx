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
import { cn } from "@/lib/utils";
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
    <div className="px-4 sm:px-0">
      {/* Welcome Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.name.split(' ')[0]}!
        </h1>
        <p className="text-lg text-gray-500">
          Manage your batches and track student progress
        </p>
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-[24px] bg-gradient-to-br from-[#C4B5FD] to-[#A78BFA] p-6 shadow-lg"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <IconSchool className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <span className="text-sm font-semibold text-white/90">Total Batches</span>
          </div>
          <p className="text-4xl font-bold text-white">{batches.length}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-[24px] bg-gradient-to-br from-[#B4F481] to-[#9FE66F] p-6 shadow-lg"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-[#2D2D2D]/10 flex items-center justify-center">
              <IconSchool className="w-6 h-6 text-[#2D2D2D]" strokeWidth={2} />
            </div>
            <span className="text-sm font-semibold text-[#2D2D2D]/80">Ongoing Batches</span>
          </div>
          <p className="text-4xl font-bold text-[#2D2D2D]">{ongoingBatches}</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-[24px] bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] p-6 shadow-lg"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <IconUsers className="w-6 h-6 text-white" strokeWidth={2} />
            </div>
            <span className="text-sm font-semibold text-white/90">Total Students</span>
          </div>
          <p className="text-4xl font-bold text-white">{totalStudents}</p>
        </motion.div>
      </div>

      {/* Batches List */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mb-6"
      >
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Your Batches</h2>
      </motion.div>

      {batches.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center h-64 rounded-[28px] bg-white shadow-lg"
        >
          <IconSchool className="w-16 h-16 text-gray-300 mb-4" strokeWidth={1.5} />
          <p className="text-gray-900 font-semibold text-lg mb-1">No batches assigned</p>
          <p className="text-gray-500 text-sm">You haven't been assigned to any batches yet</p>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
                  "rounded-[24px] p-6 shadow-lg hover:shadow-xl transition-all group cursor-pointer",
                  isOngoing
                    ? "bg-gradient-to-br from-[#B4F481] to-[#9FE66F]"
                    : "bg-white"
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center",
                    isOngoing ? "bg-[#2D2D2D]/10" : "bg-gradient-to-br from-[#C4B5FD] to-[#A78BFA]"
                  )}>
                    <IconSchool className={cn("w-7 h-7", isOngoing ? "text-[#2D2D2D]" : "text-white")} strokeWidth={2} />
                  </div>
                  <span className={cn(
                    "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                    isOngoing ? "bg-[#2D2D2D]/10 text-[#2D2D2D]" : statusColor.bg + " " + statusColor.text
                  )}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", isOngoing ? "bg-[#2D2D2D]" : statusColor.dot)}></span>
                    {batch.status}
                  </span>
                </div>

                <h3 className={cn(
                  "text-xl font-bold mb-2",
                  isOngoing ? "text-[#2D2D2D]" : "text-gray-900"
                )}>
                  {batch.batch_name}
                </h3>

                {batch.course && (
                  <p className={cn(
                    "text-sm mb-4",
                    isOngoing ? "text-[#2D2D2D]/70" : "text-gray-500"
                  )}>
                    {batch.course.title}
                  </p>
                )}

                <div className={cn(
                  "rounded-xl p-3 mb-4",
                  isOngoing ? "bg-[#2D2D2D]/5" : "bg-gray-50"
                )}>
                  <div className="flex items-center justify-between mb-2">
                    <span className={cn(
                      "text-xs font-semibold",
                      isOngoing ? "text-[#2D2D2D]/70" : "text-gray-500"
                    )}>
                      Students Enrolled
                    </span>
                    <div className="flex items-center gap-1.5">
                      <IconUsers className={cn("w-4 h-4", isOngoing ? "text-[#2D2D2D]" : "text-gray-600")} strokeWidth={2} />
                      <span className={cn(
                        "text-sm font-bold",
                        isOngoing ? "text-[#2D2D2D]" : "text-gray-900"
                      )}>
                        {batch.students?.length || 0}
                      </span>
                    </div>
                  </div>
                </div>

                <div className={cn(
                  "flex items-center gap-2 text-xs",
                  isOngoing ? "text-[#2D2D2D]/60" : "text-gray-400"
                )}>
                  <IconCalendar className="w-4 h-4" strokeWidth={2} />
                  {new Date(batch.start_date).toLocaleDateString()} - {new Date(batch.end_date).toLocaleDateString()}
                </div>

                {/* Quick Actions */}
                <div className="mt-4 pt-4 border-t border-current/10">
                  <div className="grid grid-cols-3 gap-2">
                    <button className={cn(
                      "flex flex-col items-center gap-1 py-2 rounded-lg transition-all",
                      isOngoing
                        ? "bg-[#2D2D2D]/5 hover:bg-[#2D2D2D]/10 text-[#2D2D2D]"
                        : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                    )}>
                      <IconVideo className="w-5 h-5" strokeWidth={2} />
                      <span className="text-xs font-medium">Videos</span>
                    </button>
                    <button className={cn(
                      "flex flex-col items-center gap-1 py-2 rounded-lg transition-all",
                      isOngoing
                        ? "bg-[#2D2D2D]/5 hover:bg-[#2D2D2D]/10 text-[#2D2D2D]"
                        : "bg-gray-50 hover:bg-gray-100 text-gray-700"
                    )}>
                      <IconFile className="w-5 h-5" strokeWidth={2} />
                      <span className="text-xs font-medium">Docs</span>
                    </button>
                    <button className={cn(
                      "flex flex-col items-center gap-1 py-2 rounded-lg transition-all",
                      isOngoing
                        ? "bg-[#2D2D2D]/5 hover:bg-[#2D2D2D]/10 text-[#2D2D2D]"
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
          className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-5"
        >
          <div className="rounded-[24px] bg-gradient-to-br from-[#2D96FF] to-[#0B7FE8] p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <IconBrandZoom className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Schedule Live Classes</h3>
                <p className="text-sm text-white/80">Create Zoom sessions for your batches</p>
              </div>
            </div>
            <button className="mt-3 flex items-center gap-2 text-white hover:text-white/90 transition-colors font-medium text-sm">
              Schedule Now
              <IconArrowRight className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>

          <div className="rounded-[24px] bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] p-6 shadow-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
                <IconBook className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Upload Resources</h3>
                <p className="text-sm text-white/80">Add videos and documents for students</p>
              </div>
            </div>
            <button className="mt-3 flex items-center gap-2 text-white hover:text-white/90 transition-colors font-medium text-sm">
              Upload Now
              <IconArrowRight className="w-4 h-4" strokeWidth={2} />
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};
