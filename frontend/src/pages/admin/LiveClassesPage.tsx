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
  IconCalendar,
  IconClock,
  IconX,
  IconTrash,
  IconEdit,
  IconCheck,
  IconAlertCircle,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { Logo, LogoIcon } from "./AdminDashboard";
import { liveClassesApi } from "@/api/endpoints/liveClasses";
import { batchesApi } from "@/api/endpoints/batches";
import type { LiveClass, LiveClassStatus, Batch } from "@/types";

export const LiveClassesPage = () => {
  const { user, logout } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<LiveClassStatus | "all">("all");
  const [liveClasses, setLiveClasses] = useState<LiveClass[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

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
  }, []);

  useEffect(() => {
    if (selectedBatch !== "all") {
      fetchLiveClassesByBatch(selectedBatch);
    }
  }, [selectedBatch]);

  const fetchBatches = async () => {
    try {
      const { batches: data } = await batchesApi.list();
      setBatches(data);
    } catch (error) {
      console.error("Error fetching batches:", error);
    }
  };

  const fetchLiveClassesByBatch = async (batchId: string) => {
    try {
      setLoading(true);
      const { liveClasses: data } = await liveClassesApi.listByBatch(batchId);
      setLiveClasses(data);
    } catch (error) {
      console.error("Error fetching live classes:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClasses = (liveClasses || []).filter((cls) => {
    const matchesSearch = cls.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === "all" || cls.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: LiveClassStatus) => {
    switch (status) {
      case "scheduled":
        return { bg: "bg-blue-100", text: "text-blue-700", dot: "bg-blue-500", icon: IconCalendar };
      case "ongoing":
        return { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500", icon: IconCheck };
      case "completed":
        return { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500", icon: IconCheck };
      case "cancelled":
        return { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500", icon: IconAlertCircle };
      default:
        return { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500", icon: IconCalendar };
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      time: date.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    };
  };

  const handleDelete = async (classId: string) => {
    if (!confirm("Are you sure you want to delete this live class?")) return;

    try {
      await liveClassesApi.delete(classId);
      if (selectedBatch !== "all") {
        await fetchLiveClassesByBatch(selectedBatch);
      }
    } catch (error) {
      console.error("Error deleting live class:", error);
      alert("Failed to delete live class");
    }
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
              Live Classes
            </h1>
            <p className="text-lg text-gray-500">
              Schedule and manage Zoom live classes for your batches.
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
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#2D96FF] to-[#0B7FE8] flex items-center justify-center shadow-md">
                  <IconBrandZoom className="w-7 h-7 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Scheduled Classes</h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {(liveClasses || []).length} total classes
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                disabled={selectedBatch === "all"}
                className="flex items-center gap-2 rounded-xl bg-[#2D2D2D] px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                <IconPlus className="h-4 w-4" strokeWidth={2.5} />
                Schedule Class
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <IconSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Search classes by title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border-0 bg-gray-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20"
                />
              </div>
              <div className="flex gap-2.5">
                <select
                  value={selectedBatch}
                  onChange={(e) => setSelectedBatch(e.target.value)}
                  className="rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20 cursor-pointer"
                >
                  <option value="all">Select Batch</option>
                  {(batches || []).map((batch) => (
                    <option key={batch.id} value={batch.id}>
                      {batch.batch_name}
                    </option>
                  ))}
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as LiveClassStatus | "all")}
                  className="rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20 cursor-pointer"
                >
                  <option value="all">All Status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="ongoing">Ongoing</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Classes List */}
          {selectedBatch === "all" ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center justify-center h-64 rounded-[28px] bg-white shadow-lg"
            >
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#2D96FF] to-[#0B7FE8] flex items-center justify-center mb-4">
                <IconBrandZoom className="w-10 h-10 text-white" strokeWidth={1.5} />
              </div>
              <p className="text-gray-900 font-semibold text-base mb-1">Select a Batch</p>
              <p className="text-gray-500 text-sm">Choose a batch to view its live classes</p>
            </motion.div>
          ) : loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center h-64 rounded-[28px] bg-white shadow-lg"
            >
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#2D96FF] to-[#0B7FE8] flex items-center justify-center mx-auto mb-3 animate-pulse">
                  <IconBrandZoom className="w-6 h-6 text-white" />
                </div>
                <p className="text-gray-500 text-sm font-medium">Loading classes...</p>
              </div>
            </motion.div>
          ) : filteredClasses.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="flex flex-col items-center justify-center h-64 rounded-[28px] bg-white shadow-lg"
            >
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <IconBrandZoom className="w-10 h-10 text-gray-400" strokeWidth={1.5} />
              </div>
              <p className="text-gray-900 font-semibold text-base mb-1">No classes scheduled</p>
              <p className="text-gray-500 text-sm mb-4">Schedule your first live class for this batch</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 rounded-xl bg-[#2D2D2D] px-5 py-2.5 text-sm font-semibold text-white hover:shadow-lg transition-all"
              >
                <IconPlus className="h-4 w-4" strokeWidth={2.5} />
                Schedule Class
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {(filteredClasses || []).map((cls, idx) => {
                const statusColor = getStatusColor(cls.status);
                const { date, time } = formatDateTime(cls.scheduled_at);
                const StatusIcon = statusColor.icon;

                return (
                  <motion.div
                    key={cls.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 + idx * 0.05 }}
                    className="rounded-[24px] bg-white p-5 shadow-lg hover:shadow-xl transition-all group"
                  >
                    <div className="flex items-center gap-4">
                      {/* Class Icon */}
                      <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-[#2D96FF] to-[#0B7FE8] flex items-center justify-center text-white shrink-0 shadow-md">
                        <IconBrandZoom className="w-7 h-7" strokeWidth={2} />
                      </div>

                      {/* Class Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base text-gray-900 mb-1">
                          {cls.title}
                        </h3>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                          <span className="flex items-center gap-1">
                            <IconCalendar className="w-3.5 h-3.5" strokeWidth={2} />
                            {date}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <IconClock className="w-3.5 h-3.5" strokeWidth={2} />
                            {time}
                          </span>
                          <span>•</span>
                          <span>{cls.duration_minutes} min</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-sm",
                              statusColor.bg,
                              statusColor.text
                            )}
                          >
                            <StatusIcon className="w-3.5 h-3.5" strokeWidth={2} />
                            {cls.status.charAt(0).toUpperCase() + cls.status.slice(1)}
                          </span>
                          {cls.batch && (
                            <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold shadow-sm bg-gray-100 text-gray-700">
                              <IconSchool className="w-3.5 h-3.5" strokeWidth={2} />
                              {cls.batch.batch_name}
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        {cls.status === "scheduled" && (
                          <button className="rounded-xl px-4 py-2.5 text-sm font-bold bg-gradient-to-br from-[#2D96FF] to-[#0B7FE8] text-white hover:shadow-lg transition-all flex items-center gap-2">
                            <IconBrandZoom className="w-4 h-4" strokeWidth={2} />
                            Join Class
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(cls.id)}
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-red-600 hover:text-red-700 p-2"
                        >
                          <IconTrash className="w-4 h-4" strokeWidth={2} />
                        </button>
                      </div>
                    </div>

                    {cls.description && (
                      <div className="mt-3 pl-[72px]">
                        <p className="text-sm text-gray-600">{cls.description}</p>
                      </div>
                    )}
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
          <CreateLiveClassModal
            onClose={() => setShowCreateModal(false)}
            onSuccess={() => {
              setShowCreateModal(false);
              if (selectedBatch !== "all") {
                fetchLiveClassesByBatch(selectedBatch);
              }
            }}
            batchId={selectedBatch}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Create Live Class Modal Component
const CreateLiveClassModal = ({
  onClose,
  onSuccess,
  batchId,
}: {
  onClose: () => void;
  onSuccess: () => void;
  batchId: string;
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    scheduled_at: "",
    duration_minutes: 60,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.title || !formData.scheduled_at) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      await liveClassesApi.create({
        batch_id: batchId,
        title: formData.title,
        description: formData.description || undefined,
        scheduled_at: formData.scheduled_at,
        duration_minutes: formData.duration_minutes,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to schedule live class");
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
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#2D96FF] to-[#0B7FE8] flex items-center justify-center shadow-lg">
              <IconBrandZoom className="w-7 h-7 text-white" strokeWidth={2} />
            </div>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">Schedule Live Class</h2>
              <p className="text-sm text-gray-500 mt-1">Create a Zoom meeting for your batch</p>
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
          {/* Title */}
          <div>
            <label className="block text-sm font-bold text-gray-900 mb-2.5">
              Class Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2D96FF] focus:border-transparent transition-all"
              placeholder="e.g., React Hooks Deep Dive"
            />
          </div>

          {/* Date & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2.5">
                Scheduled Date & Time <span className="text-red-500">*</span>
              </label>
              <input
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2D96FF] focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2.5">
                Duration (minutes)
              </label>
              <input
                type="number"
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                min="15"
                step="15"
                className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2D96FF] focus:border-transparent transition-all"
              />
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
              rows={3}
              className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#2D96FF] focus:border-transparent resize-none transition-all"
              placeholder="Add class description..."
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
              className="rounded-xl px-6 py-3 text-sm font-bold bg-gradient-to-br from-[#2D96FF] to-[#0B7FE8] text-white hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  Scheduling...
                </>
              ) : (
                <>
                  <IconCalendar className="w-4 h-4" strokeWidth={2.5} />
                  Schedule Class
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
};
