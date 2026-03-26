import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    IconArrowLeft,
    IconGripVertical,
    IconCheck,
    IconTrash,
    IconX,
    IconPlus,
    IconPhoto,
    IconClipboardList,
    IconClock,
    IconSend,
    IconHash,
    IconFileText,
    IconUpload,
    IconListCheck,
} from "@tabler/icons-react";
import { motion } from "framer-motion";
import toast from "react-hot-toast";
import { cn } from "@/lib/utils";
import { testsApi } from "@/api/endpoints/tests";
import type { Test } from "@/types";

const questionTypeConfig: Record<string, { label: string; icon: React.ReactNode; color: string }> = {
    MCQ: { label: "Multiple Choice", icon: <IconListCheck size={13} />, color: "bg-blue-50 text-blue-600 ring-blue-200" },
    SHORT_ANSWER: { label: "Written", icon: <IconFileText size={13} />, color: "bg-purple-50 text-purple-600 ring-purple-200" },
    FILE_UPLOAD: { label: "File Upload", icon: <IconUpload size={13} />, color: "bg-amber-50 text-amber-600 ring-amber-200" },
};

export const TestBuilderPage = () => {
    const { testId } = useParams<{ testId: string }>();
    const navigate = useNavigate();
    const [test, setTest] = useState<Test | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAddBlock, setShowAddBlock] = useState(false);
    const [newBlockTitle, setNewBlockTitle] = useState("");
    const [newBlockDuration, setNewBlockDuration] = useState(60);
    const [showAddQuestion, setShowAddQuestion] = useState<string | null>(null);
    const [questionData, setQuestionData] = useState({
        content: "",
        type: "MCQ" as "MCQ" | "SHORT_ANSWER" | "FILE_UPLOAD",
        marks: 1,
        reference_images: [] as File[],
        model_answer: "",
        options: [
            { content: "", is_correct: false, media: null as File | null },
            { content: "", is_correct: false, media: null as File | null },
            { content: "", is_correct: false, media: null as File | null },
            { content: "", is_correct: false, media: null as File | null },
        ],
    });

    useEffect(() => {
        if (testId) fetchTestDetails();
    }, [testId]);

    const fetchTestDetails = async () => {
        try {
            setLoading(true);
            const data = await testsApi.getById(parseInt(testId!));
            setTest(data);
        } catch (error) {
            console.error("Error fetching test details:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddBlock = async () => {
        if (!newBlockTitle.trim()) return;
        try {
            await testsApi.addBlock(parseInt(testId!), {
                title: newBlockTitle,
                duration_minutes: newBlockDuration,
                order_index: (test?.blocks?.length || 0) + 1,
            });
            setNewBlockTitle("");
            setNewBlockDuration(60);
            setShowAddBlock(false);
            fetchTestDetails();
            toast.success('Section added');
        } catch (error) {
            console.error("Error adding block:", error);
            toast.error('Failed to add section');
        }
    };

    const handleAddQuestion = async (blockId: string) => {
        if (!questionData.content.trim()) return;

        if (questionData.type === 'MCQ') {
            const hasCorrectOption = questionData.options.some(opt => opt.is_correct);
            if (!hasCorrectOption) {
                toast.error("Select at least one correct option");
                return;
            }
        }

        try {
            const formData = new FormData();
            formData.append('content', questionData.content);
            formData.append('type', questionData.type);
            formData.append('marks', String(questionData.marks));
            formData.append('order_index', '0');

            questionData.reference_images.forEach(file => {
                formData.append('reference_media', file);
            });

            if (questionData.type === 'MCQ') {
                const optionsToSend = questionData.options.map(opt => ({
                    content: opt.content,
                    is_correct: opt.is_correct,
                    order_index: 0,
                    has_media: !!opt.media
                }));
                formData.append('options', JSON.stringify(optionsToSend));
                questionData.options.forEach((opt) => {
                    if (opt.media) formData.append('option_media', opt.media);
                });
            }

            if (questionData.type === 'SHORT_ANSWER' && questionData.model_answer) {
                formData.append('model_answer', questionData.model_answer);
            }

            await testsApi.addQuestion(parseInt(blockId), formData);
            setShowAddQuestion(null);
            setQuestionData({
                content: "",
                type: "MCQ",
                marks: 1,
                reference_images: [],
                model_answer: "",
                options: [
                    { content: "", is_correct: false, media: null },
                    { content: "", is_correct: false, media: null },
                    { content: "", is_correct: false, media: null },
                    { content: "", is_correct: false, media: null },
                ],
            });
            fetchTestDetails();
            toast.success('Question added');
        } catch (error) {
            console.error("Error adding question:", error);
            toast.error('Failed to add question');
        }
    };

    const handleDeleteQuestion = async (questionId: number) => {
        if (!window.confirm('Delete this question? This cannot be undone.')) return;
        try {
            toast.success('Question deleted');
            fetchTestDetails();
        } catch (error) {
            console.error("Error deleting question:", error);
            toast.error('Failed to delete question');
        }
    };

    const handlePublishTest = async () => {
        if (!window.confirm('Publish this test? Students will be able to see and attempt it.')) return;
        try {
            await testsApi.publish(parseInt(testId!));
            fetchTestDetails();
            toast.success('Test published!');
        } catch (error) {
            console.error("Error publishing test:", error);
            toast.error('Failed to publish test');
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
                <div className="flex flex-col items-center gap-3">
                    <div className="relative h-10 w-10">
                        <div className="h-10 w-10 rounded-full border-[3px] border-gray-200" />
                        <div className="absolute inset-0 h-10 w-10 animate-spin rounded-full border-[3px] border-transparent border-t-violet-500" />
                    </div>
                    <p className="text-sm text-gray-500">Loading builder...</p>
                </div>
            </div>
        );
    }

    if (!test) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 to-gray-100">
                <p className="text-gray-500 text-lg">Test not found</p>
            </div>
        );
    }

    const totalBlocks = (test.blocks || []).length;
    const totalQuestions = (test.blocks || []).reduce((sum, b) => sum + (b.questions?.length || 0), 0);
    const totalMarks = (test.blocks || []).reduce((sum, b) => sum + (b.questions || []).reduce((qSum, q) => qSum + (q.marks || 0), 0), 0);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/20">
            {/* Sticky Header */}
            <div className="sticky top-0 z-10 border-b border-gray-100 bg-white/80 backdrop-blur-xl">
                <div className="max-w-5xl mx-auto px-4 sm:px-6">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-all"
                            >
                                <IconArrowLeft size={20} />
                            </button>
                            <div className="min-w-0">
                                <div className="flex items-center gap-2.5">
                                    <h1 className="text-lg font-bold text-gray-900 truncate">{test.title}</h1>
                                    <span className={cn(
                                        "shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider",
                                        test.status === 'published' ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200" : "bg-gray-100 text-gray-500 ring-1 ring-gray-200"
                                    )}>
                                        {test.status}
                                    </span>
                                </div>
                                {totalBlocks > 0 && (
                                    <p className="text-xs text-gray-400">
                                        {totalBlocks} {totalBlocks === 1 ? 'section' : 'sections'} · {totalQuestions} {totalQuestions === 1 ? 'question' : 'questions'} · {totalMarks} marks
                                    </p>
                                )}
                            </div>
                        </div>
                        {test.status !== 'published' && (
                            <button
                                onClick={handlePublishTest}
                                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-200/50 hover:shadow-lg transition-all"
                            >
                                <IconSend size={16} />
                                Publish
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-6">
                {/* Test Description */}
                {test.description && (
                    <div className="rounded-xl bg-white border border-gray-100 px-5 py-3.5 text-sm text-gray-500 shadow-sm">
                        {test.description}
                    </div>
                )}

                {/* Empty State */}
                {totalBlocks === 0 && !showAddBlock && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border-2 border-dashed border-gray-200 bg-white/50 py-20 text-center"
                    >
                        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-violet-100 text-violet-500">
                            <IconClipboardList size={32} />
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1">Start building your test</h3>
                        <p className="text-gray-500 mb-6">Add your first section to begin</p>
                        <button
                            onClick={() => setShowAddBlock(true)}
                            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-6 py-3 text-sm font-semibold text-white shadow-md shadow-violet-200/50 hover:shadow-lg transition-all"
                        >
                            <IconPlus size={18} />
                            Add First Section
                        </button>
                    </motion.div>
                )}

                {/* Blocks */}
                {(test.blocks || []).map((block, blockIdx) => {
                    const blockMarks = (block.questions || []).reduce((s, q) => s + (q.marks || 0), 0);
                    return (
                        <motion.div
                            key={block.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: blockIdx * 0.08 }}
                            className="rounded-2xl border border-gray-100 bg-white shadow-sm overflow-hidden"
                        >
                            {/* Block Header */}
                            <div className="flex items-center justify-between gap-4 border-b border-gray-50 bg-gradient-to-r from-gray-50/80 to-white px-6 py-4">
                                <div className="flex items-center gap-3 min-w-0">
                                    <div className="cursor-move text-gray-300 hover:text-gray-500 transition-colors">
                                        <IconGripVertical size={18} />
                                    </div>
                                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 font-bold text-sm">
                                        {blockIdx + 1}
                                    </div>
                                    <div className="min-w-0">
                                        <h2 className="font-bold text-gray-900 truncate">{block.title}</h2>
                                        <div className="flex items-center gap-2 text-xs text-gray-400">
                                            <span>{block.questions?.length || 0} questions</span>
                                            <span>·</span>
                                            <span>{blockMarks} marks</span>
                                            {block.duration_minutes && (
                                                <>
                                                    <span>·</span>
                                                    <span className="flex items-center gap-0.5"><IconClock size={10} />{block.duration_minutes}m</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Questions */}
                            <div className="p-4 space-y-3">
                                {(block.questions || []).map((question, qIdx) => {
                                    const qType = questionTypeConfig[question.type] || questionTypeConfig.MCQ;
                                    return (
                                        <div key={question.id} className="group rounded-xl border border-gray-100 bg-gray-50/50 p-4 hover:border-gray-200 transition-all">
                                            <div className="flex items-start gap-3">
                                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white border border-gray-200 text-xs font-bold text-gray-500 mt-0.5">
                                                    {qIdx + 1}
                                                </span>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ring-1 ring-inset", qType.color)}>
                                                            {qType.icon}
                                                            {qType.label}
                                                        </span>
                                                        <span className="inline-flex items-center gap-0.5 rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500">
                                                            <IconHash size={10} />
                                                            {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
                                                        </span>
                                                    </div>
                                                    <p className="text-sm font-medium text-gray-900 leading-relaxed">{question.content}</p>

                                                    {question.model_answer && (
                                                        <div className="mt-3 rounded-lg border border-emerald-100 bg-emerald-50/50 p-3">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Model Answer</span>
                                                            <p className="text-sm text-emerald-800 mt-0.5">{question.model_answer}</p>
                                                        </div>
                                                    )}

                                                    {question.reference_media_url && (() => {
                                                        let urls: string[] = [];
                                                        try { urls = JSON.parse(question.reference_media_url); } catch { urls = [question.reference_media_url]; }
                                                        return urls.length > 0 ? (
                                                            <div className="mt-3 flex flex-wrap gap-2">
                                                                {urls.map((url: string, i: number) => (
                                                                    <img key={i} src={url} alt={`Reference ${i + 1}`} className="max-h-40 rounded-lg border border-gray-200" />
                                                                ))}
                                                            </div>
                                                        ) : null;
                                                    })()}

                                                    {question.type === 'MCQ' && (
                                                        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                            {question.options?.map((opt, oIdx) => (
                                                                <div
                                                                    key={oIdx}
                                                                    className={cn(
                                                                        "flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm",
                                                                        opt.is_correct
                                                                            ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                                                            : "border-gray-100 bg-white text-gray-600"
                                                                    )}
                                                                >
                                                                    <span className={cn(
                                                                        "flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-bold",
                                                                        opt.is_correct ? "bg-emerald-200 text-emerald-700" : "bg-gray-100 text-gray-400"
                                                                    )}>
                                                                        {String.fromCharCode(65 + oIdx)}
                                                                    </span>
                                                                    <span className="truncate">{opt.content}</span>
                                                                    {opt.media_url && <img src={opt.media_url} alt="Option" className="h-8 rounded border ml-auto" />}
                                                                    {opt.is_correct && <IconCheck size={14} className="ml-auto shrink-0 text-emerald-600" />}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                <button
                                                    onClick={() => handleDeleteQuestion(question.id)}
                                                    className="shrink-0 flex h-7 w-7 items-center justify-center rounded-lg text-gray-300 opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
                                                    title="Delete question"
                                                >
                                                    <IconTrash size={14} />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* Add Question Form */}
                                {showAddQuestion === String(block.id) ? (
                                    <motion.div
                                        initial={{ opacity: 0, y: 8 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="rounded-xl border-2 border-violet-200 bg-violet-50/30 p-5"
                                    >
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                                <IconPlus size={16} className="text-violet-500" />
                                                New Question
                                            </h3>
                                            <button onClick={() => setShowAddQuestion(null)} className="text-gray-400 hover:text-gray-600 transition-colors">
                                                <IconX size={18} />
                                            </button>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Question Text</label>
                                                <textarea
                                                    value={questionData.content}
                                                    onChange={(e) => setQuestionData({ ...questionData, content: e.target.value })}
                                                    className="w-full rounded-xl border-2 border-gray-100 bg-white px-4 py-3 text-sm leading-relaxed text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-violet-300 focus:ring-4 focus:ring-violet-100 resize-none"
                                                    rows={3}
                                                    placeholder="Enter the question text..."
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Reference Images</label>
                                                <div className="space-y-2">
                                                    <label className="cursor-pointer flex items-center gap-2 rounded-lg border border-dashed border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                                                        <IconPhoto size={16} className="text-gray-400" />
                                                        Add Images
                                                        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => {
                                                            const files = Array.from(e.target.files || []);
                                                            if (files.length > 0) setQuestionData({ ...questionData, reference_images: [...questionData.reference_images, ...files] });
                                                            e.target.value = '';
                                                        }} />
                                                    </label>
                                                    {questionData.reference_images.length > 0 && (
                                                        <div className="flex flex-wrap gap-2">
                                                            {questionData.reference_images.map((file, idx) => (
                                                                <div key={idx} className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs">
                                                                    <img src={URL.createObjectURL(file)} alt="" className="w-8 h-8 rounded object-cover" />
                                                                    <span className="max-w-[100px] truncate">{file.name}</span>
                                                                    <button onClick={() => setQuestionData({ ...questionData, reference_images: questionData.reference_images.filter((_, i) => i !== idx) })} className="text-red-400 hover:text-red-600 ml-1">
                                                                        <IconX size={14} />
                                                                    </button>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex gap-3">
                                                <div className="flex-1">
                                                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Type</label>
                                                    <select
                                                        value={questionData.type}
                                                        onChange={(e) => setQuestionData({ ...questionData, type: e.target.value as any })}
                                                        className="w-full rounded-xl border-2 border-gray-100 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-violet-300 focus:ring-4 focus:ring-violet-100 cursor-pointer"
                                                    >
                                                        <option value="MCQ">Multiple Choice</option>
                                                        <option value="SHORT_ANSWER">Short Answer</option>
                                                        <option value="FILE_UPLOAD">File Upload</option>
                                                    </select>
                                                </div>
                                                <div className="w-28">
                                                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Marks</label>
                                                    <input
                                                        type="number"
                                                        min="1"
                                                        value={questionData.marks}
                                                        onChange={(e) => setQuestionData({ ...questionData, marks: parseInt(e.target.value) || 1 })}
                                                        className="w-full rounded-xl border-2 border-gray-100 bg-white px-4 py-2.5 text-sm outline-none transition-all focus:border-violet-300 focus:ring-4 focus:ring-violet-100"
                                                    />
                                                </div>
                                            </div>

                                            {questionData.type === 'SHORT_ANSWER' && (
                                                <div>
                                                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">Model Answer</label>
                                                    <textarea
                                                        value={questionData.model_answer}
                                                        onChange={(e) => setQuestionData({ ...questionData, model_answer: e.target.value })}
                                                        className="w-full rounded-xl border-2 border-gray-100 bg-white px-4 py-3 text-sm leading-relaxed text-gray-900 placeholder-gray-400 outline-none transition-all focus:border-violet-300 focus:ring-4 focus:ring-violet-100 resize-none"
                                                        rows={3}
                                                        placeholder="Expected answer or key points..."
                                                    />
                                                </div>
                                            )}

                                            {questionData.type === 'MCQ' && (
                                                <div className="space-y-2.5">
                                                    <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500">Options (select correct answer)</label>
                                                    {questionData.options.map((opt, idx) => (
                                                        <div key={idx} className="flex items-start gap-3">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    const newOptions = [...questionData.options];
                                                                    newOptions.forEach(o => o.is_correct = false);
                                                                    newOptions[idx].is_correct = true;
                                                                    setQuestionData({ ...questionData, options: newOptions });
                                                                }}
                                                                className={cn(
                                                                    "mt-2.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition-all",
                                                                    opt.is_correct
                                                                        ? "bg-emerald-500 text-white shadow-sm shadow-emerald-200"
                                                                        : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                                                                )}
                                                            >
                                                                {String.fromCharCode(65 + idx)}
                                                            </button>
                                                            <div className="flex-1 space-y-1.5">
                                                                <input
                                                                    type="text"
                                                                    value={opt.content}
                                                                    onChange={(e) => {
                                                                        const newOptions = [...questionData.options];
                                                                        newOptions[idx].content = e.target.value;
                                                                        setQuestionData({ ...questionData, options: newOptions });
                                                                    }}
                                                                    placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                                                                    className={cn(
                                                                        "w-full rounded-lg border-2 bg-white px-3 py-2 text-sm outline-none transition-all focus:ring-4",
                                                                        opt.is_correct
                                                                            ? "border-emerald-200 focus:border-emerald-300 focus:ring-emerald-100"
                                                                            : "border-gray-100 focus:border-violet-300 focus:ring-violet-100"
                                                                    )}
                                                                />
                                                                <div className="flex items-center gap-2">
                                                                    <label className="cursor-pointer flex items-center gap-1 rounded border border-gray-200 bg-white px-2 py-0.5 text-[10px] font-medium text-gray-500 hover:bg-gray-50">
                                                                        <IconPhoto size={11} />
                                                                        {opt.media ? "Change" : "Image"}
                                                                        <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                                                                            const file = e.target.files?.[0];
                                                                            if (file) {
                                                                                const newOptions = [...questionData.options];
                                                                                newOptions[idx].media = file;
                                                                                setQuestionData({ ...questionData, options: newOptions });
                                                                            }
                                                                        }} />
                                                                    </label>
                                                                    {opt.media && (
                                                                        <div className="flex items-center gap-1">
                                                                            <span className="text-[10px] text-violet-600 truncate max-w-[80px]">{opt.media.name}</span>
                                                                            <button onClick={() => {
                                                                                const newOptions = [...questionData.options];
                                                                                newOptions[idx].media = null;
                                                                                setQuestionData({ ...questionData, options: newOptions });
                                                                            }} className="text-red-400 hover:text-red-600">
                                                                                <IconX size={11} />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}

                                            <div className="flex justify-end gap-2 pt-2">
                                                <button
                                                    onClick={() => setShowAddQuestion(null)}
                                                    className="rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={() => handleAddQuestion(String(block.id))}
                                                    className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200/50 hover:shadow-lg transition-all"
                                                >
                                                    Save Question
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                ) : (
                                    <button
                                        onClick={() => setShowAddQuestion(String(block.id))}
                                        className="w-full rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/30 py-3.5 text-sm font-medium text-gray-400 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50/30 transition-all flex items-center justify-center gap-2"
                                    >
                                        <IconPlus size={16} />
                                        Add Question
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    );
                })}

                {/* Add Block */}
                {showAddBlock ? (
                    <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-2xl border-2 border-violet-200 bg-white p-6 shadow-sm"
                    >
                        <h3 className="font-bold text-gray-900 mb-4">New Section</h3>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={newBlockTitle}
                                onChange={(e) => setNewBlockTitle(e.target.value)}
                                placeholder="Section name (e.g. Mathematics)"
                                className="flex-1 rounded-xl border-2 border-gray-100 bg-gray-50/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-violet-300 focus:ring-4 focus:ring-violet-100 focus:bg-white"
                                autoFocus
                            />
                            <div className="w-28">
                                <input
                                    type="number"
                                    min="1"
                                    value={newBlockDuration}
                                    onChange={(e) => setNewBlockDuration(parseInt(e.target.value) || 0)}
                                    placeholder="Minutes"
                                    className="w-full rounded-xl border-2 border-gray-100 bg-gray-50/50 px-4 py-2.5 text-sm outline-none transition-all focus:border-violet-300 focus:ring-4 focus:ring-violet-100 focus:bg-white"
                                    title="Duration in minutes"
                                />
                            </div>
                            <button
                                onClick={handleAddBlock}
                                className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-violet-200/50 hover:shadow-lg transition-all"
                            >
                                Add
                            </button>
                            <button
                                onClick={() => setShowAddBlock(false)}
                                className="rounded-xl border border-gray-200 px-5 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <button
                        onClick={() => setShowAddBlock(true)}
                        className="w-full rounded-2xl border-2 border-dashed border-gray-200 bg-white/50 py-5 text-gray-400 hover:border-violet-300 hover:text-violet-600 hover:bg-violet-50/20 transition-all flex items-center justify-center gap-2 font-semibold"
                    >
                        <IconPlus size={20} />
                        Add Section
                    </button>
                )}
            </div>
        </div>
    );
};
