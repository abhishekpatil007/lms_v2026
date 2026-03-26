import React, { useState, useEffect } from "react";
import {
  IconUsers,
  IconSchool,
  IconSearch,
  IconPlus,
  IconX,
  IconCopy,
  IconCheck,
  IconUpload,
  IconEdit,
  IconTrash,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { usersApi } from "@/api/endpoints/users";
import type { User } from "@/types";

export const UsersPage = () => {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"student" | "instructor">("student");
  const [students, setStudents] = useState<User[]>([]);
  const [instructors, setInstructors] = useState<User[]>([]);
  const [studentPage, setStudentPage] = useState(1);
  const [instructorPage, setInstructorPage] = useState(1);
  const [hasMoreStudents, setHasMoreStudents] = useState(true);
  const [hasMoreInstructors, setHasMoreInstructors] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [totalStudentsCount, setTotalStudentsCount] = useState(0);
  const [totalInstructorsCount, setTotalInstructorsCount] = useState(0);

  const [showOnboardModal, setShowOnboardModal] = useState(false);
  const [onboardType, setOnboardType] = useState<"student" | "instructor">("student");
  const [onboardFormData, setOnboardFormData] = useState({
    name: "",
    email: "",
    preferred_language: "",
  });
  const [generatedPassword, setGeneratedPassword] = useState("");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  // Edit/Delete State
  const [editUser, setEditUser] = useState<User | null>(null);
  const [editData, setEditData] = useState({ name: "", email: "", preferred_language: "" });
  const [editSaving, setEditSaving] = useState(false);

  // Bulk Upload State
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [bulkUploadFile, setBulkUploadFile] = useState<File | null>(null);
  const [bulkUploadLoading, setBulkUploadLoading] = useState(false);
  const [bulkUploadResults, setBulkUploadResults] = useState<{ successful: number; failed: number; details: any[] } | null>(null);

  const observer = React.useRef<IntersectionObserver | null>(null);
  const lastUserElementRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (loading || loadingMore) return;
      if (observer.current) observer.current.disconnect();
      observer.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          if (activeTab === "student" && hasMoreStudents) {
            fetchUsers(studentPage + 1, false);
          } else if (activeTab === "instructor" && hasMoreInstructors) {
            fetchUsers(instructorPage + 1, false);
          }
        }
      });
      if (node) observer.current.observe(node);
    },
    [loading, loadingMore, activeTab, hasMoreStudents, hasMoreInstructors, studentPage, instructorPage]
  );

  useEffect(() => {
    // Reset and fetch when tab or search changes
    setStudents([]);
    setInstructors([]);
    setStudentPage(1);
    setInstructorPage(1);
    setHasMoreStudents(true);
    setHasMoreInstructors(true);
    fetchUsers(1, true);
  }, [activeTab, searchQuery]);

  const fetchUsers = async (page: number, initial: boolean) => {
    try {
      if (initial) setLoading(true);
      else setLoadingMore(true);

      const limit = 12;

      if (activeTab === "student") {
        const response = await usersApi.getStudents(page, limit, searchQuery);
        if (initial) {
          setStudents(response.students);
        } else {
          setStudents(prev => [...prev, ...response.students]);
        }
        setTotalStudentsCount(response.total);
        setHasMoreStudents(response.students.length === limit);
        setStudentPage(page);
      } else {
        const response = await usersApi.getInstructors(page, limit, searchQuery);
        if (initial) {
          setInstructors(response.instructors);
        } else {
          setInstructors(prev => [...prev, ...response.instructors]);
        }
        setTotalInstructorsCount(response.total);
        setHasMoreInstructors(response.instructors.length === limit);
        setInstructorPage(page);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      if (initial) setLoading(false);
      else setLoadingMore(false);
    }
  };

  const handleOpenOnboardModal = (type: "student" | "instructor") => {
    setOnboardType(type);
    setShowOnboardModal(true);
    setOnboardFormData({ name: "", email: "", preferred_language: "" });
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const onboardApi = onboardType === "student"
        ? usersApi.onboardStudent
        : usersApi.onboardInstructor;

      const response = await onboardApi(onboardFormData);

      // Show password modal with generated password
      setGeneratedPassword(response.credentials.password);
      setShowPasswordModal(true);
      setShowOnboardModal(false);

      // Refresh users list
      fetchUsers(1, true);
    } catch (error) {
      console.error("Error onboarding user:", error);
      alert("Failed to onboard user. Please try again.");
    }
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(generatedPassword);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const handleBulkUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkUploadFile) {
        alert("Please select a file first");
        return;
    }
    setBulkUploadLoading(true);
    try {
        const response = await usersApi.bulkOnboardStudents(bulkUploadFile);
        setBulkUploadResults(response.results);
        fetchUsers(1, true); // Refresh users list
    } catch (error: any) {
        console.error("Bulk upload error:", error);
        // alert(error.response?.data?.message || "Failed to process bulk upload");
    } finally {
        setBulkUploadLoading(false);
    }
  };

  const openEditModal = (userData: User) => {
    setEditData({
      name: userData.name || "",
      email: userData.email || "",
      preferred_language: userData.preferred_language || "",
    });
    setEditUser(userData);
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    try {
      setEditSaving(true);
      await usersApi.updateUser(editUser.id, editData);
      setEditUser(null);
      fetchUsers(1, true);
    } catch (error) {
      console.error("Error updating user:", error);
      alert("Failed to update user.");
    } finally {
      setEditSaving(false);
    }
  };

  const handleDeleteUser = async (userData: User) => {
    if (!confirm(`Delete "${userData.name}"? This will deactivate the account and remove batch enrollments.`)) return;
    try {
      await usersApi.deleteUser(userData.id);
      fetchUsers(1, true);
    } catch (error) {
      console.error("Error deleting user:", error);
      alert("Failed to delete user.");
    }
  };

  const usersToDisplay = activeTab === "student" ? students : instructors;
  const activeUsersCount = [...students, ...instructors].filter(u => u.is_active).length;

  return (
    <>
      <div className="flex flex-1 overflow-auto">
        <div className="flex h-full w-full flex-1 flex-col gap-5 p-3 sm:p-4 md:p-7">
          {/* Welcome Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-2">
              Welcome, {user?.name?.split(' ')[0] || 'Admin'}!
            </h1>
            <p className="text-sm md:text-base text-gray-500">
              Manage users and onboard new students and instructors.
            </p>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 md:gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl bg-emerald-200 p-3 sm:p-4 md:p-5 border border-gray-200"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-900/10 flex items-center justify-center">
                  <IconUsers className="w-4 h-4 sm:w-5 sm:h-5 text-gray-900" strokeWidth={2} />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-gray-900/60">Total Students</span>
              </div>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">{totalStudentsCount}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl bg-violet-200 p-3 sm:p-4 md:p-5 border border-gray-200"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-900/10 flex items-center justify-center">
                  <IconSchool className="w-4 h-4 sm:w-5 sm:h-5 text-gray-900" strokeWidth={2} />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-gray-900/60">Total Instructors</span>
              </div>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">{totalInstructorsCount}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="col-span-2 md:col-span-1 rounded-2xl bg-amber-200 p-3 sm:p-4 md:p-5 border border-gray-200"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-900/10 flex items-center justify-center">
                  <IconCheck className="w-4 h-4 sm:w-5 sm:h-5 text-gray-900" strokeWidth={2} />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-gray-900/60">Active (Loaded)</span>
              </div>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">{activeUsersCount}</p>
            </motion.div>
          </div>

          {/* Header Card with Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-2xl bg-white p-4 sm:p-5 md:p-6 border border-gray-200"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-lime-300 to-lime-400 flex items-center justify-center shrink-0">
                  <IconUsers className="w-5 h-5 sm:w-7 sm:h-7 text-gray-900" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Users Management</h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Showing {usersToDisplay.length} {activeTab === "student" ? "students" : "instructors"}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setShowBulkUploadModal(true)}
                  className="flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 transition-all"
                >
                  <IconUpload className="h-4 w-4" strokeWidth={2.5} />
                  Bulk Upload
                </button>
                <button
                  onClick={() => handleOpenOnboardModal("student")}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-lime-300 to-lime-400 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-gray-900 shadow-lg hover:shadow-xl transition-all"
                >
                  <IconPlus className="h-4 w-4" strokeWidth={2.5} />
                  Add Student
                </button>
                <button
                  onClick={() => handleOpenOnboardModal("instructor")}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-violet-300 to-violet-400 px-3 sm:px-4 py-2 sm:py-2.5 text-xs sm:text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                >
                  <IconPlus className="h-4 w-4" strokeWidth={2.5} />
                  Add Instructor
                </button>
              </div>
            </div>

            {/* Tab Selection */}
            <div className="flex gap-2 sm:gap-4 mb-6 border-b border-gray-100 pb-4">
              <button
                onClick={() => setActiveTab("student")}
                className={cn(
                  "px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all",
                  activeTab === "student"
                    ? "bg-gray-900 text-white shadow-lg"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                )}
              >
                Students ({totalStudentsCount})
              </button>
              <button
                onClick={() => setActiveTab("instructor")}
                className={cn(
                  "px-4 sm:px-6 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all",
                  activeTab === "instructor"
                    ? "bg-gray-900 text-white shadow-lg"
                    : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                )}
              >
                Instructors ({totalInstructorsCount})
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <IconSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
                <input
                  type="text"
                  placeholder={`Search ${activeTab}s by name or email...`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border-0 bg-gray-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                />
              </div>
            </div>
          </motion.div>

          {/* Users Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 text-lg">Loading users...</div>
            </div>
          ) : usersToDisplay.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-64 rounded-2xl bg-white border border-gray-200"
            >
              <IconUsers className="w-16 h-16 text-gray-300 mb-4" strokeWidth={1.5} />
              <p className="text-gray-900 font-semibold text-lg mb-1">No {activeTab}s found</p>
              <p className="text-gray-500 text-sm">Try adjusting your search</p>
            </motion.div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
                {usersToDisplay.map((userData, idx) => (
                  <motion.div
                    key={userData.id}
                    ref={idx === usersToDisplay.length - 1 ? lastUserElementRef : null}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx % 12 * 0.05 }}
                    className={cn(
                      "rounded-2xl p-3 sm:p-4 md:p-5 border border-gray-200 hover:shadow-lg transition-all cursor-pointer group",
                      activeTab === "instructor"
                        ? "bg-gradient-to-br from-violet-300 to-violet-400"
                        : "bg-white"
                    )}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold shadow-md",
                          activeTab === "instructor"
                            ? "bg-white/90 text-violet-400"
                            : "bg-gradient-to-br from-lime-300 to-lime-400 text-gray-900"
                        )}>
                          {userData.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className={cn(
                            "font-semibold text-base",
                            activeTab === "instructor" ? "text-white" : "text-gray-900"
                          )}>
                            {userData.name}
                          </div>
                          <div className={cn(
                            "text-xs",
                            activeTab === "instructor" ? "text-white/80" : "text-gray-500"
                          )}>
                            {userData.email}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 mb-3">
                      <span className={cn(
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                        userData.is_active
                          ? activeTab === "instructor"
                            ? "bg-white/20 text-white"
                            : "bg-green-100 text-green-700"
                          : "bg-red-100 text-red-700"
                      )}>
                        {userData.is_active ? "● Active" : "○ Inactive"}
                      </span>
                      {userData.preferred_language && (
                        <span className={cn(
                          "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                          activeTab === "instructor"
                            ? "bg-white/20 text-white"
                            : "bg-gray-100 text-gray-600"
                        )}>
                          {userData.preferred_language}
                        </span>
                      )}
                    </div>

                    {/* Batch tags */}
                    {(() => {
                      const userBatches = userData.enrolledBatches || userData.batches || [];
                      return userBatches.length > 0 ? (
                      <div className={cn(
                        "rounded-xl px-3 py-2.5 mb-3",
                        activeTab === "instructor"
                          ? "bg-white/10"
                          : "bg-gray-50"
                      )}>
                        <div className={cn(
                          "text-[10px] font-semibold uppercase tracking-wider mb-1.5",
                          activeTab === "instructor" ? "text-white/50" : "text-gray-400"
                        )}>
                          Batches
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {userBatches.map((b) => (
                            <span
                              key={b.id}
                              className={cn(
                                "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                                activeTab === "instructor"
                                  ? "bg-white/20 text-white"
                                  : "bg-white text-gray-700 border border-gray-200"
                              )}
                            >
                              {b.batch_name}
                            </span>
                          ))}
                        </div>
                      </div>
                    ) : null;
                    })()}

                    <div className="flex items-center justify-between mt-2">
                      <div className={cn(
                        "text-xs",
                        activeTab === "instructor" ? "text-white/60" : "text-gray-400"
                      )}>
                        Joined {new Date(userData.created_at || '').toLocaleDateString()}
                      </div>
                      <div className="flex gap-1.5">
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditModal(userData); }}
                          className={cn(
                            "rounded-lg p-1.5 transition-all",
                            activeTab === "instructor"
                              ? "hover:bg-white/20 text-white/70 hover:text-white"
                              : "hover:bg-gray-100 text-gray-400 hover:text-gray-600"
                          )}
                          title="Edit user"
                        >
                          <IconEdit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleDeleteUser(userData); }}
                          className={cn(
                            "rounded-lg p-1.5 transition-all",
                            activeTab === "instructor"
                              ? "hover:bg-red-400/30 text-white/70 hover:text-red-200"
                              : "hover:bg-red-50 text-gray-400 hover:text-red-500"
                          )}
                          title="Delete user"
                        >
                          <IconTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {loadingMore && (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Onboard Modal */}
      <AnimatePresence>
        {showOnboardModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowOnboardModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl"
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">
                  Onboard {onboardType === "student" ? "Student" : "Instructor"}
                </h3>
                <button
                  onClick={() => setShowOnboardModal(false)}
                  className="rounded-full p-1 hover:bg-gray-100 transition-colors"
                >
                  <IconX className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleOnboardSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={onboardFormData.name}
                    onChange={(e) => setOnboardFormData({ ...onboardFormData, name: e.target.value })}
                    className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={onboardFormData.email}
                    onChange={(e) => setOnboardFormData({ ...onboardFormData, email: e.target.value })}
                    className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Preferred Language
                  </label>
                  <input
                    type="text"
                    value={onboardFormData.preferred_language}
                    onChange={(e) => setOnboardFormData({ ...onboardFormData, preferred_language: e.target.value })}
                    className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                    placeholder="e.g., English, Hindi, etc."
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowOnboardModal(false)}
                    className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={cn(
                      "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all",
                      onboardType === "student"
                        ? "bg-gradient-to-br from-lime-300 to-lime-400 text-gray-900"
                        : "bg-gradient-to-br from-violet-300 to-violet-400"
                    )}
                  >
                    Onboard {onboardType === "student" ? "Student" : "Instructor"}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Display Modal */}
      <AnimatePresence>
        {showPasswordModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl"
            >
              <div className="text-center mb-5">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-lime-300 to-lime-400 flex items-center justify-center mx-auto mb-4">
                  <IconCheck className="w-8 h-8 text-gray-900" strokeWidth={2} />
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">
                  User Onboarded Successfully!
                </h3>
                <p className="text-sm text-gray-500">
                  Please save this temporary password. The user will need it to login.
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4 mb-5">
                <p className="text-xs text-gray-500 mb-2 font-semibold">Temporary Password</p>
                <div className="flex items-center justify-between gap-3">
                  <code className="text-lg font-mono font-bold text-gray-900 break-all">
                    {generatedPassword}
                  </code>
                  <button
                    onClick={handleCopyPassword}
                    className="shrink-0 rounded-lg bg-gray-900 p-2 hover:bg-gray-800 transition-colors"
                  >
                    {copiedPassword ? (
                      <IconCheck className="w-5 h-5 text-lime-300" strokeWidth={2} />
                    ) : (
                      <IconCopy className="w-5 h-5 text-white" strokeWidth={2} />
                    )}
                  </button>
                </div>
              </div>

              <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-3 mb-5">
                <p className="text-xs text-yellow-800">
                  <strong>Important:</strong> Make sure to share this password securely with the user.
                  They should change it after their first login.
                </p>
              </div>

              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setGeneratedPassword("");
                  setCopiedPassword(false);
                }}
                className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {editUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
            onClick={() => setEditUser(null)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-violet-100 flex items-center justify-center">
                    <IconEdit className="w-5 h-5 text-violet-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Edit User</h3>
                    <p className="text-xs text-gray-500">{editUser.email}</p>
                  </div>
                </div>
                <button onClick={() => setEditUser(null)} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all">
                  <IconX className="w-5 h-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Full Name</label>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={editData.email}
                    onChange={(e) => setEditData({ ...editData, email: e.target.value })}
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1.5">Preferred Language</label>
                  <input
                    type="text"
                    value={editData.preferred_language}
                    onChange={(e) => setEditData({ ...editData, preferred_language: e.target.value })}
                    placeholder="e.g. English, Hindi"
                    className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-400/20"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
                <button
                  onClick={() => setEditUser(null)}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-gray-600 hover:bg-gray-100 transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  disabled={editSaving || !editData.name.trim() || !editData.email.trim()}
                  className="px-5 py-2 rounded-xl text-sm font-semibold bg-violet-600 text-white hover:bg-violet-700 transition-all disabled:opacity-50"
                >
                  {editSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk Upload Modal */}
      <AnimatePresence>
        {showBulkUploadModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => !bulkUploadLoading && setShowBulkUploadModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-lg rounded-[28px] bg-white p-6 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col"
            >
              <div className="mb-5 flex items-center justify-between shrink-0">
                <h3 className="text-2xl font-bold text-gray-900">
                  Bulk Upload Students
                </h3>
                <button
                  onClick={() => setShowBulkUploadModal(false)}
                  disabled={bulkUploadLoading}
                  className="rounded-full p-1 hover:bg-gray-100 transition-colors disabled:opacity-50"
                >
                  <IconX className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {!bulkUploadResults ? (
                  <form onSubmit={handleBulkUploadSubmit} className="space-y-4 overflow-y-auto pr-2">
                    <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                        <IconUpload className="w-12 h-12 text-gray-400 mb-4" />
                        <p className="text-sm font-semibold text-gray-700 mb-2">
                            Upload Excel File
                        </p>
                        <p className="text-xs text-gray-500 mb-6 text-center max-w-xs">
                            Upload an .xlsx file with columns: name, email, preferred_language
                        </p>
                        <input
                            type="file"
                            accept=".xlsx, .xls"
                            onChange={(e) => setBulkUploadFile(e.target.files ? e.target.files[0] : null)}
                            className="hidden"
                            id="bulk-file-upload"
                        />
                        <label
                            htmlFor="bulk-file-upload"
                            className="cursor-pointer rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 shadow-sm border border-gray-200 hover:bg-gray-50 transition-all mb-4"
                        >
                            {bulkUploadFile ? bulkUploadFile.name : 'Choose File'}
                        </label>
                        <a 
                            href="/students-template.xlsx" 
                            download="students-template.xlsx"
                            className="text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline transition-colors"
                        >
                            Download Excel Template
                        </a>
                    </div>
                    
                    <div className="flex gap-3 pt-2">
                      <button
                        type="button"
                        onClick={() => setShowBulkUploadModal(false)}
                        disabled={bulkUploadLoading}
                        className="flex-1 rounded-xl bg-gray-100 px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={bulkUploadLoading || !bulkUploadFile}
                        className={cn(
                          "flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-900 shadow-lg transition-all flex justify-center items-center gap-2",
                          bulkUploadLoading || !bulkUploadFile ? "bg-gray-300 cursor-not-allowed text-gray-500" : "bg-gradient-to-br from-lime-300 to-lime-400 hover:shadow-xl"
                        )}
                      >
                        {bulkUploadLoading ? (
                            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-900 border-t-transparent" />
                        ) : 'Upload'}
                      </button>
                    </div>
                  </form>
              ) : (
                  <div className="space-y-6 overflow-y-auto pr-2">
                      <div className="flex flex-col items-center justify-center p-6 bg-gray-50 rounded-2xl">
                          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-lime-300 to-lime-400 flex items-center justify-center mb-4">
                              <IconCheck className="w-8 h-8 text-gray-900" strokeWidth={2} />
                          </div>
                          <h4 className="text-xl font-bold text-gray-900 mb-2">Upload Complete</h4>
                          <div className="flex gap-4 text-sm font-medium">
                              <span className="text-green-600">{bulkUploadResults.successful} Successful</span>
                              <span className="text-red-600">{bulkUploadResults.failed} Failed</span>
                          </div>
                      </div>

                      {bulkUploadResults.details && bulkUploadResults.details.length > 0 && (
                          <div className="bg-white border rounded-xl overflow-hidden max-h-48 sm:max-h-60 overflow-auto">
                              <table className="w-full text-sm text-left min-w-[400px]">
                                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 border-b sticky top-0 bg-gray-50">
                                      <tr>
                                          <th className="px-4 py-3">Email</th>
                                          <th className="px-4 py-3">Status</th>
                                          <th className="px-4 py-3">Details</th>
                                      </tr>
                                  </thead>
                                  <tbody>
                                      {bulkUploadResults.details.map((res, i) => (
                                          <tr key={i} className="border-b last:border-0 hover:bg-gray-50">
                                              <td className="px-4 py-3 truncate max-w-[150px]">{res.email}</td>
                                              <td className="px-4 py-3">
                                                  <span className={cn(
                                                      "px-2 py-1 rounded text-xs font-medium inline-block",
                                                      res.status === 'success' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                                                  )}>
                                                      {res.status}
                                                  </span>
                                              </td>
                                              <td className="px-4 py-3 text-xs text-gray-500 max-w-[150px] truncate" title={res.status === 'success' ? 'Created' : res.error}>
                                                  {res.status === 'success' ? 'Created' : res.error}
                                              </td>
                                          </tr>
                                      ))}
                                  </tbody>
                              </table>
                          </div>
                      )}

                      <button
                        onClick={() => {
                            setShowBulkUploadModal(false);
                            setBulkUploadFile(null);
                            setBulkUploadResults(null);
                        }}
                        className="w-full rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-800 transition-colors mt-4"
                      >
                        Done
                      </button>
                  </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
