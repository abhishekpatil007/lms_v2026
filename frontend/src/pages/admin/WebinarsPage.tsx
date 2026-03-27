import React, { useState, useEffect } from "react";
import {
  IconSearch,
  IconPlus,
  IconX,
  IconEdit,
  IconTrash,
  IconClock,
  IconCalendar,
  IconUserCheck,
  IconUsers,
  IconCopy,
  IconCheck,
  IconDownload,
  IconEye,
  IconPresentation,
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatDateIST, formatTimeIST, formatDateTimeIST, toISTDateTimeLocal, fromISTToUTC } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { webinarsApi } from "@/api/endpoints/webinars";
import type { Webinar, WebinarStatus, WebinarRegistration } from "@/types";
import toast from "react-hot-toast";

export const WebinarsPage = () => {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<WebinarStatus | "all">("all");
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showRegistrationsModal, setShowRegistrationsModal] = useState(false);
  const [selectedWebinar, setSelectedWebinar] = useState<Webinar | null>(null);
  const [registrations, setRegistrations] = useState<WebinarRegistration[]>([]);
  const [loadingRegistrations, setLoadingRegistrations] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    topic: "",
    description: "",
    start_time: "",
    duration: 60,
    max_attendees: undefined as number | undefined,
    is_public: true,
    status: "scheduled" as WebinarStatus,
  });

  useEffect(() => {
    fetchWebinars();
  }, []);

  const fetchWebinars = async () => {
    try {
      setLoading(true);
      const { data } = await webinarsApi.list();
      setWebinars(data);
    } catch (error) {
      console.error("Error fetching webinars:", error);
      toast.error("Failed to fetch webinars");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreateModal = () => {
    setFormData({
      topic: "",
      description: "",
      start_time: "",
      duration: 60,
      max_attendees: undefined,
      is_public: true,
      status: "scheduled",
    });
    setShowCreateModal(true);
  };

  const handleOpenEditModal = (webinar: Webinar) => {
    setSelectedWebinar(webinar);
    setFormData({
      topic: webinar.topic,
      description: webinar.description || "",
      start_time: toISTDateTimeLocal(webinar.start_time),
      duration: webinar.duration,
      max_attendees: webinar.max_attendees,
      is_public: webinar.is_public,
      status: webinar.status,
    });
    setShowEditModal(true);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await webinarsApi.create({
        topic: formData.topic,
        description: formData.description || undefined,
        start_time: fromISTToUTC(formData.start_time) || "",
        duration: formData.duration,
        max_attendees: formData.max_attendees,
        is_public: formData.is_public,
      });
      setShowCreateModal(false);
      fetchWebinars();
      toast.success("Webinar created successfully!");
    } catch (error: any) {
      console.error("Error creating webinar:", error);
      toast.error(error.response?.data?.message || "Failed to create webinar");
    }
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWebinar) return;

    try {
      await webinarsApi.update(selectedWebinar.id, {
        topic: formData.topic,
        description: formData.description || undefined,
        start_time: fromISTToUTC(formData.start_time) || "",
        duration: formData.duration,
        max_attendees: formData.max_attendees,
        is_public: formData.is_public,
        status: formData.status,
      });
      setShowEditModal(false);
      setSelectedWebinar(null);
      fetchWebinars();
      toast.success("Webinar updated successfully!");
    } catch (error: any) {
      console.error("Error updating webinar:", error);
      toast.error(error.response?.data?.message || "Failed to update webinar");
    }
  };

  const handleDelete = async (webinarId: string) => {
    if (!confirm("Are you sure you want to delete this webinar?")) return;

    try {
      await webinarsApi.delete(webinarId);
      fetchWebinars();
      toast.success("Webinar deleted successfully!");
    } catch (error: any) {
      console.error("Error deleting webinar:", error);
      toast.error(error.response?.data?.message || "Failed to delete webinar");
    }
  };

  const handleViewRegistrations = async (webinar: Webinar) => {
    setSelectedWebinar(webinar);
    setShowRegistrationsModal(true);
    setLoadingRegistrations(true);
    try {
      const { registrations: data } = await webinarsApi.getRegistrations(webinar.id);
      setRegistrations(data);
    } catch (error: any) {
      console.error("Error fetching registrations:", error);
      toast.error("Failed to fetch registrations");
      setRegistrations([]);
    } finally {
      setLoadingRegistrations(false);
    }
  };

  const handleCopyLink = async (webinarId: string) => {
    const link = `${window.location.origin}/webinar/${webinarId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(webinarId);
      toast.success("Link copied to clipboard!");
      setTimeout(() => setCopiedId(null), 2000);
    } catch (error) {
      console.error("Error copying link:", error);
      toast.error("Failed to copy link");
    }
  };

  const handleExportCSV = () => {
    if (!selectedWebinar || registrations.length === 0) return;

    const headers = ["Name", "Email", "Phone", "Organization", "Registered At"];
    const rows = registrations.map(reg => [
      reg.name,
      reg.email,
      reg.phone || "",
      reg.organization || "",
      formatDateTimeIST(reg.registered_at),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `webinar-${selectedWebinar.topic.replace(/\s+/g, "-").toLowerCase()}-registrations.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully!");
  };

  const getWebinarStatus = (webinar: Webinar): WebinarStatus => {
    if (webinar.status === "cancelled") return "cancelled";

    const now = new Date();
    const scheduledAt = new Date(webinar.start_time);
    const endTime = new Date(scheduledAt.getTime() + webinar.duration * 60000);

    if (now >= scheduledAt && now <= endTime) return "ongoing";
    if (now > endTime) return "completed";
    return "scheduled";
  };

  const filteredWebinars = (webinars || []).filter((webinar) => {
    const matchesSearch =
      webinar.topic.toLowerCase().includes(searchQuery.toLowerCase()) ||
      webinar.description?.toLowerCase().includes(searchQuery.toLowerCase());

    const actualStatus = getWebinarStatus(webinar);
    const matchesFilter = filterStatus === "all" || actualStatus === filterStatus;

    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: WebinarStatus) => {
    switch (status) {
      case "scheduled":
        return { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" };
      case "ongoing":
        return { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" };
      case "completed":
        return { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-500" };
      case "cancelled":
        return { bg: "bg-rose-100", text: "text-rose-700", dot: "bg-rose-500" };
      default:
        return { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" };
    }
  };

  const formatDateTime = (dateString: string) => {
    return formatDateTimeIST(dateString);
  };

  const totalWebinars = (webinars || []).length;
  const upcomingWebinars = (webinars || []).filter(w => getWebinarStatus(w) === "scheduled").length;
  const totalRegistrations = (webinars || []).reduce((acc, w) => acc + (w.registrations_count || 0), 0);

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
              Manage webinars for lead generation and engagement.
            </p>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3 md:gap-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="rounded-2xl bg-violet-200 p-3 sm:p-4 md:p-5 border border-gray-200"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-900/10 flex items-center justify-center">
                  <IconPresentation className="w-4 h-4 sm:w-5 sm:h-5 text-gray-900" strokeWidth={2} />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-gray-900/60">Total Webinars</span>
              </div>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">{totalWebinars}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="rounded-2xl bg-emerald-200 p-3 sm:p-4 md:p-5 border border-gray-200"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-900/10 flex items-center justify-center">
                  <IconCalendar className="w-4 h-4 sm:w-5 sm:h-5 text-gray-900" strokeWidth={2} />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-gray-900/60">Upcoming</span>
              </div>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">{upcomingWebinars}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="col-span-2 md:col-span-1 rounded-2xl bg-amber-200 p-3 sm:p-4 md:p-5 border border-gray-200"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-2">
                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-gray-900/10 flex items-center justify-center">
                  <IconUserCheck className="w-4 h-4 sm:w-5 sm:h-5 text-gray-900" strokeWidth={2} />
                </div>
                <span className="text-xs sm:text-sm font-semibold text-gray-900/60">Total Registrations</span>
              </div>
              <p className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900">{totalRegistrations}</p>
            </motion.div>
          </div>

          {/* Header Card with Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl bg-white p-4 sm:p-5 md:p-6 border border-gray-200"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-violet-300 to-violet-500 flex items-center justify-center shrink-0">
                  <IconPresentation className="w-5 h-5 sm:w-7 sm:h-7 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Webinars Management</h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    Showing {filteredWebinars.length} of {totalWebinars} webinars
                  </p>
                </div>
              </div>
              <button
                onClick={handleOpenCreateModal}
                className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-violet-300 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
              >
                <IconPlus className="h-4 w-4" strokeWidth={2.5} />
                Create Webinar
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <IconSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
                <input
                  type="text"
                  placeholder="Search webinars by title or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border-0 bg-gray-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                />
              </div>
              <div className="flex gap-2.5">
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value as any)}
                  className="rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-gray-900/20 cursor-pointer"
                >
                  <option value="all">All Webinars</option>
                  <option value="scheduled">Upcoming</option>
                  <option value="ongoing">Live</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          </motion.div>

          {/* Webinars Grid */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-gray-500 text-lg">Loading webinars...</div>
            </div>
          ) : filteredWebinars.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-64 rounded-2xl bg-white border border-gray-200"
            >
              <IconPresentation className="w-16 h-16 text-gray-300 mb-4" strokeWidth={1.5} />
              <p className="text-gray-900 font-semibold text-lg mb-1">No webinars found</p>
              <p className="text-gray-500 text-sm mb-4">Try adjusting your search or create a new webinar</p>
              <button
                onClick={handleOpenCreateModal}
                className="flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:shadow-lg transition-all"
              >
                <IconPlus className="h-4 w-4" strokeWidth={2.5} />
                Create Webinar
              </button>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
              {filteredWebinars.map((webinar, idx) => {
                const actualStatus = getWebinarStatus(webinar);
                const statusColors = getStatusColor(actualStatus);
                const registrationCount = webinar.registrations_count || 0;
                const publicLink = `${window.location.origin}/webinar/${webinar.id}`;
                const shortLink = `.../${webinar.id.slice(0, 8)}`;

                return (
                  <motion.div
                    key={webinar.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className="rounded-2xl bg-white p-3 sm:p-4 md:p-5 border border-gray-200 hover:shadow-lg transition-all group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-300 to-violet-500 text-base font-bold text-white shadow-md">
                          {webinar.topic.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-base text-gray-900 truncate">
                            {webinar.topic}
                          </div>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleOpenEditModal(webinar)}
                          className="p-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors"
                          title="Edit webinar"
                        >
                          <IconEdit className="w-4 h-4 text-gray-600" strokeWidth={2} />
                        </button>
                        <button
                          onClick={() => handleDelete(webinar.id)}
                          className="p-1.5 rounded-lg bg-red-100 hover:bg-red-200 transition-colors"
                          title="Delete webinar"
                        >
                          <IconTrash className="w-4 h-4 text-red-600" strokeWidth={2} />
                        </button>
                      </div>
                    </div>

                    {webinar.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {webinar.description}
                      </p>
                    )}

                    <div className="flex items-center gap-2 mb-3 flex-wrap">
                      <span className={cn(
                        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold",
                        statusColors.bg,
                        statusColors.text
                      )}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", statusColors.dot)}></span>
                        {actualStatus.charAt(0).toUpperCase() + actualStatus.slice(1)}
                      </span>
                      {registrationCount > 0 && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                          <IconUserCheck className="w-3 h-3" strokeWidth={2} />
                          {registrationCount} registered
                        </span>
                      )}
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-xs text-gray-700">
                        <IconCalendar className="w-3.5 h-3.5 text-gray-400" strokeWidth={2} />
                        {formatDateTime(webinar.start_time)}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-700">
                        <IconClock className="w-3.5 h-3.5 text-gray-400" strokeWidth={2} />
                        {webinar.duration} minutes
                      </div>
                      {webinar.max_attendees && (
                        <div className="flex items-center gap-2 text-xs text-gray-700">
                          <IconUsers className="w-3.5 h-3.5 text-gray-400" strokeWidth={2} />
                          Max {webinar.max_attendees} attendees
                        </div>
                      )}
                    </div>

                    {webinar.is_public && (
                      <div className="mb-3 p-2.5 rounded-xl bg-gray-50 border border-gray-200">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs text-gray-500 mb-0.5">Public Link</p>
                            <p className="text-xs font-mono text-gray-700 truncate" title={publicLink}>
                              {shortLink}
                            </p>
                          </div>
                          <button
                            onClick={() => handleCopyLink(webinar.id)}
                            className="p-1.5 rounded-lg bg-white hover:bg-gray-100 border border-gray-200 transition-colors"
                            title="Copy link"
                          >
                            {copiedId === webinar.id ? (
                              <IconCheck className="w-3.5 h-3.5 text-green-600" strokeWidth={2} />
                            ) : (
                              <IconCopy className="w-3.5 h-3.5 text-gray-600" strokeWidth={2} />
                            )}
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewRegistrations(webinar)}
                        className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 px-3 py-2 text-xs font-bold text-white hover:shadow-md transition-all"
                      >
                        <IconEye className="w-3.5 h-3.5" strokeWidth={2} />
                        View Registrations
                      </button>
                      <button
                        onClick={() => handleCopyLink(webinar.id)}
                        className="rounded-xl bg-gray-100 hover:bg-gray-200 px-3 py-2 text-xs font-bold text-gray-700 transition-all"
                        title="Copy link"
                      >
                        <IconCopy className="w-3.5 h-3.5" strokeWidth={2} />
                      </button>
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
              className="w-full max-w-2xl rounded-[28px] bg-white p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">Create New Webinar</h3>
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
                    Webinar Topic *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                    placeholder="Enter webinar topic"
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
                    className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 resize-none"
                    placeholder="Enter webinar description"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Scheduled Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Duration (minutes) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
                      className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                      placeholder="60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Max Attendees (optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_attendees || ""}
                    onChange={(e) => setFormData({ ...formData, max_attendees: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                    placeholder="Leave empty for unlimited"
                  />
                </div>

                <div className="hidden">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Meeting URL (optional)
                  </label>
                  <input
                    type="url"
                    value=""
                    readOnly
                    className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                    placeholder="https://zoom.us/j/..."
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_public"
                    checked={formData.is_public}
                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    className="w-4 h-4 text-violet-500 focus:ring-violet-500 rounded"
                  />
                  <label htmlFor="is_public" className="text-sm font-semibold text-gray-700">
                    Make this webinar public (anyone can register)
                  </label>
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
                    className="flex-1 rounded-xl bg-gradient-to-br from-violet-300 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    Create Webinar
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {showEditModal && selectedWebinar && (
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
              className="w-full max-w-2xl rounded-[28px] bg-white p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-gray-900">Edit Webinar</h3>
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
                    Webinar Topic *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.topic}
                    onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                    className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                    placeholder="Enter webinar topic"
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
                    className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 resize-none"
                    placeholder="Enter webinar description"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Scheduled Date & Time *
                    </label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.start_time}
                      onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                      className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                      Duration (minutes) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: parseInt(e.target.value) || 60 })}
                      className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                      placeholder="60"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Max Attendees (optional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={formData.max_attendees || ""}
                    onChange={(e) => setFormData({ ...formData, max_attendees: e.target.value ? parseInt(e.target.value) : undefined })}
                    className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                    placeholder="Leave empty for unlimited"
                  />
                </div>

                <div className="hidden">
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Meeting URL (optional)
                  </label>
                  <input
                    type="url"
                    value=""
                    readOnly
                    className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                    placeholder="https://zoom.us/j/..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                    Status *
                  </label>
                  <select
                    required
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as WebinarStatus })}
                    className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 cursor-pointer"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_public_edit"
                    checked={formData.is_public}
                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    className="w-4 h-4 text-violet-500 focus:ring-violet-500 rounded"
                  />
                  <label htmlFor="is_public_edit" className="text-sm font-semibold text-gray-700">
                    Make this webinar public (anyone can register)
                  </label>
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
                    className="flex-1 rounded-xl bg-gradient-to-br from-violet-300 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    Update Webinar
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* View Registrations Modal */}
      <AnimatePresence>
        {showRegistrationsModal && selectedWebinar && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setShowRegistrationsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-4xl rounded-[28px] bg-white p-4 sm:p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-gray-900">Webinar Registrations</h3>
                  <p className="text-sm text-gray-500 mt-1">{selectedWebinar.topic}</p>
                </div>
                <button
                  onClick={() => setShowRegistrationsModal(false)}
                  className="rounded-full p-1 hover:bg-gray-100 transition-colors"
                >
                  <IconX className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              <div className="mb-4 flex items-center justify-between p-4 rounded-xl bg-gradient-to-br from-blue-400/20 to-blue-500/20 border border-blue-400/30">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Total Registrations</p>
                  <p className="text-3xl font-bold text-gray-900">{registrations.length}</p>
                </div>
                {registrations.length > 0 && (
                  <button
                    onClick={handleExportCSV}
                    className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-blue-400 to-blue-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all"
                  >
                    <IconDownload className="h-4 w-4" strokeWidth={2} />
                    Export CSV
                  </button>
                )}
              </div>

              {loadingRegistrations ? (
                <div className="flex items-center justify-center h-40">
                  <div className="text-gray-500">Loading registrations...</div>
                </div>
              ) : registrations.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 text-gray-500">
                  <IconUserCheck className="w-16 h-16 text-gray-300 mb-2" strokeWidth={1.5} />
                  <p>No registrations yet</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">Name</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">Email</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">Phone</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">Organization</th>
                        <th className="text-left py-3 px-4 text-xs font-semibold text-gray-700">Registered At</th>
                      </tr>
                    </thead>
                    <tbody>
                      {registrations.map((reg, idx) => (
                        <tr key={reg.id} className={cn(
                          "border-b border-gray-100",
                          idx % 2 === 0 ? "bg-gray-50" : "bg-white"
                        )}>
                          <td className="py-3 px-4 text-sm text-gray-900">{reg.name}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{reg.email}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{reg.phone || "-"}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">{reg.organization || "-"}</td>
                          <td className="py-3 px-4 text-sm text-gray-600">
                            {new Date(reg.registered_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
