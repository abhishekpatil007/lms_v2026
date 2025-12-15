import React, { useState, useEffect } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import {
  IconLayoutDashboard,
  IconUsers,
  IconBook,
  IconSchool,
  IconSettings,
  IconLogout,
  IconVideo,
  IconFile,
  IconBrandZoom,
  IconChecklist,
  IconFileInvoice,
} from "@tabler/icons-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { usersApi } from "@/api/endpoints/users";
import { batchesApi } from "@/api/endpoints/batches";
import { coursesApi } from "@/api/endpoints/courses";
import type { User, Batch, Course } from "@/types";

export const AdminDashboard = () => {
  const { user, logout } = useAuthStore();

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const links = [
    {
      label: "Dashboard",
      href: "/admin/dashboard",
      icon: (
        <IconLayoutDashboard className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />
      ),
    },
    {
      label: "Users",
      href: "/admin/users",
      icon: (
        <IconUsers className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />
      ),
    },
    {
      label: "Courses",
      href: "/admin/courses",
      icon: (
        <IconBook className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />
      ),
    },
    {
      label: "Batches",
      href: "/admin/batches",
      icon: (
        <IconSchool className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />
      ),
    },
    {
      label: "Tests",
      href: "/admin/tests",
      icon: (
        <IconChecklist className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />
      ),
    },
    {
      label: "Videos",
      href: "/admin/videos",
      icon: (
        <IconVideo className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />
      ),
    },
    {
      label: "Documents",
      href: "/admin/documents",
      icon: (
        <IconFile className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />
      ),
    },
    {
      label: "Live Classes",
      href: "/admin/live-classes",
      icon: (
        <IconBrandZoom className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />
      ),
    },
    {
      label: "Webinars",
      href: "/admin/webinars",
      icon: (
        <IconBrandZoom className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />
      ),
    },
    {
      label: "Invoices",
      href: "/admin/invoices",
      icon: (
        <IconFileInvoice className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />
      ),
    },
    {
      label: "Settings",
      href: "/admin/settings",
      icon: (
        <IconSettings className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />
      ),
    },
  ];

  const [open, setOpen] = useState(false);

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
      <Dashboard user={user} />
    </div>
  );
};

export const Logo = () => {
  return (
    <a
      href="/admin/dashboard"
      className="relative z-20 flex items-center space-x-2.5 py-1 text-sm font-normal"
    >
      <div className="h-12 w-12 shrink-0 rounded-full bg-white flex items-center justify-center shadow-sm">
        <IconLayoutDashboard className="w-6 h-6 text-[#3D3532]" strokeWidth={2} />
      </div>
      <motion.span
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-bold whitespace-pre text-white text-base"
      >
        LMS Portal
      </motion.span>
    </a>
  );
};

export const LogoIcon = () => {
  return (
    <a
      href="/admin/dashboard"
      className="relative z-20 flex items-center justify-center"
    >
      <div className="h-12 w-12 shrink-0 rounded-full bg-white flex items-center justify-center shadow-sm">
        <IconLayoutDashboard className="w-6 h-6 text-[#3D3532]" strokeWidth={2} />
      </div>
    </a>
  );
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
  const [loading, setLoading] = useState(true);
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
  const [students, setStudents] = useState<User[]>([]);
  const [instructors, setInstructors] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [studentsRes, instructorsRes, coursesRes, batchesRes] = await Promise.all([
        usersApi.getStudents(),
        usersApi.getInstructors(),
        coursesApi.list(),
        batchesApi.list(),
      ]);

      const studentsData = studentsRes.students || [];
      const instructorsData = instructorsRes.instructors || [];
      const coursesData = coursesRes.courses || [];
      const batchesData = batchesRes.batches || [];

      setStudents(studentsData);
      setInstructors(instructorsData);
      setCourses(coursesData);
      setBatches(batchesData);

      // Calculate stats
      const totalUsers = studentsData.length + instructorsData.length + 1; // +1 for admin
      const activeBatches = batchesData.filter(b => b.status === 'ongoing').length;
      const completedBatches = batchesData.filter(b => b.status === 'completed').length;
      const draftBatches = batchesData.filter(b => b.status === 'draft').length;

      setStats({
        totalUsers,
        totalStudents: studentsData.length,
        totalInstructors: instructorsData.length,
        totalCourses: coursesData.length,
        totalBatches: batchesData.length,
        activeBatches,
        completedBatches,
        draftBatches,
      });

      // Get 5 most recent batches
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
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
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
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-gray-300 border-t-[#3D3532] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
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
            Welcome, {user?.name?.split(' ')[0] || 'Admin'}!
          </h1>
          <p className="text-lg text-gray-500">
            Manage your platform and track progress every day.
          </p>
        </motion.div>

        {/* Two column layout */}
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-5">
            {/* Dark Card - Student Statistics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="relative overflow-hidden rounded-[28px] bg-[#2D2D2D] p-6 shadow-lg"
            >
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-white text-lg font-semibold">Active Students</h3>
                  <p className="text-gray-400 text-xs mt-1">Total enrolled students</p>
                </div>
                <div className="px-3 py-1.5 rounded-lg bg-[#B4F481]/20 text-[#B4F481] text-xs font-semibold">
                  Live
                </div>
              </div>

              <div className="mt-6">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-5 h-5 rounded-full bg-[#B4F481] flex items-center justify-center">
                    <IconUsers className="w-3 h-3 text-[#2D2D2D]" />
                  </div>
                  <span className="text-gray-400 text-xs">Total Students</span>
                </div>
                <h2 className="text-white text-4xl font-bold mb-5">
                  {stats.totalStudents.toLocaleString()}
                </h2>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-gradient-to-b from-[#C4B5FD] to-[#A78BFA] p-4 flex flex-col justify-between h-24">
                    <span className="text-white text-xs">Instructors</span>
                    <span className="text-white text-2xl font-bold">{stats.totalInstructors}</span>
                  </div>
                  <div className="rounded-xl bg-gradient-to-b from-[#B4F481] to-[#9FE66F] p-4 flex flex-col justify-between h-24">
                    <span className="text-[#2D2D2D] text-xs font-medium">Total Users</span>
                    <span className="text-[#2D2D2D] text-2xl font-bold">{stats.totalUsers}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Light Card - Courses & Batches */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="relative overflow-hidden rounded-[28px] bg-white p-6 shadow-lg"
            >
              <div className="flex items-start justify-between mb-4">
                <h3 className="text-gray-900 text-lg font-semibold">Platform Overview</h3>
              </div>

              <div className="relative rounded-[24px] bg-gradient-to-br from-[#B4F481] to-[#9FE66F] p-6 h-52">
                <div className="absolute top-4 left-4">
                  <div className="w-9 h-9 rounded-full bg-white/90 flex items-center justify-center">
                    <IconBook className="w-4 h-4 text-[#2D2D2D]" />
                  </div>
                </div>

                <div className="absolute top-4 right-4 text-right">
                  <p className="text-[#2D2D2D]/70 text-xs mb-1">Total Courses</p>
                  <p className="text-[#2D2D2D] text-3xl font-bold">{stats.totalCourses}</p>
                </div>

                <div className="absolute bottom-4 left-4">
                  <div className="flex items-center gap-2 mb-2">
                    <IconSchool className="w-4 h-4 text-[#2D2D2D]" />
                    <span className="text-[#2D2D2D]/70 text-xs">Total Batches</span>
                  </div>
                  <p className="text-[#2D2D2D] text-3xl font-bold">{stats.totalBatches}</p>
                </div>

                {/* Decorative arc */}
                <svg className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40" viewBox="0 0 200 200">
                  <circle
                    cx="100"
                    cy="100"
                    r="80"
                    fill="none"
                    stroke="#2D2D2D"
                    strokeWidth="18"
                    strokeDasharray="140 360"
                    strokeLinecap="round"
                    transform="rotate(-90 100 100)"
                  />
                  <circle cx="180" cy="100" r="7" fill="#A78BFA" />
                </svg>
              </div>
            </motion.div>
          </div>

          {/* Right Column */}
          <div className="space-y-5">
            {/* Recent Enrollments */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="relative overflow-hidden rounded-[28px] bg-white p-6 shadow-lg"
            >
              <div className="flex items-start gap-3 mb-5">
                <div className="w-11 h-11 rounded-full bg-[#2D2D2D] flex items-center justify-center">
                  <IconSchool className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="text-gray-900 text-lg font-semibold">Recent Batches</h3>
                  <p className="text-gray-500 text-xs">Latest batch activity</p>
                </div>
              </div>

              <div className="space-y-3">
                {recentBatches.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <IconSchool className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    <p className="text-sm">No batches created yet</p>
                  </div>
                ) : (
                  recentBatches.map((batch, index) => (
                    <div
                      key={batch.id}
                      className="rounded-xl bg-gray-50 p-3.5 hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h4 className="text-gray-900 font-semibold text-sm mb-1">
                            {batch.batch_name}
                          </h4>
                          <p className="text-gray-600 text-xs">
                            {batch.course?.title || 'Course not found'}
                          </p>
                        </div>
                        <span className={cn(
                          "px-2 py-1 rounded-md text-xs font-medium",
                          batch.status === 'ongoing' && "bg-green-100 text-green-700",
                          batch.status === 'completed' && "bg-blue-100 text-blue-700",
                          batch.status === 'draft' && "bg-gray-200 text-gray-700",
                          batch.status === 'inactive' && "bg-red-100 text-red-700"
                        )}>
                          {batch.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <IconUsers className="w-3 h-3" />
                          {batch.students?.length || 0} students
                        </span>
                        <span>{getTimeAgo(batch.createdAt || batch.start_date)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </motion.div>

            {/* Batch Analytics */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="relative overflow-hidden rounded-[28px] bg-white p-6 shadow-lg"
            >
              <div className="flex items-start gap-3 mb-6">
                <div className="w-11 h-11 rounded-full bg-[#B4F481] flex items-center justify-center">
                  <IconLayoutDashboard className="w-5 h-5 text-[#2D2D2D]" />
                </div>
                <div className="flex-1">
                  <h3 className="text-gray-900 text-lg font-semibold">Batch Analytics</h3>
                  <p className="text-gray-500 text-xs">Breakdown by status</p>
                </div>
              </div>

              {/* Batch Status Cards */}
              <div className="relative space-y-4">
                {/* Ongoing Batches */}
                <div className="rounded-[20px] bg-gradient-to-br from-[#B4F481] to-[#9FE66F] p-5 relative overflow-hidden">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-[#2D2D2D] text-xs font-semibold">Ongoing Batches</span>
                    <span className="text-[#2D2D2D] text-sm">
                      <IconSchool className="w-4 h-4" />
                    </span>
                  </div>
                  <p className="text-[#2D2D2D] text-3xl font-bold mb-2">{stats.activeBatches}</p>
                  <div className="flex items-center gap-1.5 text-[#2D2D2D] text-xs">
                    <span className="font-medium">Active learning sessions</span>
                  </div>
                </div>

                {/* Completed Batches */}
                <div className="rounded-[20px] bg-gradient-to-br from-[#C4B5FD] to-[#A78BFA] p-5 relative overflow-hidden">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-white text-xs font-semibold">Completed Batches</span>
                    <span className="text-white text-sm">
                      <IconBook className="w-4 h-4" />
                    </span>
                  </div>
                  <p className="text-white text-3xl font-bold mb-2">{stats.completedBatches}</p>
                  <div className="flex items-center gap-1.5 text-white text-xs">
                    <span className="font-medium">Successfully finished</span>
                  </div>
                </div>

                {/* Draft Batches */}
                {stats.draftBatches > 0 && (
                  <div className="rounded-[20px] bg-gradient-to-br from-gray-300 to-gray-400 p-5 relative overflow-hidden">
                    <div className="flex items-start justify-between mb-3">
                      <span className="text-gray-700 text-xs font-semibold">Draft Batches</span>
                      <span className="text-gray-700 text-sm">
                        <IconFile className="w-4 h-4" />
                      </span>
                    </div>
                    <p className="text-gray-700 text-3xl font-bold mb-2">{stats.draftBatches}</p>
                    <div className="flex items-center gap-1.5 text-gray-700 text-xs">
                      <span className="font-medium">Pending activation</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};
