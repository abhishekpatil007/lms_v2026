import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { evaluationApi } from "@/api/endpoints/evaluation";
import { IconArrowLeft, IconCheck, IconX } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

export const EvaluationGradingPage = () => {
    const { attemptId } = useParams<{ attemptId: string }>();
    const navigate = useNavigate();
    const [attempt, setAttempt] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [grades, setGrades] = useState<{ [key: string]: { marks: number; comment: string } }>({});
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
                        initialGrades[ans.id] = { marks: 0, comment: '' };
                    }
                });
                setGrades(initialGrades);
            } catch (error) {
                console.error("Error fetching attempt:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAttempt();
    }, [attemptId]);

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
        if (!confirm("Submit evaluation? This will finalize the score.")) return;

        setSubmitting(true);
        try {
            const scores = Object.entries(grades).map(([ansId, grade]) => ({
                answer_id: parseInt(ansId),
                marks_awarded: Number(grade.marks),
                comment: grade.comment
            }));

            await evaluationApi.submitScore(parseInt(attemptId!), scores);
            alert("Evaluation submitted successfully!");
            navigate('/instructor/evaluations');
        } catch (error) {
            console.error("Error submitting evaluation:", error);
            alert("Failed to submit evaluation");
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Loading Attempt...</div>;

    // Filter only manual evaluation questions (Short Answer / File Upload) or show all for context?
    // Usually manual grading is needed for non-auto types. 
    // Postman response "Get Attempt Details" shows all answers including MCQs (evaluated).
    // The instructor might want to see context, but only grade pending ones.
    const manualGradingNeeded = attempt?.answers?.filter((a: any) => !a.is_evaluated);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="max-w-5xl mx-auto">
                <button
                    onClick={() => navigate('/instructor/evaluations')}
                    className="flex items-center gap-2 text-gray-600 mb-6 hover:text-gray-900"
                >
                    <IconArrowLeft size={20} /> Back to List
                </button>

                <div className="bg-white rounded-[24px] shadow-sm p-8 mb-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-2xl font-bold text-gray-900">{attempt.test?.title}</h1>
                            <p className="text-gray-500">Student: {attempt.user_id} (Fetch name if needed or backend sends it)</p>
                        </div>
                        <button
                            onClick={handleSubmitEvaluation}
                            disabled={submitting || manualGradingNeeded.length === 0}
                            className="bg-blue-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            {submitting ? 'Submitting...' : 'Submit Evaluation'}
                        </button>
                    </div>

                    <div className="space-y-8">
                        {attempt.answers?.map((ans: any, idx: number) => (
                            <div key={ans.id} className={cn("p-6 rounded-2xl border", ans.is_evaluated ? "bg-gray-50 border-gray-200 opacity-75" : "bg-white border-blue-100 shadow-sm")}>
                                <div className="flex justify-between mb-4">
                                    <span className="font-bold text-gray-500 text-sm">Question {idx + 1} ({ans.question.type})</span>
                                    <span className="text-sm font-medium text-gray-600">Max Marks: {ans.question.marks}</span>
                                </div>

                                <p className="text-lg font-medium text-gray-900 mb-4">{ans.question.content}</p>

                                {/* Student Answer Display */}
                                <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
                                    <p className="text-xs font-bold text-gray-500 uppercase mb-2">Student Answer</p>
                                    {ans.question.type === 'SHORT_ANSWER' && <p className="text-gray-800 whitespace-pre-wrap">{ans.text_answer || "No answer provided"}</p>}
                                    {ans.question.type === 'FILE_UPLOAD' && (
                                        ans.file_url ? (
                                            <a href={ans.file_url} target="_blank" rel="noreferrer" className="text-blue-600 underline flex items-center gap-2">
                                                View Attached File
                                            </a>
                                        ) : <p className="text-gray-400 italic">No file uploaded</p>
                                    )}
                                    {ans.question.type === 'MCQ' && <p className="text-gray-800">Selected Option ID: {ans.selected_option_id} (Auto-graded)</p>}
                                </div>

                                {/* Grading Section (Only for pending) */}
                                {!ans.is_evaluated && (ans.question.type === 'SHORT_ANSWER' || ans.question.type === 'FILE_UPLOAD') ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/30 p-4 rounded-xl">
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Marks Awarded</label>
                                            <input
                                                type="number"
                                                max={ans.question.marks}
                                                min={0}
                                                value={grades[ans.id]?.marks || 0}
                                                onChange={(e) => handleGradeChange(ans.id, 'marks', e.target.value)}
                                                className="w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-1">Feedback / Comment</label>
                                            <input
                                                type="text"
                                                value={grades[ans.id]?.comment || ''}
                                                onChange={(e) => handleGradeChange(ans.id, 'comment', e.target.value)}
                                                placeholder="Good work..."
                                                className="w-full rounded-lg border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4 text-sm text-gray-600 border-t pt-4">
                                        <span>Marks: <strong>{ans.marks_awarded}</strong> / {ans.question.marks}</span>
                                        {ans.evaluator_comment && <span>Comment: <em>{ans.evaluator_comment}</em></span>}
                                        <span className="ml-auto text-green-600 font-medium flex items-center gap-1">
                                            <IconCheck size={16} /> Evaluated
                                        </span>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};
