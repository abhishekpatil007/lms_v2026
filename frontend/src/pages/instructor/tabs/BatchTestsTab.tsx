
import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
    IconPlus,
    IconClipboardCheck,
    IconFileText,
    IconClock,
    IconDotsVertical
} from "@tabler/icons-react";
import { testsApi } from "../../../api/endpoints/tests";
import { evaluationApi } from "../../../api/endpoints/evaluation";
import { cn } from "../../../lib/utils";
import type { Test } from "@/types";
import { CreateTestModal } from "../../../components/instructor/CreateTestModal";
import { TestManagerModal } from "../../../components/instructor/TestManagerModal";
import { EvaluationModal } from "../../../components/instructor/EvaluationModal";

interface BatchTestsTabProps {
    batchId: string;
}

export const BatchTestsTab: React.FC<BatchTestsTabProps> = ({ batchId }) => {
    const [tests, setTests] = useState<Test[]>([]);
    const [pendingEvaluations, setPendingEvaluations] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [manageTestId, setManageTestId] = useState<number | null>(null);
    const [evaluateAttemptId, setEvaluateAttemptId] = useState<number | null>(null);

    useEffect(() => {
        fetchData();
    }, [batchId]);

    const fetchData = async () => {
        try {
            setIsLoading(true);
            const [testsData, evaluationsData] = await Promise.all([
                testsApi.list({ batch_id: batchId }),
                evaluationApi.getPending(undefined)
            ]);

            setTests(testsData.tests || []);
            setPendingEvaluations(evaluationsData || []);
        } catch (error) {
            console.error("Failed to fetch tests data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="space-y-8">
            {/* Header Actions */}
            <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-gray-800">Tests & Evaluations</h3>
                <button
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors shadow-md"
                    onClick={() => setShowCreateModal(true)}
                >
                    <IconPlus className="w-5 h-5" />
                    <span>Create Test</span>
                </button>
            </div>

            {/* Pending Evaluations Section */}
            {pendingEvaluations.length > 0 && (
                <section>
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-1.5 bg-yellow-100 rounded-lg">
                            <IconClipboardCheck className="w-5 h-5 text-yellow-600" />
                        </div>
                        <h4 className="text-lg font-semibold text-gray-700">Pending Evaluations</h4>
                        <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs font-bold rounded-full">
                            {pendingEvaluations.length}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {pendingEvaluations.map((attempt) => (
                            <div key={attempt.id} className="bg-white p-4 rounded-xl border border-yellow-200 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <div className="font-semibold text-gray-800">{attempt.student?.name || "Student"}</div>
                                        <div className="text-sm text-gray-500">{attempt.test?.title || "Test"}</div>
                                    </div>
                                    <span className="px-2 py-1 bg-yellow-50 text-yellow-700 text-xs font-medium rounded-lg border border-yellow-100">
                                        Needs Grading
                                    </span>
                                </div>
                                <button
                                    className="w-full mt-2 py-2 text-sm font-medium text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded-lg transition-colors"
                                    onClick={() => setEvaluateAttemptId(attempt.id)}
                                >
                                    Grade Attempt
                                </button>
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* All Tests List */}
            <section>
                <div className="flex items-center gap-2 mb-4">
                    <div className="p-1.5 bg-gray-100 rounded-lg">
                        <IconFileText className="w-5 h-5 text-gray-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-700">All Tests</h4>
                </div>

                {isLoading ? (
                    <div className="text-center py-10 text-gray-500">Loading tests...</div>
                ) : tests.length === 0 ? (
                    <div className="text-center py-10 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                        <p className="text-gray-500 font-medium">No tests created for this batch yet.</p>
                        <button
                            className="mt-2 text-indigo-600 font-semibold hover:underline"
                            onClick={() => setShowCreateModal(true)}
                        >
                            Create your first test
                        </button>
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {tests.map((test) => (
                            <div key={test.id} className="group bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className={cn(
                                        "w-12 h-12 rounded-xl flex items-center justify-center text-xl font-bold",
                                        test.status === 'published' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
                                    )}>
                                        {test.title.charAt(0)}
                                    </div>
                                    <div>
                                        <h5 className="font-bold text-gray-800 group-hover:text-indigo-600 transition-colors">
                                            {test.title}
                                        </h5>
                                        <div className="flex items-center gap-4 mt-1 text-sm text-gray-500">
                                            <span className="flex items-center gap-1">
                                                <IconClock className="w-4 h-4" />
                                                {test.duration_minutes} mins
                                            </span>
                                            <span className={cn(
                                                "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
                                                test.status === 'published' ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-600"
                                            )}>
                                                {test.status === 'published' ? "Published" : "Draft"}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-indigo-600 hover:bg-gray-50 rounded-lg transition-colors"
                                        onClick={() => setManageTestId(test.id)}
                                    >
                                        Manage
                                    </button>
                                    <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                                        <IconDotsVertical className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <CreateTestModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                batchId={batchId}
                onSuccess={() => {
                    fetchData();
                }}
            />
            <TestManagerModal
                isOpen={!!manageTestId}
                onClose={() => setManageTestId(null)}
                testId={manageTestId || 0}
            />
            <EvaluationModal
                isOpen={!!evaluateAttemptId}
                onClose={() => setEvaluateAttemptId(null)}
                attemptId={evaluateAttemptId || 0}
                onSuccess={() => {
                    fetchData();
                }}
            />
        </div>
    );
};
