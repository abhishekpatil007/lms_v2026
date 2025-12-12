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
  IconCalendar,
  IconUserCheck,
  IconX,
  IconVideo,
  IconFile,
  IconBrandZoom,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { Logo, LogoIcon } from "./AdminDashboard";
import { batchesApi } from "@/api/endpoints/batches";
import { coursesApi } from "@/api/endpoints/courses";
import { usersApi } from "@/api/endpoints/users";
import type { Batch, Course, BatchStatus, User } from "@/types";

export const BatchesPage = () => {
  const { user, logout } = useAuthStore();
  console.log("Current User:", user);
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<BatchStatus | "all">("all");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [instructors, setInstructors] = useState<User[]>([]);
  const [students, setStudents] = useState<User[]>([]);
  const [showAssignInstructorModal, setShowAssignInstructorModal] = useState(false);
  const [showEnrollStudentsModal, setShowEnrollStudentsModal] = useState(false);
  const [selectedBatchForAction, setSelectedBatchForAction] = useState<Batch | null>(null);
  const [selectedInstructorId, setSelectedInstructorId] = useState<number | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);

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
    fetchBatches();
    fetchCourses();
    fetchUsers();
  }, [filterStatus]);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const params = filterStatus !== "all" ? { status: filterStatus } : {};
      const { batches: data } = await batchesApi.list(params);
      setBatches(data);
    } catch (error) {
      console.error("Error fetching batches:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCourses = async () => {
    try {
      const { courses: data } = await coursesApi.list();
      console.log("Fetched courses:", data);
      setCourses(data);
    } catch (error) {
      console.error("Error fetching courses:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const [instructorsData, studentsData] = await Promise.all([
        usersApi.getInstructors(),
        usersApi.getStudents(),
      ]);
      setInstructors(instructorsData.instructors);
      setStudents(studentsData.students);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const handleAssignInstructor = async () => {
    if (!selectedBatchForAction || !selectedInstructorId) return;
    try {
      await batchesApi.assignInstructor(selectedBatchForAction.id, selectedInstructorId);
      await fetchBatches();
      setShowAssignInstructorModal(false);
      setSelectedBatchForAction(null);
      setSelectedInstructorId(null);
    } catch (error) {
      console.error("Error assigning instructor:", error);
      alert("Failed to assign instructor");
    }
  };

  const handleEnrollStudents = async () => {
    if (!selectedBatchForAction || selectedStudentIds.length === 0) return;
    try {
      await batchesApi.enrollStudents(selectedBatchForAction.id, selectedStudentIds);
      await fetchBatches();
      setShowEnrollStudentsModal(false);
      setSelectedBatchForAction(null);
      setSelectedStudentIds([]);
    } catch (error) {
      console.error("Error enrolling students:", error);
      alert("Failed to enroll students");
    }
  };

  const filteredBatches = (batches || []).filter(
    (batch) =>
      batch.batch_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.course?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      batch.instructor?.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: BatchStatus) => {
    switch (status) {
      case "draft":
        return { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" };
      case "ongoing":
        return { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" };
      case "completed":
        return { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500" };
      case "inactive":
        return { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" };
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
              Batch Management
            </h1>
            <p className="text-lg text-gray-500">
              Create and manage course batches effectively.
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
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#C4B5FD] to-[#A78BFA] flex items-center justify-center shadow-md">
                  <IconSchool className="w-7 h-7 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Active Batches</h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {(batches || []).length} total batches
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 rounded-xl bg-[#2D2D2D] px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all hover:scale-105"
              >
                <IconPlus className="h-4 w-4" strokeWidth={2.5} />
                Create Batch
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <IconSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Search batches by name, course, or instructor..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border-0 bg-gray-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20"
                />
              </div>
              <div className="flex gap-2.5">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as BatchStatus | "all")}
                  className="rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20 cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="draft">Draft</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="inactive">Inactive</option>
                </select>
                <button className="flex items-center gap-1.5 rounded-xl bg-gray-50 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors">
                  <IconFilter className="h-4 w-4" strokeWidth={2} />
                  Filters
                </button>
              </div>
            </div>
          </motion.div>

          {/* Batches Grid */}
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center h-64 rounded-[28px] bg-white shadow-lg"
            >
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#C4B5FD] to-[#A78BFA] flex items-center justify-center mx-auto mb-3 animate-pulse">
                  <IconSchool className="w-6 h-6 text-white" />
                </div>
                <p className="text-gray-500 text-sm font-medium">Loading batches...</p>
              </div>
            </motion.div>
          ) : filteredBatches.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center justify-center h-64 rounded-[28px] bg-white shadow-lg"
            >
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <IconSchool className="w-10 h-10 text-gray-400" strokeWidth={1.5} />
              </div>
              <p className="text-gray-900 font-semibold text-base mb-1">No batches found</p>
              <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2 xl:grid-cols-3">
              {(filteredBatches || []).map((batch, idx) => {
                const statusColor = getStatusColor(batch.status);
                const isOngoing = batch.status === "ongoing";
                return (
                  <motion.div
                    key={batch.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + idx * 0.08 }}
                    className={cn(
                      "rounded-[24px] p-5 shadow-lg hover:shadow-xl transition-all cursor-pointer group relative overflow-hidden",
                      isOngoing
                        ? "bg-gradient-to-br from-[#B4F481] to-[#9FE66F]"
                        : "bg-white"
                    )}
                  >
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className={cn(
                          "font-bold text-lg mb-1.5",
                          isOngoing ? "text-[#2D2D2D]" : "text-gray-900"
                        )}>
                          {batch.batch_name}
                        </h3>
                        <div className={cn(
                          "flex items-center gap-1.5 text-xs font-medium",
                          isOngoing ? "text-[#2D2D2D]/70" : "text-gray-500"
                        )}>
                          <IconBook className="w-3.5 h-3.5" strokeWidth={2} />
                          {batch.course?.title || "No course"}
                        </div>
                      </div>
                      <button className={cn(
                        "opacity-0 group-hover:opacity-100 transition-opacity text-base font-bold",
                        isOngoing ? "text-[#2D2D2D]" : "text-gray-600"
                      )}>
                        ⋮
                      </button>
                    </div>

                    {/* Instructor */}
                    {batch.instructor && (
                      <div className={cn(
                        "flex items-center gap-2.5 mb-4 rounded-xl p-2.5",
                        isOngoing ? "bg-white/20" : "bg-gray-50"
                      )}>
                        <div className={cn(
                          "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shadow-sm",
                          isOngoing
                            ? "bg-white/90 text-[#9FE66F]"
                            : "bg-gradient-to-br from-[#C4B5FD] to-[#A78BFA] text-white"
                        )}>
                          {batch.instructor.name?.charAt(0) || 'I'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-xs font-semibold truncate",
                            isOngoing ? "text-[#2D2D2D]" : "text-gray-900"
                          )}>
                            {batch.instructor.name}
                          </p>
                          <p className={cn(
                            "text-xs",
                            isOngoing ? "text-[#2D2D2D]/60" : "text-gray-500"
                          )}>
                            Instructor
                          </p>
                        </div>
                        <IconUserCheck className={cn(
                          "w-4 h-4",
                          isOngoing ? "text-[#2D2D2D]/40" : "text-gray-400"
                        )} strokeWidth={2} />
                      </div>
                    )}

                    {/* Assignment Buttons */}
                    <div className="flex gap-2 mb-4">
                      <button
                        onClick={() => {
                          setSelectedBatchForAction(batch);
                          setSelectedInstructorId(batch.instructor_id || null);
                          setShowAssignInstructorModal(true);
                        }}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all",
                          isOngoing
                            ? "bg-white/30 text-[#2D2D2D] hover:bg-white/40"
                            : "bg-gradient-to-br from-[#B4F481] to-[#9FE66F] text-[#2D2D2D] hover:shadow-md"
                        )}
                      >
                        <IconUserCheck className="w-3.5 h-3.5" strokeWidth={2} />
                        {batch.instructor ? "Change" : "Assign"} Instructor
                      </button>
                      <button
                        onClick={() => {
                          setSelectedBatchForAction(batch);
                          setSelectedStudentIds(batch.students?.map(s => s.id) || []);
                          setShowEnrollStudentsModal(true);
                        }}
                        className={cn(
                          "flex-1 flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition-all",
                          isOngoing
                            ? "bg-white/30 text-[#2D2D2D] hover:bg-white/40"
                            : "bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] text-white hover:shadow-md"
                        )}
                      >
                        <IconUsers className="w-3.5 h-3.5" strokeWidth={2} />
                        Enroll Students
                      </button>
                    </div>

                    {/* Status and Students */}
                    <div className="flex items-center gap-2 mb-4">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm",
                          isOngoing
                            ? "bg-[#2D2D2D] text-white"
                            : cn(statusColor.bg, statusColor.text)
                        )}
                      >
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          isOngoing ? "bg-[#B4F481]" : statusColor.dot
                        )} />
                        {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
                      </span>
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm",
                        isOngoing
                          ? "bg-white/30 text-[#2D2D2D]"
                          : "bg-gray-100 text-gray-700"
                      )}>
                        <IconUsers className="w-3.5 h-3.5" strokeWidth={2} />
                        {batch.students?.length || 0}
                      </span>
                    </div>

                    {/* Dates */}
                    <div className={cn(
                      "rounded-xl px-3.5 py-3 space-y-2 mb-4",
                      isOngoing ? "bg-[#2D2D2D]/10" : "bg-gray-50"
                    )}>
                      <div className={cn(
                        "flex items-center gap-2 text-xs font-medium",
                        isOngoing ? "text-[#2D2D2D]" : "text-gray-700"
                      )}>
                        <IconCalendar className="w-4 h-4" strokeWidth={2} />
                        <span className="font-semibold">Start:</span>
                        <span className="ml-auto">{formatDate(batch.start_date)}</span>
                      </div>
                      <div className={cn(
                        "flex items-center gap-2 text-xs font-medium",
                        isOngoing ? "text-[#2D2D2D]" : "text-gray-700"
                      )}>
                        <IconCalendar className="w-4 h-4" strokeWidth={2} />
                        <span className="font-semibold">End:</span>
                        <span className="ml-auto">{formatDate(batch.end_date)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button className={cn(
                        "flex-1 rounded-xl py-2.5 text-xs font-bold transition-all",
                        isOngoing
                          ? "bg-white/30 text-[#2D2D2D] hover:bg-white/40"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      )}>
                        View Details
                      </button>
                      <button className={cn(
                        "rounded-xl px-4 py-2.5 text-xs font-bold transition-all hover:scale-105",
                        isOngoing
                          ? "bg-[#2D2D2D] text-white hover:shadow-lg"
                          : "bg-[#2D2D2D] text-white hover:shadow-lg"
                      )}>
                        Edit
                      </button>
                    </div>

                    {/* Decorative element for ongoing batches */}
                    {isOngoing && (
                      <div className="absolute top-4 right-4 w-16 h-16 rounded-full bg-white/10 blur-2xl"></div>
                    )}
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Stats Summary */}
          {!loading && filteredBatches.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-1 gap-5 md:grid-cols-4"
            >
              <div className="rounded-[24px] bg-gradient-to-br from-[#B4F481] to-[#9FE66F] p-5 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-[#2D2D2D] flex items-center justify-center">
                    <IconSchool className="w-5 h-5 text-white" strokeWidth={2} />
                  </div>
                  <p className="text-xs font-semibold text-[#2D2D2D]/70">Total Batches</p>
                </div>
                <p className="text-3xl font-bold text-[#2D2D2D]">{batches.length}</p>
              </div>

              <div className="rounded-[24px] bg-white p-5 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                    <IconUserCheck className="w-5 h-5 text-green-600" strokeWidth={2} />
                  </div>
                  <p className="text-xs font-semibold text-gray-500">Ongoing</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {(batches || []).filter(b => b.status === "ongoing").length}
                </p>
              </div>

              <div className="rounded-[24px] bg-white p-5 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <IconBook className="w-5 h-5 text-blue-600" strokeWidth={2} />
                  </div>
                  <p className="text-xs font-semibold text-gray-500">Completed</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {(batches || []).filter(b => b.status === "completed").length}
                </p>
              </div>

              <div className="rounded-[24px] bg-gradient-to-br from-[#C4B5FD] to-[#A78BFA] p-5 shadow-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center">
                    <IconUsers className="w-5 h-5 text-[#A78BFA]" strokeWidth={2} />
                  </div>
                  <p className="text-xs font-semibold text-white/90">Total Students</p>
                </div>
                <p className="text-3xl font-bold text-white">
                  {(batches || []).reduce((acc, b) => acc + (b.students?.length || 0), 0)}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Create Batch Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <CreateBatchModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              fetchBatches();
            }}
            courses={courses}
          />
        )}
      </AnimatePresence>

      {/* Assign Instructor Modal */}
      <AnimatePresence>
        {showAssignInstructorModal && selectedBatchForAction && (
          <AssignInstructorModal
            batch={selectedBatchForAction}
            instructors={instructors}
            selectedInstructorId={selectedInstructorId}
            onSelectInstructor={setSelectedInstructorId}
            onClose={() => {
              setShowAssignInstructorModal(false);
              setSelectedBatchForAction(null);
              setSelectedInstructorId(null);
            }}
            onSubmit={handleAssignInstructor}
          />
        )}
      </AnimatePresence>

      {/* Enroll Students Modal */}
      <AnimatePresence>
        {showEnrollStudentsModal && selectedBatchForAction && (
          <EnrollStudentsModal
            batch={selectedBatchForAction}
            students={students}
            selectedStudentIds={selectedStudentIds}
            onToggleStudent={(studentId) => {
              setSelectedStudentIds(prev =>
                prev.includes(studentId)
                  ? prev.filter(id => id !== studentId)
                  : [...prev, studentId]
              );
            }}
            onClose={() => {
              setShowEnrollStudentsModal(false);
              setSelectedBatchForAction(null);
              setSelectedStudentIds([]);
            }}
            onSubmit={handleEnrollStudents}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Create Batch Modal Component
const CreateBatchModal = ({
  onClose,
  onSuccess,
  courses,
}: {
  onClose: () => void;
  onSuccess: () => void;
  courses: Course[];
}) => {
  const [formData, setFormData] = useState({
    batch_name: "",
    course_id: "",
    start_date: "",
    end_date: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.batch_name || !formData.course_id || !formData.start_date || !formData.end_date) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      const payload = {
        batch_name: formData.batch_name,
        course_id: parseInt(formData.course_id, 10),
        start_date: formData.start_date,
        end_date: formData.end_date,
        description: formData.description || undefined,
      };
      console.log("Creating batch with payload:", payload);

      await batchesApi.create(payload);
      onSuccess();
    } catch (err: any) {
      console.error("Batch creation error:", err);
      setError(err.response?.data?.message || err.message || "Failed to create batch");
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
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#C4B5FD] to-[#A78BFA] flex items-center justify-center shadow-lg">
              <IconSchool className="w-7 h-7 text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Create New Batch</h2>
              <p className="text-sm text-gray-500 mt-1">Fill in the details to create a new batch</p>
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
          {/* Batch Name */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2.5">
              Batch Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.batch_name}
              onChange={(e) => setFormData({ ...formData, batch_name: e.target.value })}
              className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C4B5FD] focus:border-transparent transition-all"
              placeholder="e.g., React Fundamentals - Batch 01"
            />
          </div>

          {/* Course Selection */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2.5">
              Course <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <IconBook className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" strokeWidth={2} />
              <select
                value={formData.course_id}
                onChange={(e) => setFormData({ ...formData, course_id: e.target.value })}
                className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 pl-11 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C4B5FD] focus:border-transparent cursor-pointer transition-all appearance-none"
              >
                <option value="">Select a course</option>
                {(courses || []).map((course) => (
                  <option key={course.id} value={course.id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Date Range */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2.5">
                Start Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <IconCalendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" strokeWidth={2} />
                <input
                  type="date"
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 pl-11 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C4B5FD] focus:border-transparent transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2.5">
                End Date <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <IconCalendar className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" strokeWidth={2} />
                <input
                  type="date"
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 pl-11 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C4B5FD] focus:border-transparent transition-all"
                />
              </div>
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
              rows={4}
              className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#C4B5FD] focus:border-transparent resize-none transition-all"
              placeholder="Add any additional details about this batch..."
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
              className="rounded-xl px-6 py-3 text-sm font-bold bg-gradient-to-br from-[#C4B5FD] to-[#A78BFA] text-white hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Creating...
                </>
              ) : (
                <>
                  <IconPlus className="w-4 h-4" strokeWidth={2.5} />
                  Create Batch
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// Assign Instructor Modal Component
const AssignInstructorModal = ({
  batch,
  instructors,
  selectedInstructorId,
  onSelectInstructor,
  onClose,
  onSubmit,
}: {
  batch: Batch;
  instructors: User[];
  selectedInstructorId: number | null;
  onSelectInstructor: (id: number) => void;
  onClose: () => void;
  onSubmit: () => void;
}) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstructorId) {
      alert("Please select an instructor");
      return;
    }
    setLoading(true);
    await onSubmit();
    setLoading(false);
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
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#B4F481] to-[#9FE66F] flex items-center justify-center shadow-lg">
              <IconUserCheck className="w-7 h-7 text-[#2D2D2D]" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">
                {batch.instructor ? "Change" : "Assign"} Instructor
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                Select an instructor for {batch.batch_name}
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Current Instructor Info */}
          {batch.instructor && (
            <div className="mb-6 rounded-xl bg-gradient-to-br from-[#B4F481]/20 to-[#9FE66F]/20 border-2 border-[#B4F481]/30 p-4">
              <p className="text-xs font-bold text-gray-700 mb-2">Current Instructor:</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#B4F481] to-[#9FE66F] flex items-center justify-center text-sm font-bold text-[#2D2D2D]">
                  {batch.instructor.name?.charAt(0) || 'I'}
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{batch.instructor.name}</p>
                  <p className="text-xs text-gray-500">{batch.instructor.email}</p>
                </div>
              </div>
            </div>
          )}

          {/* Instructors List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {(instructors || []).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <IconUserCheck className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No instructors available</p>
              </div>
            ) : (
              (instructors || []).map((instructor) => (
                <label
                  key={instructor.id}
                  className={cn(
                    "flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all hover:shadow-md",
                    selectedInstructorId === instructor.id
                      ? "bg-gradient-to-br from-[#B4F481] to-[#9FE66F] border-2 border-[#9FE66F]"
                      : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
                  )}
                >
                  <input
                    type="radio"
                    name="instructor"
                    value={instructor.id}
                    checked={selectedInstructorId === instructor.id}
                    onChange={() => onSelectInstructor(instructor.id)}
                    className="w-5 h-5 text-[#9FE66F] focus:ring-[#9FE66F] focus:ring-2"
                  />
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-sm",
                    selectedInstructorId === instructor.id
                      ? "bg-[#2D2D2D] text-white"
                      : "bg-gradient-to-br from-[#B4F481] to-[#9FE66F] text-[#2D2D2D]"
                  )}>
                    {instructor.name?.charAt(0) || 'I'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-bold truncate",
                      selectedInstructorId === instructor.id ? "text-[#2D2D2D]" : "text-gray-900"
                    )}>
                      {instructor.name}
                    </p>
                    <p className={cn(
                      "text-xs truncate",
                      selectedInstructorId === instructor.id ? "text-[#2D2D2D]/70" : "text-gray-500"
                    )}>
                      {instructor.email}
                    </p>
                  </div>
                  {selectedInstructorId === instructor.id && (
                    <IconUserCheck className="w-5 h-5 text-[#2D2D2D]" strokeWidth={2.5} />
                  )}
                </label>
              ))
            )}
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
              disabled={loading || !selectedInstructorId}
              className="rounded-xl px-6 py-3 text-sm font-bold bg-gradient-to-br from-[#B4F481] to-[#9FE66F] text-[#2D2D2D] hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#2D2D2D]/30 border-t-[#2D2D2D] rounded-full animate-spin"></div>
                  Assigning...
                </>
              ) : (
                <>
                  <IconUserCheck className="w-4 h-4" strokeWidth={2.5} />
                  Assign Instructor
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};

// Enroll Students Modal Component
const EnrollStudentsModal = ({
  batch,
  students,
  selectedStudentIds,
  onToggleStudent,
  onClose,
  onSubmit,
}: {
  batch: Batch;
  students: User[];
  selectedStudentIds: number[];
  onToggleStudent: (studentId: number) => void;
  onClose: () => void;
  onSubmit: () => void;
}) => {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudentIds.length === 0) {
      alert("Please select at least one student");
      return;
    }
    setLoading(true);
    await onSubmit();
    setLoading(false);
  };

  const enrolledStudentIds = batch.students?.map(s => s.id) || [];

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
              <IconUsers className="w-7 h-7 text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Enroll Students</h2>
              <p className="text-sm text-gray-500 mt-1">
                Select students for {batch.batch_name}
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

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Selection Summary */}
          <div className="mb-6 rounded-xl bg-gradient-to-br from-[#60A5FA]/20 to-[#3B82F6]/20 border-2 border-[#60A5FA]/30 p-4">
            <p className="text-sm font-bold text-gray-900">
              {selectedStudentIds.length} student{selectedStudentIds.length !== 1 ? 's' : ''} selected
            </p>
            <p className="text-xs text-gray-600 mt-1">
              Currently enrolled: {enrolledStudentIds.length} student{enrolledStudentIds.length !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Students List */}
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
            {(students || []).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <IconUsers className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="font-medium">No students available</p>
              </div>
            ) : (
              (students || []).map((student) => {
                const isSelected = selectedStudentIds.includes(student.id);
                const isCurrentlyEnrolled = enrolledStudentIds.includes(student.id);

                return (
                  <label
                    key={student.id}
                    className={cn(
                      "flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all hover:shadow-md",
                      isSelected
                        ? "bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] border-2 border-[#3B82F6]"
                        : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleStudent(student.id)}
                      className="w-5 h-5 text-[#3B82F6] focus:ring-[#3B82F6] focus:ring-2 rounded"
                    />
                    <div className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-sm",
                      isSelected
                        ? "bg-white text-[#3B82F6]"
                        : "bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] text-white"
                    )}>
                      {student.name?.charAt(0) || 'S'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={cn(
                          "text-sm font-bold truncate",
                          isSelected ? "text-white" : "text-gray-900"
                        )}>
                          {student.name}
                        </p>
                        {isCurrentlyEnrolled && (
                          <span className={cn(
                            "text-xs font-bold px-2 py-0.5 rounded-full",
                            isSelected
                              ? "bg-white/30 text-white"
                              : "bg-blue-100 text-blue-700"
                          )}>
                            Enrolled
                          </span>
                        )}
                      </div>
                      <p className={cn(
                        "text-xs truncate",
                        isSelected ? "text-white/80" : "text-gray-500"
                      )}>
                        {student.email}
                      </p>
                    </div>
                    {isSelected && (
                      <div className="w-6 h-6 rounded bg-white flex items-center justify-center">
                        <div className="w-3 h-3 bg-[#3B82F6] rounded"></div>
                      </div>
                    )}
                  </label>
                );
              })
            )}
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
              disabled={loading || selectedStudentIds.length === 0}
              className="rounded-xl px-6 py-3 text-sm font-bold bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] text-white hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Enrolling...
                </>
              ) : (
                <>
                  <IconUsers className="w-4 h-4" strokeWidth={2.5} />
                  Enroll Students
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
