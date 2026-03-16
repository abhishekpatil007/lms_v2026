import { useState, useEffect } from "react";
import {
  IconLayoutDashboard,
  IconUsers,
  IconBook,
  IconSchool,
  IconFile,
  IconTrendingUp,
  IconArrowUpRight,
  IconSparkles,
  IconClipboardCheck,
  IconChevronRight,
} from "@tabler/icons-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { statsApi } from "@/api/endpoints/stats";
import { batchesApi } from "@/api/endpoints/batches";
import { evaluationApi } from "@/api/endpoints/evaluation";
import type { Batch } from "@/types";

export const AdminDashboard = () => {
  const { user } = useAuthStore();
  return <Dashboard user={user} />;
};

interface DashboardStats {
  totalUsers: number;
  totalStudents: number;
  totalInstructors: number;
  totalCourses: number;
  totalBatches: number;
  activeBatches: number;
  completedBatches: number;
  draftBatches: number;
}

const Dashboard = ({ user }: { user: any }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [pendingEvaluations, setPendingEvaluations] = useState<any[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalUsers: 0,
    totalStudents: 0,
    totalInstructors: 0,
    totalCourses: 0,
    totalBatches: 0,
    activeBatches: 0,
    completedBatches: 0,
    draftBatches: 0,
  });
  const [recentBatches, setRecentBatches] = useState<Batch[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      const [statsRes, batchesRes, evalRes] = await Promise.all([
        statsApi.getDashboardStats(),
        batchesApi.list(),
        evaluationApi.getPending().catch(() => ({ attempts: [] })),
      ]);

      setStats(statsRes);
      setPendingEvaluations(evalRes.attempts || []);

      const batchesData = batchesRes.batches || [];
      const sortedBatches = [...batchesData].sort((a, b) => {
        return new Date(b.createdAt || b.start_date).getTime() -
          new Date(a.createdAt || a.start_date).getTime();
      });
      setRecentBatches(sortedBatches.slice(0, 5));

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const getTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return `${Math.floor(diffDays / 30)} months ago`;
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-200 border-t-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-auto">
      <div className="flex h-full w-full flex-1 flex-col gap-4 sm:gap-5 md:gap-6 p-3 sm:p-4 md:p-10">

        {/* Welcome Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-2 mb-1">
            <IconSparkles className="w-4 h-4 text-amber-400" />
            <p className="text-xs font-bold uppercase tracking-widest text-amber-500">Dashboard</p>
          </div>
          <h1 className="text-2xl sm:text-3xl md:text-5xl font-extrabold text-gray-900 mb-1">
            Hi, {user?.name?.split(' ')[0] || 'Admin'}
          </h1>
          <p className="text-sm md:text-base text-gray-500">
            Here's what's happening on your platform today.
          </p>
        </motion.div>

        {/* Stats Grid - vibrant gradient cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          {/* Users */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 p-4 md:p-5 relative overflow-hidden shadow-lg shadow-violet-500/20"
          >
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5" />
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-3 backdrop-blur-sm">
                <IconUsers className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">Total Users</p>
              <p className="text-white text-xl sm:text-2xl md:text-3xl font-extrabold mt-0.5">{stats.totalUsers.toLocaleString()}</p>
            </div>
          </motion.div>

          {/* Students */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-500 p-4 md:p-5 relative overflow-hidden shadow-lg shadow-emerald-500/20"
          >
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5" />
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-3 backdrop-blur-sm">
                <IconSchool className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">Students</p>
              <p className="text-white text-xl sm:text-2xl md:text-3xl font-extrabold mt-0.5">{stats.totalStudents.toLocaleString()}</p>
            </div>
          </motion.div>

          {/* Instructors */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl bg-gradient-to-br from-sky-400 to-blue-500 p-4 md:p-5 relative overflow-hidden shadow-lg shadow-sky-500/20"
          >
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5" />
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-3 backdrop-blur-sm">
                <IconBook className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">Instructors</p>
              <p className="text-white text-xl sm:text-2xl md:text-3xl font-extrabold mt-0.5">{stats.totalInstructors}</p>
            </div>
          </motion.div>

          {/* Courses */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 p-4 md:p-5 relative overflow-hidden shadow-lg shadow-amber-500/20"
          >
            <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full bg-white/10" />
            <div className="absolute -bottom-4 -left-4 w-16 h-16 rounded-full bg-white/5" />
            <div className="relative">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center mb-3 backdrop-blur-sm">
                <IconLayoutDashboard className="w-5 h-5 text-white" strokeWidth={2} />
              </div>
              <p className="text-white/70 text-[10px] font-bold uppercase tracking-wider">Courses</p>
              <p className="text-white text-xl sm:text-2xl md:text-3xl font-extrabold mt-0.5">{stats.totalCourses}</p>
            </div>
          </motion.div>
        </div>

        {/* Pending Evaluations Banner */}
        {pendingEvaluations.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.22 }}
            className="rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 p-4 md:p-5 shadow-lg shadow-rose-500/20 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <IconClipboardCheck className="w-6 h-6 text-white" strokeWidth={2} />
              </div>
              <div>
                <p className="text-white font-bold text-base md:text-lg">
                  {pendingEvaluations.length} Pending Evaluation{pendingEvaluations.length !== 1 ? 's' : ''}
                </p>
                <p className="text-white/70 text-xs md:text-sm">
                  Student submissions awaiting review
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/admin/tests')}
              className="flex items-center gap-1 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-sm font-bold transition-all backdrop-blur-sm"
            >
              View
              <IconChevronRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* Two column layout */}
        <div className="grid grid-cols-1 gap-4 md:gap-5 lg:grid-cols-5">

          {/* Left Column - 3/5 */}
          <div className="lg:col-span-3 space-y-4 md:space-y-5">
            {/* Batch Overview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-2xl bg-white border border-gray-100 p-4 sm:p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-gray-900 text-base font-bold">Batch Overview</h3>
                <span className="text-xs font-bold px-3 py-1 rounded-full bg-gray-100 text-gray-600">{stats.totalBatches} total</span>
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                {/* Donut */}
                <div className="relative w-28 h-28 sm:w-32 sm:h-32 shrink-0">
                  <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                    <circle cx="50" cy="50" r="38" fill="none" stroke="#F3F4F6" strokeWidth="12" />
                    {stats.totalBatches > 0 && (
                      <>
                        <circle
                          cx="50" cy="50" r="38" fill="none"
                          stroke="#10B981" strokeWidth="12"
                          strokeDasharray={`${(stats.activeBatches / stats.totalBatches) * 238.76} 238.76`}
                          strokeLinecap="round"
                        />
                        <circle
                          cx="50" cy="50" r="38" fill="none"
                          stroke="#8B5CF6" strokeWidth="12"
                          strokeDasharray={`${(stats.completedBatches / stats.totalBatches) * 238.76} 238.76`}
                          strokeDashoffset={`${-(stats.activeBatches / stats.totalBatches) * 238.76}`}
                          strokeLinecap="round"
                        />
                        {stats.draftBatches > 0 && (
                          <circle
                            cx="50" cy="50" r="38" fill="none"
                            stroke="#F59E0B" strokeWidth="12"
                            strokeDasharray={`${(stats.draftBatches / stats.totalBatches) * 238.76} 238.76`}
                            strokeDashoffset={`${-((stats.activeBatches + stats.completedBatches) / stats.totalBatches) * 238.76}`}
                            strokeLinecap="round"
                          />
                        )}
                      </>
                    )}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-gray-900 text-2xl font-extrabold">{stats.totalBatches}</span>
                    <span className="text-gray-400 text-[10px] font-medium">Batches</span>
                  </div>
                </div>

                {/* Legend */}
                <div className="flex-1 space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/30" />
                      <span className="text-gray-700 text-xs font-semibold">Active</span>
                    </div>
                    <span className="text-emerald-600 text-sm font-extrabold">{stats.activeBatches}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-violet-50 border border-violet-100">
                    <div className="flex items-center gap-2.5">
                      <div className="w-3 h-3 rounded-full bg-violet-500 shadow-sm shadow-violet-500/30" />
                      <span className="text-gray-700 text-xs font-semibold">Completed</span>
                    </div>
                    <span className="text-violet-600 text-sm font-extrabold">{stats.completedBatches}</span>
                  </div>
                  {stats.draftBatches > 0 && (
                    <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100">
                      <div className="flex items-center gap-2.5">
                        <div className="w-3 h-3 rounded-full bg-amber-500 shadow-sm shadow-amber-500/30" />
                        <span className="text-gray-700 text-xs font-semibold">Draft</span>
                      </div>
                      <span className="text-amber-600 text-sm font-extrabold">{stats.draftBatches}</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Status Cards */}
            <div className="grid grid-cols-2 gap-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center mb-3 shadow-md shadow-emerald-500/20">
                  <IconSchool className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <p className="text-gray-900 text-2xl font-extrabold">{stats.activeBatches}</p>
                <p className="text-emerald-600 text-xs font-bold mt-0.5">Active Batches</p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35 }}
                className="rounded-2xl bg-violet-50 border border-violet-100 p-4"
              >
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-400 to-purple-500 flex items-center justify-center mb-3 shadow-md shadow-violet-500/20">
                  <IconBook className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <p className="text-gray-900 text-2xl font-extrabold">{stats.completedBatches}</p>
                <p className="text-violet-600 text-xs font-bold mt-0.5">Completed</p>
              </motion.div>
            </div>
          </div>

          {/* Right Column - Recent Batches 2/5 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="lg:col-span-2 rounded-2xl bg-white border border-gray-100 p-4 sm:p-5 shadow-sm"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-gray-900 text-base font-bold">Recent Batches</h3>
              <span className="text-xs text-gray-400 font-medium">Latest</span>
            </div>

            <div className="space-y-2.5">
              {recentBatches.length === 0 ? (
                <div className="text-center py-10">
                  <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <IconSchool className="w-7 h-7 text-gray-300" />
                  </div>
                  <p className="text-sm font-semibold text-gray-900">No batches yet</p>
                  <p className="text-xs text-gray-400 mt-1">Create your first batch to get started</p>
                </div>
              ) : (
                recentBatches.map((batch, index) => (
                  <motion.div
                    key={batch.id}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 + index * 0.05 }}
                    onClick={() => navigate(`/admin/batches/${batch.id}`)}
                    className="flex items-center gap-3 rounded-xl bg-gray-50 hover:bg-gray-100 p-3 transition-all group cursor-pointer"
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm",
                      batch.status === 'ongoing' && "bg-gradient-to-br from-emerald-400 to-teal-500 shadow-emerald-500/20",
                      batch.status === 'completed' && "bg-gradient-to-br from-violet-400 to-purple-500 shadow-violet-500/20",
                      batch.status === 'draft' && "bg-gradient-to-br from-amber-400 to-orange-400 shadow-amber-500/20",
                      batch.status === 'inactive' && "bg-gradient-to-br from-rose-400 to-pink-500 shadow-rose-500/20",
                      !['ongoing', 'completed', 'draft', 'inactive'].includes(batch.status || '') && "bg-gradient-to-br from-sky-400 to-blue-500 shadow-sky-500/20"
                    )}>
                      <IconSchool className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-gray-900 font-semibold text-sm truncate">
                        {batch.batch_name}
                      </h4>
                      <p className="text-gray-400 text-xs truncate">
                        {batch.course?.title || 'Course not found'}
                      </p>
                    </div>
                    <div className="text-right shrink-0 flex flex-col items-end gap-1">
                      <span className={cn(
                        "text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider",
                        batch.status === 'ongoing' && "bg-emerald-100 text-emerald-700",
                        batch.status === 'completed' && "bg-violet-100 text-violet-700",
                        batch.status === 'draft' && "bg-amber-100 text-amber-700",
                        batch.status === 'inactive' && "bg-rose-100 text-rose-700"
                      )}>
                        {batch.status}
                      </span>
                      <p className="text-gray-400 text-[10px]">
                        {getTimeAgo(batch.createdAt || batch.start_date)}
                      </p>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};
