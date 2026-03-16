import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { evaluationApi } from "@/api/endpoints/evaluation";
import { IconArrowLeft, IconCheck, IconX, IconDownload, IconFile } from "@tabler/icons-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

const borderColorByType: Record<string, string> = {
    SHORT_ANSWER: "border-l-violet-500",
    FILE_UPLOAD: "border-l-amber-500",
    MCQ: "border-l-green-500",
};

const badgeByType: Record<string, { bg: string; text: string }> = {
    SHORT_ANSWER: { bg: "bg-violet-100 text-violet-700", text: "Short Answer" },
    FILE_UPLOAD: { bg: "bg-amber-100 text-amber-700", text: "File Upload" },
    MCQ: { bg: "bg-green-100 text-green-700", text: "MCQ (Auto-graded)" },
};

export const EvaluationGradingPage = () => {
    const { attemptId } = useParams<{ attemptId: string }>();
    const navigate = useNavigate();
    const [attempt, setAttempt] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [grades, setGrades] = useState<{ [key: string]: { marks: number | string; comment: string } }>({});
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        const fetchAttempt = async () => {
            try {
                const data = await evaluationApi.getAttempt(parseInt(attemptId!));
                setAttempt(data);
                // Initialize grades with existing or default
                const initialGrades: any = {};
                data.answers?.forEach((ans: any) => {
                    if (!ans.is_evaluated && (ans.question.type === 'SHORT_ANSWER' || ans.question.type === 'FILE_UPLOAD')) {
                        initialGrades[ans.id] = { marks: '', comment: '' };
                    }
                });
                setGrades(initialGrades);
            } catch (error) {
                console.error("Error fetching attempt:", error);
                toast.error("Failed to load attempt details");
            } finally {
                setLoading(false);
            }
        };
        fetchAttempt();
    }, [attemptId]);

    // Derive progress info
    const { totalToGrade, gradedCount, allGraded } = useMemo(() => {
        const keys = Object.keys(grades);
        const total = keys.length;
        const graded = keys.filter(k => grades[k].marks !== '' && grades[k].marks !== undefined).length;
        return { totalToGrade: total, gradedCount: graded, allGraded: total > 0 && graded === total };
    }, [grades]);

    const progressPercent = totalToGrade > 0 ? Math.round((gradedCount / totalToGrade) * 100) : 0;
    const remaining = totalToGrade - gradedCount;

    const handleGradeChange = (answerId: number, field: 'marks' | 'comment', value: any) => {
        setGrades(prev => ({
            ...prev,
            [answerId]: {
                ...prev[answerId],
                [field]: value
            }
        }));
    };

    const handleSubmitEvaluation = async () => {
        if (!allGraded) {
            toast.error(`Please grade all questions. ${remaining} remaining.`);
            return;
        }
        if (!confirm("Submit evaluation? This will finalize the score.")) return;

        setSubmitting(true);
        try {
            const scores = Object.entries(grades).map(([ansId, grade]) => ({
                answer_id: parseInt(ansId),
                marks_awarded: Number(grade.marks),
                comment: grade.comment
            }));

            await evaluationApi.submitScore(parseInt(attemptId!), scores);
            toast.success("Evaluation submitted");
            navigate('/instructor/evaluations');
        } catch (error) {
            console.error("Error submitting evaluation:", error);
            toast.error("Failed to submit evaluation");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center space-y-3">
                    <div className="w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
                    <p className="text-gray-500 font-medium">Loading attempt...</p>
                </div>
            </div>
        );
    }

    if (!attempt) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <p className="text-gray-500">Attempt not found.</p>
            </div>
        );
    }

    const studentName = attempt.user?.name || attempt.student_name || attempt.user?.email || `User #${attempt.user_id}`;

    return (
        <div className="min-h-screen bg-gray-50 p-3 sm:p-4 md:p-6">
            <div className="max-w-5xl mx-auto">
                {/* Back button */}
                <button
                    onClick={() => navigate('/instructor/evaluations')}
                    className="flex items-center gap-2 text-gray-500 mb-6 hover:text-gray-900 transition-colors text-sm font-medium"
                >
                    <IconArrowLeft size={18} /> Back to Evaluations
                </button>

                {/* Header card */}
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                    className="bg-white rounded-2xl shadow-sm p-4 sm:p-6 md:p-8 mb-6"
                >
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{attempt.test?.title}</h1>
                            <p className="text-gray-500 mt-1">
                                Student: <span className="font-semibold text-gray-800">{studentName}</span>
                            </p>
                        </div>
                        <button
                            onClick={handleSubmitEvaluation}
                            disabled={submitting || !allGraded}
                            className={cn(
                                "px-6 py-2.5 rounded-xl font-semibold transition-all text-sm shrink-0",
                                allGraded
                                    ? "bg-violet-600 text-white hover:bg-violet-700 shadow-sm"
                                    : "bg-gray-200 text-gray-400 cursor-not-allowed"
                            )}
                        >
                            {submitting ? 'Submitting...' : 'Submit Evaluation'}
                        </button>
                    </div>

                    {/* Progress indicator */}
                    {totalToGrade > 0 && (
                        <div className="space-y-2">
                            <div className="flex justify-between items-center text-sm">
                                <span className="text-gray-600 font-medium">
                                    Graded {gradedCount} of {totalToGrade} question{totalToGrade !== 1 ? 's' : ''}
                                </span>
                                {remaining > 0 ? (
                                    <span className="text-amber-600 font-medium">{remaining} remaining</span>
                                ) : (
                                    <span className="text-green-600 font-medium flex items-center gap-1">
                                        <IconCheck size={14} /> All graded
                                    </span>
                                )}
                            </div>
                            <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-violet-500 rounded-full"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${progressPercent}%` }}
                                    transition={{ duration: 0.4, ease: "easeOut" }}
                                />
                            </div>
                        </div>
                    )}
                </motion.div>

                {/* Questions */}
                <div className="space-y-6">
                    {attempt.answers?.map((ans: any, idx: number) => {
                        const qType = ans.question.type as string;
                        const badge = badgeByType[qType] || { bg: "bg-gray-100 text-gray-700", text: qType };
                        const borderColor = borderColorByType[qType] || "border-l-gray-300";
                        const isAutoGraded = qType === 'MCQ';
                        const isEvaluated = ans.is_evaluated;

                        return (
                            <motion.div
                                key={ans.id}
                                initial={{ opacity: 0, y: 16 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.3, delay: idx * 0.05 }}
                                className={cn(
                                    "bg-white rounded-2xl border border-l-4 shadow-sm overflow-hidden",
                                    borderColor,
                                    isEvaluated && "opacity-70"
                                )}
                            >
                                <div className="p-4 sm:p-5 md:p-6">
                                    {/* Question header */}
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-sm font-bold text-gray-400">Q{idx + 1}</span>
                                            <span className={cn("text-xs font-semibold px-2.5 py-1 rounded-full", badge.bg)}>
                                                {badge.text}
                                            </span>
                                        </div>
                                        <span className="text-sm font-medium text-gray-500">
                                            Max: <span className="text-gray-800">{ans.question.marks}</span> marks
                                        </span>
                                    </div>

                                    {/* Question content */}
                                    <p className="text-base font-medium text-gray-900 mb-5 leading-relaxed">
                                        {ans.question.content}
                                    </p>

                                    {/* Student Answer */}
                                    {qType === 'SHORT_ANSWER' && (
                                        <div className="mb-5 bg-violet-50/60 border border-violet-100 rounded-xl p-4">
                                            <p className="text-xs font-bold text-violet-400 uppercase tracking-wide mb-2">Student Answer</p>
                                            {ans.text_answer ? (
                                                <blockquote className="text-gray-800 whitespace-pre-wrap leading-relaxed border-l-2 border-violet-300 pl-3">
                                                    {ans.text_answer}
                                                </blockquote>
                                            ) : (
                                                <p className="text-gray-400 italic">No answer provided</p>
                                            )}
                                        </div>
                                    )}

                                    {qType === 'FILE_UPLOAD' && (
                                        <div className="mb-5 bg-amber-50/60 border border-amber-100 rounded-xl p-4">
                                            <p className="text-xs font-bold text-amber-400 uppercase tracking-wide mb-2">Uploaded File</p>
                                            {ans.file_url ? (
                                                <a
                                                    href={ans.file_url}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="inline-flex items-center gap-2 bg-amber-100 hover:bg-amber-200 text-amber-800 font-medium text-sm px-4 py-2 rounded-lg transition-colors"
                                                >
                                                    <IconFile size={16} />
                                                    Download File
                                                    <IconDownload size={14} />
                                                </a>
                                            ) : (
                                                <p className="text-gray-400 italic">No file uploaded</p>
                                            )}
                                        </div>
                                    )}

                                    {qType === 'MCQ' && (
                                        <div className="mb-5 bg-green-50/60 border border-green-100 rounded-xl p-4">
                                            <p className="text-xs font-bold text-green-400 uppercase tracking-wide mb-2">Selected Answer</p>
                                            <div className="flex items-center gap-2">
                                                {ans.is_correct !== undefined && (
                                                    ans.is_correct ? (
                                                        <span className="flex items-center gap-1 text-green-600 font-medium text-sm">
                                                            <IconCheck size={16} /> Correct
                                                        </span>
                                                    ) : (
                                                        <span className="flex items-center gap-1 text-red-500 font-medium text-sm">
                                                            <IconX size={16} /> Incorrect
                                                        </span>
                                                    )
                                                )}
                                                <span className="text-gray-600 text-sm">
                                                    Option ID: {ans.selected_option_id}
                                                </span>
                                            </div>
                                        </div>
                                    )}

                                    {/* Grading section for unevaluated manual questions */}
                                    {!isEvaluated && !isAutoGraded ? (
                                        <div className="bg-gray-50 rounded-xl p-4 space-y-4">
                                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Grade This Answer</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                        Marks Awarded
                                                    </label>
                                                    <input
                                                        type="number"
                                                        max={ans.question.marks}
                                                        min={0}
                                                        value={grades[ans.id]?.marks ?? ''}
                                                        onChange={(e) => handleGradeChange(ans.id, 'marks', e.target.value)}
                                                        placeholder="0"
                                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-shadow"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                                        Feedback / Comment
                                                    </label>
                                                    <input
                                                        type="text"
                                                        value={grades[ans.id]?.comment || ''}
                                                        onChange={(e) => handleGradeChange(ans.id, 'comment', e.target.value)}
                                                        placeholder="Good work..."
                                                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:ring-2 focus:ring-violet-500 focus:border-violet-500 outline-none transition-shadow"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-4 text-sm text-gray-600 border-t border-gray-100 pt-4">
                                            <span>
                                                Marks: <strong className="text-gray-900">{ans.marks_awarded}</strong> / {ans.question.marks}
                                            </span>
                                            {ans.evaluator_comment && (
                                                <span className="text-gray-500">
                                                    Comment: <em>{ans.evaluator_comment}</em>
                                                </span>
                                            )}
                                            <span className="ml-auto text-green-600 font-medium flex items-center gap-1">
                                                <IconCheck size={16} /> Evaluated
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Sticky bottom bar for quick submit access */}
                {totalToGrade > 0 && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="sticky bottom-4 mt-8"
                    >
                        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-200 p-4 flex items-center justify-between">
                            <span className="text-sm text-gray-600">
                                {allGraded ? (
                                    <span className="text-green-600 font-semibold flex items-center gap-1">
                                        <IconCheck size={16} /> Ready to submit
                                    </span>
                                ) : (
                                    <span>
                                        <span className="font-semibold text-gray-800">{remaining}</span> question{remaining !== 1 ? 's' : ''} left to grade
                                    </span>
                                )}
                            </span>
                            <button
                                onClick={handleSubmitEvaluation}
                                disabled={submitting || !allGraded}
                                className={cn(
                                    "px-6 py-2 rounded-xl font-semibold text-sm transition-all",
                                    allGraded
                                        ? "bg-violet-600 text-white hover:bg-violet-700 shadow-sm"
                                        : "bg-gray-200 text-gray-400 cursor-not-allowed"
                                )}
                            >
                                {submitting ? 'Submitting...' : 'Submit Evaluation'}
                            </button>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
};
