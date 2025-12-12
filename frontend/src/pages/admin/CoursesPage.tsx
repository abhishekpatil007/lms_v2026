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
  IconVideo,
  IconFile,
  IconBrandZoom,
  IconX,
  IconEdit,
  IconTrash,
  IconClock,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { Logo, LogoIcon } from "./AdminDashboard";
import { coursesApi } from "@/api/endpoints/courses";
import type { Course } from "@/types";

export const CoursesPage = () => {
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterLevel, setFilterLevel] = useState<"all" | "beginner" | "intermediate" | "advanced">("all");
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    duration: 0,
    level: "beginner" as "beginner" | "intermediate" | "advanced",
  });

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
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const { courses: data } = await coursesApi.list();
      setCourses(data);
    } catch (error) {
      console.error("Error fetching courses:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setFormData({
      title: "",
      description: "",
      category: "",
      duration: 0,
      level: "beginner",
    });
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (course: Course) => {
    setSelectedCourse(course);
    setFormData({
      title: course.title,
      description: course.description || "",
      category: course.category || "",
      duration: course.duration || 0,
      level: course.level,
    });
    setShowEditModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await coursesApi.create(formData);
      setShowCreateModal(false);
      fetchCourses();
    } catch (error) {
      console.error("Error creating course:", error);
      alert("Failed to create course. Please try again.");
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) return;

    try {
      await coursesApi.update(selectedCourse.id, formData);
      setShowEditModal(false);
      setSelectedCourse(null);
      fetchCourses();
    } catch (error) {
      console.error("Error updating course:", error);
      alert("Failed to update course. Please try again.");
    }
  };

  const handleDeactivate = async (courseId: number) => {
    if (!confirm("Are you sure you want to deactivate this course?")) return;

    try {
      await coursesApi.deactivate(courseId);
      fetchCourses();
    } catch (error) {
      console.error("Error deactivating course:", error);
      alert("Failed to deactivate course. Please try again.");
    }
  };

  const filteredCourses = (courses || []).filter((course) => {
    const matchesSearch =
      course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      course.category?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesLevel = filterLevel === "all" || course.level === filterLevel;
    return matchesSearch && matchesLevel;
  });

  const getLevelColor = (level: string) => {
    switch (level) {
      case "beginner":
        return { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" };
      case "intermediate":
        return { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" };
      case "advanced":
        return { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" };
    }
  };

  const totalCourses = (courses || []).length;
  const beginnerCourses = (courses || []).filter(c => c.level === "beginner").length;
  const intermediateCourses = (courses || []).filter(c => c.level === "intermediate").length;
  const advancedCourses = (courses || []).filter(c => c.level === "advanced").length;

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
        <div className="flex h-full w-full flex-1 flex-col gap-5 p-5 md:p-7">
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
              Create and manage courses for your learning platform.
            </p>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-[24px] bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] p-5 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <IconBook className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <span className="text-sm font-semibold text-white/90">Total Courses</span>
              </div>
              <p className="text-4xl font-bold text-white">{totalCourses}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-[24px] bg-gradient-to-br from-[#B4F481] to-[#9FE66F] p-5 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-[#2D2D2D]/10 flex items-center justify-center">
                  <IconBook className="w-5 h-5 text-[#2D2D2D]" strokeWidth={2} />
                </div>
                <span className="text-sm font-semibold text-[#2D2D2D]/80">Beginner</span>
              </div>
              <p className="text-4xl font-bold text-[#2D2D2D]">{beginnerCourses}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-[24px] bg-gradient-to-br from-[#FCD34D] to-[#F59E0B] p-5 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-[#2D2D2D]/10 flex items-center justify-center">
                  <IconBook className="w-5 h-5 text-[#2D2D2D]" strokeWidth={2} />
                </div>
                <span className="text-sm font-semibold text-[#2D2D2D]/80">Intermediate</span>
              </div>
              <p className="text-4xl font-bold text-[#2D2D2D]">{intermediateCourses}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="rounded-[24px] bg-gradient-to-br from-[#F87171] to-[#DC2626] p-5 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <IconBook className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <span className="text-sm font-semibold text-white/90">Advanced</span>
              </div>
              <p className="text-4xl font-bold text-white">{advancedCourses}</p>
            </motion.div>
          </div>

          {/* Header Card with Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-[28px] bg-white p-6 shadow-lg"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] flex items-center justify-center">
                  <IconBook className="w-7 h-7 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Courses Management</h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Showing {filteredCourses.length} of {totalCourses} courses
                  </p>
                </div>
              </div>
              <button
                onClick={handleOpenCreateModal}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all"
              >
                <IconPlus className="h-4 w-4" strokeWidth={2.5} />
                Create Course
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <IconSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Search courses by title, category, or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border-0 bg-gray-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20"
                />
              </div>
              <div className="flex gap-2.5">
                <select
                  value={filterLevel}
                  onChange={(e) => setFilterLevel(e.target.value as any)}
                  className="rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20 cursor-pointer"
                >
                  <option value="all">All Levels</option>
                  <option value="beginner">Beginner</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Courses Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 text-lg">Loading courses...</div>
            </div>
          ) : filteredCourses.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-64 rounded-[28px] bg-white shadow-lg"
            >
              <IconBook className="w-16 h-16 text-gray-300 mb-4" strokeWidth={1.5} />
              <p className="text-gray-900 font-semibold text-lg mb-1">No courses found</p>
              <p className="text-gray-500 text-sm mb-4">Try adjusting your search or create a new course</p>
              <button
                onClick={handleOpenCreateModal}
                className="flex items-center gap-2 rounded-xl bg-[#2D2D2D] px-4 py-2.5 text-sm font-semibold text-white hover:shadow-lg transition-all"
              >
                <IconPlus className="h-4 w-4" strokeWidth={2.5} />
                Create Course
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {(filteredCourses || []).map((course, idx) => {
                const levelColors = getLevelColor(course.level);
                return (
                  <motion.div
                    key={course.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="rounded-[24px] bg-white p-5 shadow-lg hover:shadow-xl transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] text-base font-bold text-white shadow-md">
                          {course.title.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base text-gray-900 truncate">
                            {course.title}
                          </div>
                          {course.category && (
                            <div className="text-xs text-gray-500">{course.category}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEditModal(course)}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                          title="Edit course"
                        >
                          <IconEdit className="w-4 h-4 text-gray-600" strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => handleDeactivate(course.id)}
                          className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 transition-colors"
                          title="Deactivate course"
                        >
                          <IconTrash className="w-4 h-4 text-red-600" strokeWidth={2} />
                        </button>
                      </div>
                    </div>

                    {course.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {course.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mb-3">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                        levelColors.bg,
                        levelColors.text
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", levelColors.dot)}></span>
                        {course.level.charAt(0).toUpperCase() + course.level.slice(1)}
                      </span>
                      {course.duration && course.duration > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700">
                          <IconClock className="w-3 h-3" strokeWidth={2} />
                          {course.duration}h
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-gray-400">
                      Created {new Date(course.createdAt || '').toLocaleDateString()}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">Create New Course</h3>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-full p-1 hover:bg-gray-100 transition-colors"
                >
                  <IconX className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Course Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20"
                    placeholder="Enter course title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20 resize-none"
                    placeholder="Enter course description"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Category
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20"
                      placeholder="e.g., Programming, Design"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Duration (hours)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20"
                      placeholder="Course duration"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Level *
                  </label>
                  <select
                    required
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value as any })}
                    className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20 cursor-pointer"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    Create Course
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && selectedCourse && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl rounded-[28px] bg-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">Edit Course</h3>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="rounded-full p-1 hover:bg-gray-100 transition-colors"
                >
                  <IconX className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleUpdateSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Course Title *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20"
                    placeholder="Enter course title"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20 resize-none"
                    placeholder="Enter course description"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Category
                    </label>
                    <input
                      type="text"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20"
                      placeholder="e.g., Programming, Design"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Duration (hours)
                    </label>
                    <input
                      type="number"
                      min="0"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 0 })}
                      className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20"
                      placeholder="Course duration"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Level *
                  </label>
                  <select
                    required
                    value={formData.level}
                    onChange={(e) => setFormData({ ...formData, level: e.target.value as any })}
                    className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20 cursor-pointer"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 rounded-xl bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    Update Course
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
