import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { IconSearch, IconEdit, IconClock, IconChecklist, IconCheck } from "@tabler/icons-react";
import { motion } from "framer-motion";
import { evaluationApi } from "@/api/endpoints/evaluation";

const ALL_TESTS = "__all__";

function timeAgoLabel(dateStr: string) {
    const now = new Date();
    const then = new Date(dateStr);
    const diffMs = now.getTime() - then.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffDays > 0) return `Submitted ${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
    if (diffHours > 0) return `Submitted ${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
    return "Submitted just now";
}

function daysAgo(dateStr: string) {
    const now = new Date();
    const then = new Date(dateStr);
    return Math.floor((now.getTime() - then.getTime()) / (1000 * 60 * 60 * 24));
}

export const InstructorEvaluationsPage = () => {
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState("");
    const [pendingAttempts, setPendingAttempts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedTest, setSelectedTest] = useState(ALL_TESTS);

    useEffect(() => {
        fetchPendingEvaluations();
    }, []);

    const fetchPendingEvaluations = async () => {
        try {
            setLoading(true);
            const data = await evaluationApi.getPending();
            setPendingAttempts(data);
        } catch (error) {
            console.error("Error fetching evaluations:", error);
        } finally {
            setLoading(false);
        }
    };

    const uniqueTests = useMemo(() => {
        const map = new Map<string, string>();
        (pendingAttempts || []).forEach((a) => {
            if (a.test?.title) map.set(a.test.id ?? a.test.title, a.test.title);
        });
        return Array.from(map.entries()); // [id, title]
    }, [pendingAttempts]);

    const filteredAttempts = useMemo(() => {
        return (pendingAttempts || []).filter((attempt) => {
            const matchesSearch =
                attempt.test?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                attempt.student?.name?.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesTest =
                selectedTest === ALL_TESTS ||
                (attempt.test?.id ?? attempt.test?.title) === selectedTest;
            return matchesSearch && matchesTest;
        });
    }, [pendingAttempts, searchQuery, selectedTest]);

    const totalPending = (pendingAttempts || []).length;
    const uniqueTestCount = uniqueTests.length;

    if (loading) {
        return (
            <div className="flex flex-1 items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
                    <p className="text-sm text-gray-500">Loading evaluations...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex flex-1 overflow-auto">
            <div className="flex h-full w-full flex-1 flex-col gap-6 p-3 sm:p-4 md:p-7">
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="mb-2"
                >
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                        Pending Evaluations
                    </h1>
                    <p className="text-lg text-gray-500">
                        Grade student submissions and provide feedback.
                    </p>
                </motion.div>

                {/* Stats Header */}
                <div className="grid grid-cols-2 sm:grid-cols-2 gap-4">
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.1 }}
                        className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 md:p-5 shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-violet-100 flex items-center justify-center">
                                <IconEdit className="w-5 h-5 text-violet-600" strokeWidth={2} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{totalPending}</p>
                                <p className="text-xs text-gray-500">Pending Evaluations</p>
                            </div>
                        </div>
                    </motion.div>
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                        className="rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 md:p-5 shadow-sm"
                    >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center">
                                <IconChecklist className="w-5 h-5 text-rose-600" strokeWidth={2} />
                            </div>
                            <div>
                                <p className="text-2xl font-bold text-gray-900">{uniqueTestCount}</p>
                                <p className="text-xs text-gray-500">Unique Tests</p>
                            </div>
                        </div>
                    </motion.div>
                </div>

                <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 md:p-6 shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center">
                                <IconEdit className="w-5 h-5 sm:w-7 sm:h-7 text-white" strokeWidth={2} />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-gray-900">Submissions</h2>
                                <p className="mt-0.5 text-xs text-gray-500">
                                    {filteredAttempts.length} pending
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="relative mb-4">
                        <IconSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
                        <input
                            type="text"
                            placeholder="Search by test or student name..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-xl border-0 bg-gray-50 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                        />
                    </div>

                    {/* Filter by test */}
                    {uniqueTests.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-6">
                            <button
                                onClick={() => setSelectedTest(ALL_TESTS)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                                    selectedTest === ALL_TESTS
                                        ? "bg-violet-600 text-white"
                                        : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                }`}
                            >
                                All Tests
                            </button>
                            {uniqueTests.map(([id, title]) => (
                                <button
                                    key={id}
                                    onClick={() => setSelectedTest(id)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors truncate max-w-[200px] ${
                                        selectedTest === id
                                            ? "bg-violet-600 text-white"
                                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                    }`}
                                >
                                    {title}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {filteredAttempts.map((attempt) => {
                            const age = daysAgo(attempt.createdAt);
                            const isUrgent = age >= 5;
                            const isWarning = age >= 3 && age < 5;
                            return (
                                <motion.div
                                    key={attempt.id}
                                    whileHover={{ scale: 1.02, y: -2 }}
                                    className={`p-3 sm:p-4 md:p-5 rounded-2xl border transition-all cursor-pointer hover:shadow-lg ${
                                        isUrgent
                                            ? "bg-red-50 border-red-200"
                                            : isWarning
                                            ? "bg-amber-50 border-amber-200"
                                            : "bg-gray-50 border-gray-100"
                                    }`}
                                    onClick={() => navigate(`/instructor/evaluations/${attempt.id}`)}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="bg-white p-2 rounded-lg shadow-sm text-xs font-bold text-gray-700">
                                            Attempt #{attempt.id}
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <IconClock
                                                className={`w-3.5 h-3.5 ${
                                                    isUrgent
                                                        ? "text-red-500"
                                                        : isWarning
                                                        ? "text-amber-500"
                                                        : "text-gray-400"
                                                }`}
                                                strokeWidth={2}
                                            />
                                            <span
                                                className={`text-xs font-medium ${
                                                    isUrgent
                                                        ? "text-red-600"
                                                        : isWarning
                                                        ? "text-amber-600"
                                                        : "text-gray-500"
                                                }`}
                                            >
                                                {timeAgoLabel(attempt.createdAt)}
                                            </span>
                                        </div>
                                    </div>

                                    <h3 className="font-bold text-lg text-gray-900 mb-1 leading-tight">
                                        {attempt.test?.title}
                                    </h3>

                                    {/* Test metadata */}
                                    {(attempt.test?.duration || attempt.test?.questionCount) && (
                                        <div className="flex items-center gap-3 mb-2">
                                            {attempt.test?.duration && (
                                                <span className="text-xs text-gray-400">
                                                    {attempt.test.duration} min
                                                </span>
                                            )}
                                            {attempt.test?.questionCount && (
                                                <span className="text-xs text-gray-400">
                                                    {attempt.test.questionCount} questions
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-6 h-6 rounded-full bg-violet-100 flex items-center justify-center text-xs font-bold text-violet-700">
                                            {attempt.student?.name?.charAt(0)}
                                        </div>
                                        <span className="text-sm text-gray-500 truncate">{attempt.student?.name}</span>
                                    </div>

                                    <button className="w-full py-2 bg-violet-600 text-white rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors">
                                        Evaluate Now
                                    </button>
                                </motion.div>
                            );
                        })}
                    </div>

                    {!loading && filteredAttempts.length === 0 && totalPending === 0 && (
                        <div className="flex flex-col items-center justify-center py-16">
                            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                                <IconCheck className="w-8 h-8 text-green-600" strokeWidth={2} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 mb-1">All caught up!</h3>
                            <p className="text-sm text-gray-500">No pending evaluations.</p>
                        </div>
                    )}

                    {!loading && filteredAttempts.length === 0 && totalPending > 0 && (
                        <div className="text-center py-10 text-gray-500">
                            No evaluations match your current filters.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
