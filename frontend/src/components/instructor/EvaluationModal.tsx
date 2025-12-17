
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconX, IconCheck, IconExternalLink } from "@tabler/icons-react";
import toast from "react-hot-toast";
import { evaluationApi } from "../../api/endpoints/evaluation";
import { cn } from "../../lib/utils";

interface EvaluationModalProps {
    isOpen: boolean;
    onClose: () => void;
    attemptId: number;
    onSuccess: () => void;
}

export const EvaluationModal: React.FC<EvaluationModalProps> = ({ isOpen, onClose, attemptId, onSuccess }) => {
    const [attempt, setAttempt] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [scores, setScores] = useState<Record<number, { marks: number, comment: string }>>({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen && attemptId) {
            fetchAttempt();
        }
    }, [isOpen, attemptId]);

    const fetchAttempt = async () => {
        try {
            setLoading(true);
            const data = await evaluationApi.getAttempt(attemptId);
            setAttempt(data);

            // Initialize scores with existing marks or defaults
            const initialScores: any = {};
            data.answers?.forEach((ans: any) => {
                initialScores[ans.id] = {
                    marks: ans.marks_awarded || 0,
                    comment: ans.evaluator_comment || ""
                };
            });
            setScores(initialScores);
        } catch (error) {
            console.error("Failed to fetch attempt:", error);
            toast.error("Failed to load attempt details");
        } finally {
            setLoading(false);
        }
    };

    const handleScoreChange = (answerId: number, field: 'marks' | 'comment', value: any) => {
        setScores(prev => ({
            ...prev,
            [answerId]: {
                ...prev[answerId],
                [field]: value
            }
        }));
    };

    const handleSubmit = async () => {
        setSubmitting(true);
        try {
            const payload = Object.entries(scores).map(([answerId, score]) => ({
                answer_id: Number(answerId),
                marks_awarded: Number(score.marks),
                comment: score.comment
            }));

            await evaluationApi.submitScore(attemptId, payload);
            toast.success("Evaluation submitted successfully!");
            onSuccess();
            onClose();
        } catch (error) {
            console.error("Failed to submit evaluation:", error);
            toast.error("Failed to submit evaluation");
        } finally {
            setSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-4xl bg-white rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="bg-yellow-500 p-6 flex justify-between items-center text-white">
                        <div>
                            <h2 className="text-2xl font-bold">Evaluate Attempt</h2>
                            <div className="text-yellow-100 text-sm mt-1">
                                {attempt?.student?.name} • {attempt?.test?.title}
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                            <IconX className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                        {loading ? (
                            <div className="flex justify-center items-center h-full text-gray-500">Loading attempt...</div>
                        ) : (
                            <div className="space-y-6">
                                {attempt?.answers?.map((answer: any, index: number) => (
                                    <div key={answer.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                                        <div className="flex justify-between mb-4">
                                            <span className="font-bold text-gray-500">Question {index + 1}</span>
                                            <span className="text-sm font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                                Max Marks: {answer.question?.marks}
                                            </span>
                                        </div>

                                        <div className="mb-4">
                                            <h4 className="text-lg font-medium text-gray-900 mb-2">{answer.question?.content}</h4>
                                            {answer.question?.type === 'MCQ' && (
                                                <div className="ml-4 space-y-1">
                                                    {answer.question.options?.map((opt: any) => (
                                                        <div key={opt.id} className={cn(
                                                            "text-sm p-2 rounded",
                                                            opt.is_correct ? "bg-green-50 text-green-700 border border-green-200" : "text-gray-600",
                                                            answer.selected_option_id === opt.id && !opt.is_correct ? "bg-red-50 text-red-700 border border-red-200" : ""
                                                        )}>
                                                            {opt.content} {opt.is_correct && "(Correct)"} {answer.selected_option_id === opt.id && "(Selected)"}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-4">
                                            <div className="text-xs font-bold text-blue-700 uppercase mb-1">Student Answer</div>
                                            {answer.question?.type === 'MCQ' ? (
                                                <div className="text-gray-800 font-medium">
                                                    {answer.selected_option_id ? (
                                                        answer.question.options?.find((o: any) => o.id === answer.selected_option_id)?.content || "Option Selected"
                                                    ) : "Not Answered"}
                                                </div>
                                            ) : answer.file_url ? (
                                                <a
                                                    href={answer.file_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="flex items-center gap-2 text-blue-600 hover:underline"
                                                >
                                                    <IconExternalLink className="w-4 h-4" />
                                                    View Attached File
                                                </a>
                                            ) : (
                                                <div className="text-gray-800 whitespace-pre-wrap">{answer.text_answer || "No Answer"}</div>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-gray-50 p-4 rounded-lg">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Marks Awarded</label>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    max={answer.question?.marks}
                                                    value={scores[answer.id]?.marks || 0}
                                                    onChange={(e) => handleScoreChange(answer.id, 'marks', e.target.value)}
                                                    className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-yellow-500"
                                                />
                                            </div>
                                            <div className="md:col-span-2">
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Feedback / Comment</label>
                                                <input
                                                    type="text"
                                                    value={scores[answer.id]?.comment || ""}
                                                    onChange={(e) => handleScoreChange(answer.id, 'comment', e.target.value)}
                                                    className="w-full border rounded px-3 py-2 outline-none focus:ring-2 focus:ring-yellow-500"
                                                    placeholder="Good job, but..."
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
                        <button onClick={onClose} className="px-6 py-2 rounded-xl border border-gray-300 hover:bg-gray-100 font-medium transition-colors">
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className="px-6 py-2 rounded-xl bg-yellow-500 hover:bg-yellow-600 text-white font-bold shadow-lg transition-colors flex items-center gap-2"
                        >
                            {submitting ? "Submitting..." : (
                                <>
                                    <IconCheck className="w-5 h-5" />
                                    Submit Evaluation
                                </>
                            )}
                        </button>
                    </div>

                </motion.div>
            </div>
        </AnimatePresence>
    );
};
