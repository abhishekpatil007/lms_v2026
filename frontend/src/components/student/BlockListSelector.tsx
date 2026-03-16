
import { useEffect, useState } from "react";
import { IconClock, IconPlayerPlay, IconCheck, IconLoader } from "@tabler/icons-react";
import { testsApi } from "@/api/endpoints/tests";
import { attemptsApi } from "@/api/endpoints/attempts";
import { motion } from "framer-motion";

export const BlockListSelector = ({ testId, onStartBlock, attemptId }: { testId: number, onStartBlock: (id: number) => void, attemptId: number }) => {
    const [blocks, setBlocks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [completedBlockIds, setCompletedBlockIds] = useState<number[]>([]);

    useEffect(() => {
        const load = async () => {
            try {
                const testData = await testsApi.getById(testId);
                setBlocks(testData.blocks || []);

                const attemptData = await attemptsApi.resume(testId);
                const completed = attemptData.attempt.blocks
                    .filter((b: any) => b.status === 'completed')
                    .map((b: any) => b.block_id);
                setCompletedBlockIds(completed);

            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [testId]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
                <IconLoader className="w-8 h-8 text-violet-500 animate-spin" />
                <p className="text-sm text-gray-400 font-medium">Loading sections...</p>
            </div>
        );
    }

    const completedCount = completedBlockIds.length;
    const totalCount = blocks.length;
    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

    return (
        <div className="space-y-6">
            {/* Progress indicator */}
            <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold text-gray-700">
                        Completed {completedCount} of {totalCount} sections
                    </span>
                    <span className="text-xs font-bold text-violet-600 bg-violet-50 px-2.5 py-1 rounded-full">
                        {progressPercent}%
                    </span>
                </div>
                <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-violet-400"
                        initial={{ width: 0 }}
                        animate={{ width: `${progressPercent}%` }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                    />
                </div>
            </div>

            {/* Block list with sequential flow */}
            <div className="relative">
                {blocks.map((block, index) => {
                    const isCompleted = completedBlockIds.includes(block.id);
                    const sectionNumber = index + 1;
                    const isLast = index === blocks.length - 1;

                    return (
                        <div key={block.id} className="relative flex gap-4">
                            {/* Sequential step indicator column */}
                            <div className="flex flex-col items-center pt-1">
                                {/* Step number circle */}
                                <div
                                    className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ring-4 ${
                                        isCompleted
                                            ? "bg-green-500 text-white ring-green-100"
                                            : "bg-violet-500 text-white ring-violet-100"
                                    }`}
                                >
                                    {isCompleted ? <IconCheck size={16} strokeWidth={3} /> : sectionNumber}
                                </div>
                                {/* Connecting dotted line */}
                                {!isLast && (
                                    <div className="w-px flex-1 min-h-6 border-l-2 border-dashed border-gray-200 my-1" />
                                )}
                            </div>

                            {/* Block card */}
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.35, delay: index * 0.08, ease: "easeOut" }}
                                className={`flex-1 mb-4 p-5 rounded-2xl border-2 flex items-center justify-between transition-all ${
                                    isCompleted
                                        ? "bg-gray-50 border-l-green-400 border-t-gray-100 border-r-gray-100 border-b-gray-100 opacity-70"
                                        : "bg-white border-l-violet-400 border-t-gray-100 border-r-gray-100 border-b-gray-100 hover:border-violet-200 hover:shadow-lg shadow-sm"
                                }`}
                            >
                                <div className="space-y-1.5">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                        Section {sectionNumber}
                                    </p>
                                    <h3 className="font-semibold text-gray-800 text-base">{block.title}</h3>
                                    <div className="flex items-center gap-1.5 text-sm text-gray-500">
                                        <IconClock size={15} className="text-gray-400" />
                                        <span className="font-medium">{block.duration_minutes} mins</span>
                                    </div>
                                </div>

                                {isCompleted ? (
                                    <div className="flex items-center gap-2 text-green-600 font-medium px-4 py-2 bg-green-50 rounded-xl text-sm">
                                        <IconCheck size={17} />
                                        <span>Completed</span>
                                    </div>
                                ) : (
                                    <button
                                        onClick={() => onStartBlock(block.id)}
                                        className="flex items-center gap-2 bg-violet-600 text-white px-5 py-2.5 rounded-xl font-medium hover:bg-violet-700 transition-colors shadow-sm hover:shadow-md text-sm"
                                    >
                                        <span>Start</span>
                                        <IconPlayerPlay size={17} />
                                    </button>
                                )}
                            </motion.div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
