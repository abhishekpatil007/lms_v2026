import React, { useState, useEffect } from "react";
import {
  IconUsers,
  IconSchool,
  IconSearch,
  IconPlus,
  IconCalendar,
  IconUserCheck,
  IconX,
  IconBook,
  IconDownload,
  IconUpload,
  IconFileSpreadsheet
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { batchesApi } from "@/api/endpoints/batches";
import { coursesApi } from "@/api/endpoints/courses";
import { usersApi } from "@/api/endpoints/users";
import { TopicManager } from "@/components/topics/TopicManager";
import type { Batch, Course, BatchStatus, User } from "@/types";
import { toast } from "react-hot-toast";

export const BatchesPage = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<BatchStatus | "all">("all");
  const [filterCourse, setFilterCourse] = useState<string>("all");
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
  const [showTopicManager, setShowTopicManager] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const itemsPerPage = 9;

  useEffect(() => {
    setCurrentPage(1);
  }, [filterStatus, filterCourse, searchQuery]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchBatches();
    }, 300);
    return () => clearTimeout(delayDebounceFn);
  }, [currentPage, filterStatus, filterCourse, searchQuery]);

  useEffect(() => {
    fetchCourses();
    fetchUsers();
  }, []);

  const fetchBatches = async () => {
    try {
      setLoading(true);
      const params: Record<string, any> = {
        page: currentPage,
        limit: itemsPerPage
      };
      if (filterStatus !== "all") params.status = filterStatus;
      if (filterCourse !== "all") params.course_id = Number(filterCourse);
      if (searchQuery.trim() !== "") params.search = searchQuery.trim();
      
      const response = await batchesApi.list(params);
      setBatches(response.batches);
      if (response.totalPages) setTotalPages(response.totalPages);
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
      await fetchBatches();
      setShowAssignInstructorModal(false);
      setSelectedBatchForAction(null);
      setSelectedInstructorId(null);
      toast.success("Instructor assigned successfully");
    } catch (error) {
      console.error("Error assigning instructor:", error);
      toast.error("Failed to assign instructor");
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
      throw error;
    }
  };

  const filteredBatches = batches || [];

  const getStatusColor = (status: BatchStatus) => {
    switch (status) {
      case "draft":
        return { bg: "bg-amber-100", text: "text-amber-700", dot: "bg-amber-500" };
      case "ongoing":
        return { bg: "bg-emerald-100", text: "text-emerald-700", dot: "bg-emerald-500" };
      case "completed":
        return { bg: "bg-violet-100", text: "text-violet-700", dot: "bg-violet-500" };
      case "inactive":
        return { bg: "bg-rose-100", text: "text-rose-700", dot: "bg-rose-500" };
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
    <>
      <div className="flex flex-1 overflow-auto">
        <div className="flex h-full w-full flex-1 flex-col gap-6 p-3 sm:p-4 md:p-7">
          {/* Welcome Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-2">
              Batch Management
            </h1>
            <p className="text-sm md:text-base text-gray-500">
              Create and manage course batches effectively.
            </p>
          </motion.div>

          {/* Header Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl bg-white p-4 sm:p-5 md:p-6 border border-gray-200"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-violet-400 to-violet-500 flex items-center justify-center shadow-md shrink-0">
                  <IconSchool className="w-5 h-5 sm:w-7 sm:h-7 text-white" strokeWidth={2} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-semibold text-gray-900">Active Batches</h2>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {(batches || []).length} total batches
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center justify-center gap-2 rounded-xl bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow-lg hover:shadow-xl transition-all hover:scale-105 w-full sm:w-auto"
              >
                <IconPlus className="h-4 w-4" strokeWidth={2.5} />
                Create Batch
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <IconSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
              <input
                type="text"
                placeholder="Search batches by name, course, or instructor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border-0 bg-gray-50 py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
              />
            </div>

            {/* Filter Pills & Dropdown */}
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-xs font-semibold text-gray-500 mr-1">Status:</span>
              {(["all", "draft", "ongoing", "completed", "inactive"] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={cn(
                    "rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all",
                    filterStatus === status
                      ? "bg-gray-900 text-white shadow-sm"
                      : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                  )}
                >
                  {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
                </button>
              ))}

              {(courses || []).length > 0 && (
                <>
                  <div className="w-px h-6 bg-gray-200 mx-1" />
                  <span className="text-xs font-semibold text-gray-500 mr-1">Course:</span>
                  <select
                    value={filterCourse}
                    onChange={(e) => setFilterCourse(e.target.value)}
                    className="rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-900/20 cursor-pointer"
                  >
                    <option value="all">All Courses</option>
                    {(courses || []).map((course) => (
                      <option key={course.id} value={course.id}>{course.title}</option>
                    ))}
                  </select>
                </>
              )}
            </div>
          </motion.div>

                    {/* Stats Summary */}
          {!loading && filteredBatches.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="grid grid-cols-2 gap-2.5 sm:gap-3 md:gap-5 md:grid-cols-4"
            >
              <div className="rounded-2xl bg-emerald-200 p-3 sm:p-4 md:p-5 border border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gray-900/10 flex items-center justify-center">
                    <IconSchool className="w-5 h-5 text-gray-900" strokeWidth={2} />
                  </div>
                  <p className="text-xs font-semibold text-gray-900/60">Total Batches</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">{batches.length}</p>
              </div>

              <div className="rounded-2xl bg-white p-3 sm:p-4 md:p-5 border border-gray-200">
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

              <div className="rounded-2xl bg-white p-3 sm:p-4 md:p-5 border border-gray-200">
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

              <div className="rounded-2xl bg-violet-200 p-3 sm:p-4 md:p-5 border border-gray-200">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-gray-900/10 flex items-center justify-center">
                    <IconUsers className="w-5 h-5 text-gray-900" strokeWidth={2} />
                  </div>
                  <p className="text-xs font-semibold text-gray-900/60">Total Students</p>
                </div>
                <p className="text-3xl font-bold text-gray-900">
                  {(batches || []).reduce((acc, b) => acc + (b.students?.length || 0), 0)}
                </p>
              </div>
            </motion.div>
          )}

          {/* Batches Grid */}
          {loading ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center justify-center h-64 rounded-2xl bg-white border border-gray-200"
            >
              <div className="text-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-violet-500 flex items-center justify-center mx-auto mb-3 animate-pulse">
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
              className="flex flex-col items-center justify-center h-64 rounded-2xl bg-white border border-gray-200"
            >
              <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center mb-4">
                <IconSchool className="w-10 h-10 text-gray-400" strokeWidth={1.5} />
              </div>
              <p className="text-gray-900 font-semibold text-base mb-1">No batches found</p>
              <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
            </motion.div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-3 sm:gap-4 md:gap-5 lg:grid-cols-2 xl:grid-cols-3">
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
                      "rounded-2xl p-3 sm:p-4 md:p-5 border border-gray-200 hover:shadow-lg transition-all cursor-pointer group relative overflow-hidden",
                      isOngoing
                        ? "bg-gradient-to-br from-emerald-400 to-emerald-500"
                        : "bg-white"
                    )}
                  >
                    {/* Header */}
                    <div
                      className="flex items-start justify-between mb-4 cursor-pointer"
                      onClick={() => navigate(`/admin/batches/${batch.id}`)}
                    >
                      <div className="flex-1">
                        <h3 className={cn(
                          "font-bold text-lg mb-1.5 group-hover:underline underline-offset-2",
                          isOngoing ? "text-gray-900" : "text-gray-900"
                        )}>
                          {batch.batch_name}
                        </h3>
                        <div className={cn(
                          "flex items-center gap-1.5 text-xs font-medium",
                          isOngoing ? "text-gray-900/70" : "text-gray-500"
                        )}>
                          <IconBook className="w-3.5 h-3.5" strokeWidth={2} />
                          {batch.course?.title || "No course"}
                        </div>
                      </div>
                      <button className={cn(
                        "opacity-0 group-hover:opacity-100 transition-opacity text-base font-bold",
                        isOngoing ? "text-gray-900" : "text-gray-600"
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
                            ? "bg-white/90 text-emerald-500"
                            : "bg-gradient-to-br from-violet-400 to-violet-500 text-white"
                        )}>
                          {batch.instructor.name?.charAt(0) || 'I'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-xs font-semibold truncate",
                            isOngoing ? "text-gray-900" : "text-gray-900"
                          )}>
                            {batch.instructor.name}
                          </p>
                          <p className={cn(
                            "text-xs",
                            isOngoing ? "text-gray-900/60" : "text-gray-500"
                          )}>
                            Instructor
                          </p>
                        </div>
                        <IconUserCheck className={cn(
                          "w-4 h-4",
                          isOngoing ? "text-gray-900/40" : "text-gray-400"
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
                            ? "bg-white/30 text-gray-900 hover:bg-white/40"
                            : "bg-gradient-to-br from-emerald-400 to-emerald-500 text-gray-900 hover:shadow-md"
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
                            ? "bg-white/30 text-gray-900 hover:bg-white/40"
                            : "bg-gradient-to-br from-blue-400 to-blue-500 text-white hover:shadow-md"
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
                            ? "bg-gray-900 text-white"
                            : cn(statusColor.bg, statusColor.text)
                        )}
                      >
                        <div className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          isOngoing ? "bg-emerald-400" : statusColor.dot
                        )} />
                        {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
                      </span>
                      <span className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-sm",
                        isOngoing
                          ? "bg-white/30 text-gray-900"
                          : "bg-gray-100 text-gray-700"
                      )}>
                        <IconUsers className="w-3.5 h-3.5" strokeWidth={2} />
                        {batch.students?.length || 0}
                      </span>
                    </div>

                    {/* Dates */}
                    <div className={cn(
                      "rounded-xl px-3.5 py-3 space-y-2 mb-4",
                      isOngoing ? "bg-gray-900/10" : "bg-gray-50"
                    )}>
                      <div className={cn(
                        "flex items-center gap-2 text-xs font-medium",
                        isOngoing ? "text-gray-900" : "text-gray-700"
                      )}>
                        <IconCalendar className="w-4 h-4" strokeWidth={2} />
                        <span className="font-semibold">Start:</span>
                        <span className="ml-auto">{formatDate(batch.start_date)}</span>
                      </div>
                      <div className={cn(
                        "flex items-center gap-2 text-xs font-medium",
                        isOngoing ? "text-gray-900" : "text-gray-700"
                      )}>
                        <IconCalendar className="w-4 h-4" strokeWidth={2} />
                        <span className="font-semibold">End:</span>
                        <span className="ml-auto">{formatDate(batch.end_date)}</span>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedBatchForAction(batch);
                          setShowTopicManager(true);
                        }}
                        className={cn(
                          "flex-1 rounded-xl py-2.5 text-xs font-bold transition-all",
                          isOngoing
                            ? "bg-white/30 text-gray-900 hover:bg-white/40"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                      >
                        Manage Topics
                      </button>
                      <button
                        onClick={() => navigate(`/admin/batches/${batch.id}`)}
                        className={cn(
                          "rounded-xl px-4 py-2.5 text-xs font-bold transition-all hover:scale-105",
                          isOngoing
                            ? "bg-gray-900 text-white hover:shadow-lg"
                            : "bg-gray-900 text-white hover:shadow-lg"
                        )}
                      >
                        View Details
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
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 mt-8 pb-4">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-5 py-2.5 text-sm font-bold rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  Previous
                </button>
                <span className="text-sm font-bold text-gray-700 px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-5 py-2.5 text-sm font-bold rounded-xl bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
                >
                  Next
                </button>
              </div>
            )}
          </>
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

      {/* Topic Manager Modal */}
      <AnimatePresence>
        {showTopicManager && selectedBatchForAction && (
          <TopicManager
            batchId={selectedBatchForAction.id}
            batchName={selectedBatchForAction.batch_name}
            onClose={() => {
              setShowTopicManager(false);
              setSelectedBatchForAction(null);
            }}
          />
        )}
      </AnimatePresence>
    </>
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
        className="w-full max-w-2xl rounded-[28px] bg-white p-4 sm:p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-violet-400 to-violet-500 flex items-center justify-center shadow-lg">
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
              className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all"
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
                className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 pl-11 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent cursor-pointer transition-all appearance-none"
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
                  className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 pl-11 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all"
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
                  className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 pl-11 pr-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent transition-all"
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
              className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent resize-none transition-all"
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
              className="rounded-xl px-6 py-3 text-sm font-bold bg-gradient-to-br from-violet-400 to-violet-500 text-white hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
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
    if (!selectedInstructorId) {
      toast.error("Please select an instructor");
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
        className="w-full max-w-2xl rounded-[28px] bg-white p-4 sm:p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center shadow-lg">
              <IconUserCheck className="w-7 h-7 text-gray-900" strokeWidth={2} />
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
            <div className="mb-6 rounded-xl bg-gradient-to-br from-emerald-400/20 to-emerald-500/20 border-2 border-emerald-400/30 p-4">
              <p className="text-xs font-bold text-gray-700 mb-2">Current Instructor:</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-500 flex items-center justify-center text-sm font-bold text-gray-900">
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
          <div className="space-y-2 max-h-[250px] sm:max-h-[300px] md:max-h-[400px] overflow-y-auto pr-2">
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
                      ? "bg-gradient-to-br from-emerald-400 to-emerald-500 border-2 border-emerald-500"
                      : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
                  )}
                >
                  <input
                    type="radio"
                    name="instructor"
                    value={instructor.id}
                    checked={selectedInstructorId === instructor.id}
                    onChange={() => onSelectInstructor(instructor.id)}
                    className="w-5 h-5 text-emerald-500 focus:ring-emerald-500 focus:ring-2"
                  />
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-sm",
                    selectedInstructorId === instructor.id
                      ? "bg-gray-900 text-white"
                      : "bg-gradient-to-br from-emerald-400 to-emerald-500 text-gray-900"
                  )}>
                    {instructor.name?.charAt(0) || 'I'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn(
                      "text-sm font-bold truncate",
                      selectedInstructorId === instructor.id ? "text-gray-900" : "text-gray-900"
                    )}>
                      {instructor.name}
                    </p>
                    <p className={cn(
                      "text-xs truncate",
                      selectedInstructorId === instructor.id ? "text-gray-900/70" : "text-gray-500"
                    )}>
                      {instructor.email}
                    </p>
                  </div>
                  {selectedInstructorId === instructor.id && (
                    <IconUserCheck className="w-5 h-5 text-gray-900" strokeWidth={2.5} />
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
              className="rounded-xl px-6 py-3 text-sm font-bold bg-gradient-to-br from-emerald-400 to-emerald-500 text-gray-900 hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-gray-900/30 border-t-gray-900 rounded-full animate-spin"></div>
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
  const [uploading, setUploading] = useState(false);
  const [enrollMode, setEnrollMode] = useState<'manual' | 'bulk'>('manual');
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const handleExport = async () => {
    try {
      await batchesApi.exportStudents(batch.id.toString());
      toast.success("Students template downloaded");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export students");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // File validation
    const validExtensions = ['.xlsx', '.xls'];
    const fileName = file.name.toLowerCase();
    if (!validExtensions.some(ext => fileName.endsWith(ext))) {
      toast.error("Invalid file format. Please upload an Excel file (.xlsx or .xls)");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const toastId = toast.loading("Uploading enrollment file...");
    try {
      setUploading(true);
      const response = await batchesApi.bulkEnroll(batch.id.toString(), file);
      toast.success(response.message || `Successfully processed enrollment`, { id: toastId });
      await onSubmit(); // Refresh batches list
    } catch (error: any) {
      console.error("Upload error:", error);
      const errorMessage = error.response?.data?.message || "Failed to upload enrollment file";
      toast.error(errorMessage, { id: toastId });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudentIds.length === 0) {
      toast.error("Please select at least one student");
      return;
    }
    
    const toastId = toast.loading("Enrolling students...");
    try {
      setLoading(true);
      await onSubmit();
      toast.success("Students enrolled successfully", { id: toastId });
    } catch (error: any) {
      console.error("Enrollment error:", error);
      const errorMessage = error.response?.data?.message || "Failed to enroll students";
      toast.error(errorMessage, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const enrolledStudentIds = batch.students?.map(s => s.id) || [];

  const filteredStudents = (students || []).filter(student => 
    student.name?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
    student.email?.toLowerCase().includes(studentSearchQuery.toLowerCase())
  );

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
        className="w-full max-w-2xl rounded-[28px] bg-white p-4 sm:p-6 md:p-8 shadow-2xl max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-start justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-400 to-blue-500 flex items-center justify-center shadow-lg">
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

        {/* Tab Toggle */}
        <div className="flex p-1 bg-gray-100 rounded-2xl mb-8">
          <button
            onClick={() => setEnrollMode('manual')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all",
              enrollMode === 'manual'
                ? "bg-white text-gray-900 shadow-md"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <IconUsers className="w-4 h-4" />
            Manual Selection
          </button>
          <button
            onClick={() => setEnrollMode('bulk')}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all",
              enrollMode === 'bulk'
                ? "bg-white text-gray-900 shadow-md"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <IconFileSpreadsheet className="w-4 h-4" />
            Bulk Upload
          </button>
        </div>

        {enrollMode === 'bulk' ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                onClick={handleExport}
                className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-violet-50 border-2 border-violet-100 hover:border-violet-200 hover:bg-violet-100 transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-violet-500 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                  <IconDownload className="w-5 h-5" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-gray-900">Download Template</p>
                  <p className="text-xs text-gray-500">Get student list with instructions</p>
                </div>
              </button>

              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex items-center justify-center gap-3 p-4 rounded-2xl bg-emerald-50 border-2 border-emerald-100 hover:border-emerald-200 hover:bg-emerald-100 transition-all group disabled:opacity-50"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform">
                  {uploading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                  ) : (
                    <IconUpload className="w-5 h-5" />
                  )}
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-gray-900">Upload Enrollment</p>
                  <p className="text-xs text-gray-500">Assign students via Excel</p>
                </div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".xlsx,.xls"
                />
              </button>
            </div>
            
            <div className="p-4 rounded-2xl bg-blue-50 border-2 border-blue-100 flex gap-3 text-sm text-blue-700">
              <IconBook className="w-5 h-5 shrink-0" />
              <p>
                <strong>Pro tip:</strong> Use the Bulk Upload for larger classes. 
                Keep only the students you want to enroll in the "Students" sheet, then upload.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Search Bar */}
            <div className="relative">
              <IconSearch className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search students by name or email..."
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-3 rounded-2xl border-2 border-gray-100 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:border-transparent transition-all"
              />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Selection Summary */}
              <div className="rounded-xl bg-gradient-to-br from-blue-400/20 to-blue-500/20 border-2 border-blue-400/30 p-4">
                <p className="text-sm font-bold text-gray-900">
                  {selectedStudentIds.length} student{selectedStudentIds.length !== 1 ? 's' : ''} selected
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  Currently enrolled: {enrolledStudentIds.length} student{enrolledStudentIds.length !== 1 ? 's' : ''}
                </p>
              </div>

              {/* Students List */}
              <div className="space-y-2 max-h-[250px] sm:max-h-[300px] md:max-h-[400px] overflow-y-auto pr-2">
                {filteredStudents.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <IconSearch className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                    <p className="font-medium">No matches found for "{studentSearchQuery}"</p>
                  </div>
                ) : (
                  filteredStudents.map((student) => {
                    const isSelected = selectedStudentIds.includes(student.id);
                    const isCurrentlyEnrolled = enrolledStudentIds.includes(student.id);

                    return (
                      <label
                        key={student.id}
                        className={cn(
                          "flex items-center gap-4 p-4 rounded-xl cursor-pointer transition-all hover:shadow-md",
                          isSelected
                            ? "bg-gradient-to-br from-blue-400 to-blue-500 border-2 border-blue-500"
                            : "bg-gray-50 border-2 border-transparent hover:bg-gray-100"
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleStudent(student.id)}
                          className="w-5 h-5 text-blue-500 focus:ring-blue-500 focus:ring-2 rounded"
                        />
                        <div className={cn(
                          "w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold shadow-sm",
                          isSelected
                            ? "bg-white text-blue-500"
                            : "bg-gradient-to-br from-blue-400 to-blue-500 text-white"
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
                            <div className="w-3 h-3 bg-blue-500 rounded"></div>
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
                  className="rounded-xl px-6 py-3 text-sm font-bold bg-gradient-to-br from-blue-400 to-blue-500 text-white hover:shadow-lg hover:scale-105 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 flex items-center gap-2"
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
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
