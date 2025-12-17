import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
    IconSchool,
    IconChecklist,
    IconClock,
    IconArrowRight,
    IconSearch,
    IconFilter,
    IconTrophy,
    IconPlayerPlay
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { testsApi } from "@/api/endpoints/tests";
import { batchesApi } from "@/api/endpoints/batches";
import { attemptsApi } from "@/api/endpoints/attempts";
import type { Test, Batch } from "@/types";

export const StudentTestsPage = () => {
    const navigate = useNavigate();
    const [tests, setTests] = useState<Test[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);
    const [attempts, setAttempts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedBatchId, setSelectedBatchId] = useState<string>("all");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [testsData, batchesData, attemptsData] = await Promise.all([
                testsApi.list(),
                batchesApi.getStudentBatches(),
                attemptsApi.getMyAttempts()
            ]);
            setTests(testsData.tests);
            setBatches(batchesData.batches);
            setAttempts(attemptsData);
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    };

    const getTestStatus = (testId: number) => {
        const attempt = attempts.find(a => a.test_id === testId);
        if (!attempt) return { status: 'not_started', attempt: null };
        return { status: attempt.status, attempt };
    };

    const filteredTests = tests.filter((test) => {
        const matchesSearch = test.title.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesBatch = selectedBatchId === "all" || test.batch_id === selectedBatchId;
        return matchesSearch && matchesBatch;
    });

    return (
        <div className="px-4 sm:px-0">
            {/* Welcome Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">
                    My Tests
                </h1>
                <p className="text-lg text-gray-500">
                    View and take your assigned tests
                </p>
            </motion.div>

            {/* Filters */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-8 flex flex-col md:flex-row gap-4"
            >
                <div className="relative flex-1">
                    <IconSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
                    <input
                        type="text"
                        placeholder="Search tests..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full rounded-xl border-0 bg-white py-3 pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20"
                    />
                </div>
                <div className="relative w-full md:w-64">
                    <IconFilter className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
                    <select
                        value={selectedBatchId}
                        onChange={(e) => setSelectedBatchId(e.target.value)}
                        className="w-full rounded-xl border-0 bg-white py-3 pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20 cursor-pointer appearance-none"
                    >
                        <option value="all">All Batches</option>
                        {batches.map(batch => (
                            <option key={batch.id} value={batch.id}>{batch.batch_name}</option>
                        ))}
                    </select>
                </div>
            </motion.div>

            {/* Tests Grid */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="text-gray-500 text-lg">Loading tests...</div>
                </div>
            ) : filteredTests.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex flex-col items-center justify-center h-64 rounded-[28px] bg-white shadow-lg"
                >
                    <IconChecklist className="w-16 h-16 text-gray-300 mb-4" strokeWidth={1.5} />
                    <p className="text-gray-900 font-semibold text-lg mb-1">No tests found</p>
                    <p className="text-gray-500 text-sm">You don't have any assigned tests matching your filters</p>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {filteredTests.map((test, idx) => {
                        const { status, attempt } = getTestStatus(test.id);

                        return (
                            <motion.div
                                key={test.id}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: idx * 0.05 }}
                                className="rounded-[24px] bg-white p-6 shadow-lg hover:shadow-xl transition-all group"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#60A5FA] to-[#3B82F6] flex items-center justify-center text-white shadow-md">
                                        <IconChecklist className="w-6 h-6" strokeWidth={2} />
                                    </div>
                                    <span className={cn(
                                        "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold",
                                        status === 'completed' ? "bg-green-100 text-green-700" :
                                            status === 'in_progress' ? "bg-blue-100 text-blue-700" :
                                                "bg-gray-100 text-gray-700"
                                    )}>
                                        <span className={cn("w-1.5 h-1.5 rounded-full",
                                            status === 'completed' ? "bg-green-500" :
                                                status === 'in_progress' ? "bg-blue-500" :
                                                    "bg-gray-500"
                                        )}></span>
                                        {status === 'not_started' ? 'Not Started' :
                                            status === 'in_progress' ? 'In Progress' : 'Completed'}
                                    </span>
                                </div>

                                <h3 className="text-xl font-bold text-gray-900 mb-2 line-clamp-1">
                                    {test.title}
                                </h3>

                                <div className="mb-4 space-y-2">
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <IconSchool className="w-4 h-4" strokeWidth={2} />
                                        <span>{test.batch?.batch_name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                        <IconClock className="w-4 h-4" strokeWidth={2} />
                                        <span>{test.duration_minutes} mins</span>
                                    </div>
                                    {attempt && attempt.score !== null && (
                                        <div className="flex items-center gap-2 text-sm text-green-600 font-bold">
                                            <IconTrophy className="w-4 h-4" strokeWidth={2} />
                                            <span>Score: {attempt.score}/{attempt.total_marks}</span>
                                        </div>
                                    )}
                                </div>

                                {status === 'completed' ? (
                                    <button
                                        className="w-full flex items-center justify-center gap-2 rounded-xl bg-green-600 py-3 text-sm font-semibold text-white hover:bg-green-700 transition-all"
                                        onClick={() => navigate(`/student/tests/${attempt.id}/result`)}
                                    >
                                        View Result
                                        <IconArrowRight className="w-4 h-4" strokeWidth={2} />
                                    </button>
                                ) : (
                                    <button
                                        className={cn(
                                            "w-full flex items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-white transition-all",
                                            status === 'in_progress' ? "bg-blue-600 hover:bg-blue-700" : "bg-[#2D2D2D] hover:bg-[#2D2D2D]/90"
                                        )}
                                        onClick={() => navigate(`/student/tests/${test.id}/take`)}
                                    >
                                        {status === 'in_progress' ? 'Resume Test' : 'Start Test'}
                                        <IconPlayerPlay className="w-4 h-4" strokeWidth={2} />
                                    </button>
                                )}
                            </motion.div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
