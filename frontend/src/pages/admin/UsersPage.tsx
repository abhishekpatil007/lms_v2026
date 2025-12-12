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
  IconCopy,
  IconCheck,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { Logo, LogoIcon } from "./AdminDashboard";
import { usersApi } from "@/api/endpoints/users";
import type { User } from "@/types";

export const UsersPage = () => {
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<"all" | "student" | "instructor">("all");
  const [students, setStudents] = useState<User[]>([]);
  const [instructors, setInstructors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
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
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const [studentsData, instructorsData] = await Promise.all([
        usersApi.getStudents(),
        usersApi.getInstructors(),
      ]);
      setStudents(studentsData.students);
      setInstructors(instructorsData.instructors);
    } catch (error) {
      console.error("Error fetching users:", error);
    } finally {
      setLoading(false);
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
      fetchUsers();
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

  // Combine and filter users
  const allUsers = [
    ...(students || []).map(s => ({ ...s, role: 'student' as const })),
    ...(instructors || []).map(i => ({ ...i, role: 'instructor' as const })),
  ];

  const filteredUsers = (allUsers || []).filter((userData) => {
    const matchesSearch =
      userData.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      userData.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = filterRole === "all" || userData.role === filterRole;
    return matchesSearch && matchesRole;
  });

  const totalStudents = (students || []).length;
  const totalInstructors = (instructors || []).length;
  const activeUsers = (allUsers || []).filter(u => u.is_active).length;

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
              Manage users and onboard new students and instructors.
            </p>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-[24px] bg-gradient-to-br from-[#B4F481] to-[#9FE66F] p-5 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-[#2D2D2D]/10 flex items-center justify-center">
                  <IconUsers className="w-5 h-5 text-[#2D2D2D]" strokeWidth={2} />
                </div>
                <span className="text-sm font-semibold text-[#2D2D2D]/80">Total Students</span>
              </div>
              <p className="text-4xl font-bold text-[#2D2D2D]">{totalStudents}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-[24px] bg-gradient-to-br from-[#C4B5FD] to-[#A78BFA] p-5 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <IconSchool className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <span className="text-sm font-semibold text-white/90">Total Instructors</span>
              </div>
              <p className="text-4xl font-bold text-white">{totalInstructors}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="rounded-[24px] bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] p-5 shadow-lg"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                  <IconCheck className="w-5 h-5 text-white" strokeWidth={2} />
                </div>
                <span className="text-sm font-semibold text-white/90">Active Users</span>
              </div>
              <p className="text-4xl font-bold text-white">{activeUsers}</p>
            </motion.div>
          </div>

          {/* Header Card with Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-[28px] bg-white p-6 shadow-lg"
          >
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#B4F481] to-[#9FE66F] flex items-center justify-center">
                  <IconUsers className="w-7 h-7 text-[#2D2D2D]" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Users Management</h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Showing {filteredUsers.length} of {allUsers.length} users
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleOpenOnboardModal("student")}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#B4F481] to-[#9FE66F] px-4 py-2.5 text-sm font-semibold text-[#2D2D2D] shadow-lg hover:shadow-xl transition-all"
                >
                  <IconPlus className="h-4 w-4" strokeWidth={2.5} />
                  Add Student
                </button>
                <button
                  onClick={() => handleOpenOnboardModal("instructor")}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#C4B5FD] to-[#A78BFA] px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                >
                  <IconPlus className="h-4 w-4" strokeWidth={2.5} />
                  Add Instructor
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <IconSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Search users by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border-0 bg-gray-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20"
                />
              </div>
              <div className="flex gap-2.5">
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value as any)}
                  className="rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20 cursor-pointer"
                >
                  <option value="all">All Roles</option>
                  <option value="student">Students</option>
                  <option value="instructor">Instructors</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Users Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 text-lg">Loading users...</div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-64 rounded-[28px] bg-white shadow-lg"
            >
              <IconUsers className="w-16 h-16 text-gray-300 mb-4" strokeWidth={1.5} />
              <p className="text-gray-900 font-semibold text-lg mb-1">No users found</p>
              <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {(filteredUsers || []).map((userData, idx) => (
                <motion.div
                  key={userData.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className={cn(
                    "rounded-[24px] p-5 shadow-lg hover:shadow-xl transition-all cursor-pointer group",
                    userData.role === "instructor"
                      ? "bg-gradient-to-br from-[#C4B5FD] to-[#A78BFA]"
                      : "bg-white"
                  )}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-base font-bold shadow-md",
                        userData.role === "instructor"
                          ? "bg-white/90 text-[#A78BFA]"
                          : "bg-gradient-to-br from-[#B4F481] to-[#9FE66F] text-[#2D2D2D]"
                      )}>
                        {userData.name?.charAt(0)?.toUpperCase() || 'U'}
                      </div>
                      <div>
                        <div className={cn(
                          "font-semibold text-base",
                          userData.role === "instructor" ? "text-white" : "text-gray-900"
                        )}>
                          {userData.name}
                        </div>
                        <div className={cn(
                          "text-xs",
                          userData.role === "instructor" ? "text-white/80" : "text-gray-500"
                        )}>
                          {userData.email}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 mb-2.5">
                    <span className={cn(
                      "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                      userData.role === "instructor"
                        ? "bg-white/20 text-white"
                        : "bg-gray-100 text-gray-700"
                    )}>
                      {userData.role.charAt(0).toUpperCase() + userData.role.slice(1)}
                    </span>
                    <span className={cn(
                      "inline-flex rounded-full px-2.5 py-1 text-xs font-semibold",
                      userData.is_active
                        ? userData.role === "instructor"
                          ? "bg-white/20 text-white"
                          : "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    )}>
                      {userData.is_active ? "● Active" : "○ Inactive"}
                    </span>
                  </div>

                  {userData.preferred_language && (
                    <div className={cn(
                      "rounded-xl px-3 py-2 text-xs mb-3",
                      userData.role === "instructor"
                        ? "bg-white/10 text-white"
                        : "bg-gray-50 text-gray-700"
                    )}>
                      <span className="font-medium">Language: {userData.preferred_language}</span>
                    </div>
                  )}

                  <div className={cn(
                    "text-xs",
                    userData.role === "instructor" ? "text-white/60" : "text-gray-400"
                  )}>
                    Joined {new Date(userData.created_at || '').toLocaleDateString()}
                  </div>
                </motion.div>
              ))}
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
                    className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20"
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
                    className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20"
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
                    className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20"
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
                        ? "bg-gradient-to-br from-[#B4F481] to-[#9FE66F] text-[#2D2D2D]"
                        : "bg-gradient-to-br from-[#C4B5FD] to-[#A78BFA]"
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
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-[#B4F481] to-[#9FE66F] flex items-center justify-center mx-auto mb-4">
                  <IconCheck className="w-8 h-8 text-[#2D2D2D]" strokeWidth={2} />
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
                    className="shrink-0 rounded-lg bg-[#2D2D2D] p-2 hover:bg-[#2D2D2D]/90 transition-colors"
                  >
                    {copiedPassword ? (
                      <IconCheck className="w-5 h-5 text-[#B4F481]" strokeWidth={2} />
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
                className="w-full rounded-xl bg-[#2D2D2D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2D2D2D]/90 transition-colors"
              >
                Done
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
