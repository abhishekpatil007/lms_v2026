
import { useEffect, useState } from "react";
import { IconClock, IconPlayerPlay, IconCheck, IconLock } from "@tabler/icons-react";
import { testsApi } from "@/api/endpoints/tests";
import { attemptsApi } from "@/api/endpoints/attempts";

export const BlockListSelector = ({ testId, onStartBlock, attemptId }: { testId: number, onStartBlock: (id: number) => void, attemptId: number }) => {
    const [blocks, setBlocks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [completedBlockIds, setCompletedBlockIds] = useState<number[]>([]);

    useEffect(() => {
        const load = async () => {
            try {
                // Fetch Test Structure (Safe for students now)
                const testData = await testsApi.getById(testId);
                setBlocks(testData.blocks || []);

                // Fetch current attempt status to know what's done
                // Actually parent probably knows, but let's re-fetch or use props if passed.
                // For robustness, let's fetch attempt details to see "blocks" history
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

    if (loading) return <div className="p-4 text-center text-gray-400">Loading sections...</div>;

    return (
        <div className="grid gap-4">
            {blocks.map((block) => {
                const isCompleted = completedBlockIds.includes(block.id);
                // Simple logic: If not completed, it's available. 
                // Advanced: Sequential lock? 
                // For now, allow picking any unfinished block.

                return (
                    <div
                        key={block.id}
                        className={`p-4 rounded-xl border-2 flex items-center justify-between transition-all ${isCompleted
                                ? 'bg-gray-50 border-gray-100 opacity-60'
                                : 'bg-white border-gray-200 hover:border-blue-300 hover:shadow-md'
                            }`}
                    >
                        <div>
                            <h3 className="font-semibold text-gray-800">{block.title}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                                <IconClock size={16} />
                                <span>{block.duration_minutes} mins</span>
                            </div>
                        </div>

                        {isCompleted ? (
                            <div className="flex items-center gap-2 text-green-600 font-medium px-4 py-2 bg-green-50 rounded-lg">
                                <IconCheck size={18} />
                                <span>Completed</span>
                            </div>
                        ) : (
                            <button
                                onClick={() => onStartBlock(block.id)}
                                className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                                <span>Start</span>
                                <IconPlayerPlay size={18} />
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
