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
} from "@tabler/icons-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { testsApi } from "@/api/endpoints/tests";
import type { Test } from "@/types";

export const TestBuilderPage = () => {
    const { testId } = useParams<{ testId: string }>();
    const navigate = useNavigate();
    const [test, setTest] = useState<Test | null>(null);
    const [loading, setLoading] = useState(true);
    const [showAddBlock, setShowAddBlock] = useState(false);
    const [newBlockTitle, setNewBlockTitle] = useState("");
    const [newBlockDuration, setNewBlockDuration] = useState(60);
    const [showAddQuestion, setShowAddQuestion] = useState<string | null>(null); // blockId
    const [questionData, setQuestionData] = useState({
        content: "",
        type: "MCQ" as "MCQ" | "SHORT_ANSWER" | "FILE_UPLOAD",
        marks: 1,
        reference_image: null as File | null,
        model_answer: "",
        options: [
            { content: "", is_correct: false, media: null as File | null },
            { content: "", is_correct: false, media: null as File | null },
            { content: "", is_correct: false, media: null as File | null },
            { content: "", is_correct: false, media: null as File | null },
        ],
    });

    useEffect(() => {
        if (testId) {
            fetchTestDetails();
        }
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
        } catch (error) {
            console.error("Error adding block:", error);
            alert("Failed to add block");
        }
    };

    const handleAddQuestion = async (blockId: string) => {
        if (!questionData.content.trim()) return;

        // Validate MCQ options
        if (questionData.type === 'MCQ') {
            const hasCorrectOption = questionData.options.some(opt => opt.is_correct);
            if (!hasCorrectOption) {
                alert("Please select at least one correct option for MCQ");
                return;
            }
        }

        try {
            const formData = new FormData();
            formData.append('content', questionData.content);
            formData.append('type', questionData.type);
            formData.append('marks', String(questionData.marks));
            formData.append('order_index', '0');

            if (questionData.reference_image) {
                formData.append('reference_media', questionData.reference_image);
            }

            if (questionData.type === 'MCQ') {
                // Prepare options with has_media flag
                const optionsToSend = questionData.options.map(opt => ({
                    content: opt.content,
                    is_correct: opt.is_correct,
                    order_index: 0, // Backend handles order if needed, or we can pass it
                    has_media: !!opt.media
                }));
                formData.append('options', JSON.stringify(optionsToSend));

                // Append option images
                questionData.options.forEach((opt) => {
                    if (opt.media) {
                        formData.append('option_media', opt.media);
                    }
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
                reference_image: null,
                model_answer: "",
                options: [
                    { content: "", is_correct: false, media: null },
                    { content: "", is_correct: false, media: null },
                    { content: "", is_correct: false, media: null },
                    { content: "", is_correct: false, media: null },
                ],
            });
            fetchTestDetails();
        } catch (error) {
            console.error("Error adding question:", error);
            alert("Failed to add question");
        }
    };

    const handlePublishTest = async () => {
        if (!confirm("Are you sure you want to publish this test? Students will be able to see it immediately.")) return;
        try {
            await testsApi.publish(parseInt(testId!));
            fetchTestDetails();
            alert("Test published successfully!");
        } catch (error) {
            console.error("Error publishing test:", error);
            alert("Failed to publish test");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#E8E6E1]">
                <div className="text-gray-500 text-lg">Loading test builder...</div>
            </div>
        );
    }

    if (!test) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-[#E8E6E1]">
                <div className="text-gray-500 text-lg">Test not found</div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#E8E6E1] p-6">
            {/* Header */}
            <div className="max-w-5xl mx-auto mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
                >
                    <IconArrowLeft className="w-5 h-5" strokeWidth={2} />
                    <span className="font-medium">Back</span>
                </button>

                <div className="flex items-center justify-between rounded-[24px] bg-white p-6 shadow-lg">
                    <div>
                        <div className="flex items-center gap-3 mb-1">
                            <h1 className="text-3xl font-bold text-gray-900">{test.title}</h1>
                            <span className={cn(
                                "px-3 py-1 rounded-full text-xs font-semibold",
                                test.status === 'published' ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-700"
                            )}>
                                {test.status.toUpperCase()}
                            </span>
                        </div>
                        <p className="text-gray-500">{test.description}</p>
                    </div>
                    <div className="flex gap-3">
                        {test.status !== 'published' && (
                            <button
                                onClick={handlePublishTest}
                                className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 transition-all shadow-md"
                            >
                                <IconCheck className="w-4 h-4" strokeWidth={2.5} />
                                Publish Test
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* Blocks & Questions */}
            <div className="max-w-5xl mx-auto space-y-6">
                {(test.blocks || []).map((block, blockIdx) => (
                    <motion.div
                        key={block.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: blockIdx * 0.1 }}
                        className="rounded-[24px] bg-white p-6 shadow-lg"
                    >
                        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
                            <div className="flex items-center gap-3">
                                <div className="cursor-move text-gray-400 hover:text-gray-600">
                                    <IconGripVertical className="w-5 h-5" />
                                </div>
                                <h2 className="text-xl font-bold text-gray-900">{block.title}</h2>
                                <span className="text-sm text-gray-500">
                                    ({block.questions?.length || 0} questions)
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* Add block actions here if needed */}
                            </div>
                        </div>

                        {/* Questions List */}
                        <div className="space-y-4 mb-6">
                            {(block.questions || []).map((question) => (
                                <div key={question.id} className="rounded-xl bg-gray-50 p-4 border border-gray-100">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-700 text-xs font-semibold">
                                                    {question.type}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    {question.marks} marks
                                                </span>
                                            </div>
                                            <p className="text-gray-900 font-medium mb-3">{question.content}</p>

                                            {question.model_answer && (
                                                <div className="mb-3 p-3 bg-green-50 rounded-lg border border-green-100">
                                                    <span className="text-xs font-semibold text-green-700 uppercase tracking-wider">Model Answer</span>
                                                    <p className="text-sm text-green-800 mt-1">{question.model_answer}</p>
                                                </div>
                                            )}

                                            {question.reference_media_url && (
                                                <div className="mb-3">
                                                    <img
                                                        src={question.reference_media_url}
                                                        alt="Question Reference"
                                                        className="max-h-48 rounded-lg border border-gray-200"
                                                    />
                                                </div>
                                            )}

                                            {question.type === 'MCQ' && (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                    {question.options?.map((opt, oIdx) => (
                                                        <div
                                                            key={oIdx}
                                                            className={cn(
                                                                "px-3 py-2 rounded-lg text-sm border",
                                                                opt.is_correct
                                                                    ? "bg-green-50 border-green-200 text-green-800"
                                                                    : "bg-white border-gray-200 text-gray-600"
                                                            )}
                                                        >
                                                            {opt.content}
                                                            {opt.media_url && (
                                                                <img src={opt.media_url} alt="Option" className="mt-2 h-20 rounded border" />
                                                            )}
                                                            {opt.is_correct && <IconCheck className="inline-block w-3 h-3 ml-2" />}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <button className="text-gray-400 hover:text-red-500 transition-colors">
                                            <IconTrash className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Add Question Form */}
                        {showAddQuestion === String(block.id) ? (
                            <div className="rounded-xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-6">
                                <div className="flex justify-between items-center mb-4">
                                    <h3 className="font-semibold text-blue-900">New Question</h3>
                                    <button onClick={() => setShowAddQuestion(null)} className="text-gray-400 hover:text-gray-600">
                                        <IconX className="w-5 h-5" />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Question Text</label>
                                        <textarea
                                            value={questionData.content}
                                            onChange={(e) => setQuestionData({ ...questionData, content: e.target.value })}
                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            rows={2}
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Reference Image (Optional)</label>
                                        <div className="flex items-center gap-3">
                                            <label className="cursor-pointer flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-colors">
                                                <IconPhoto className="w-5 h-5 text-gray-500" />
                                                <span className="text-sm text-gray-600">
                                                    {questionData.reference_image ? questionData.reference_image.name : "Upload Image"}
                                                </span>
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    className="hidden"
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            setQuestionData({ ...questionData, reference_image: file });
                                                        }
                                                    }}
                                                />
                                            </label>
                                            {questionData.reference_image && (
                                                <button
                                                    onClick={() => setQuestionData({ ...questionData, reference_image: null })}
                                                    className="text-red-500 hover:text-red-700"
                                                >
                                                    <IconX className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                                            <select
                                                value={questionData.type}
                                                onChange={(e) => setQuestionData({ ...questionData, type: e.target.value as any })}
                                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            >
                                                <option value="MCQ">Multiple Choice</option>
                                                <option value="SHORT_ANSWER">Short Answer</option>
                                                <option value="FILE_UPLOAD">File Upload (Image Answer)</option>
                                            </select>
                                        </div>
                                        <div className="w-32">
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Marks</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={questionData.marks}
                                                onChange={(e) => setQuestionData({ ...questionData, marks: parseInt(e.target.value) || 1 })}
                                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                            />
                                        </div>
                                    </div>

                                    {questionData.type === 'SHORT_ANSWER' && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Model Answer (Optional)</label>
                                            <textarea
                                                value={questionData.model_answer}
                                                onChange={(e) => setQuestionData({ ...questionData, model_answer: e.target.value })}
                                                className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                                                rows={3}
                                                placeholder="Enter the expected answer or key points..."
                                            />
                                        </div>
                                    )}

                                    {questionData.type === 'MCQ' && (
                                        <div className="space-y-2">
                                            <label className="block text-sm font-medium text-gray-700">Options</label>
                                            {questionData.options.map((opt, idx) => (
                                                <div key={idx} className="flex gap-2 items-center">
                                                    <input
                                                        type="radio"
                                                        name="correct_option"
                                                        checked={opt.is_correct}
                                                        onChange={() => {
                                                            const newOptions = [...questionData.options];
                                                            newOptions.forEach(o => o.is_correct = false);
                                                            newOptions[idx].is_correct = true;
                                                            setQuestionData({ ...questionData, options: newOptions });
                                                        }}
                                                        className="text-blue-600 focus:ring-blue-500"
                                                    />
                                                    <div className="flex-1 space-y-2">
                                                        <input
                                                            type="text"
                                                            value={opt.content}
                                                            onChange={(e) => {
                                                                const newOptions = [...questionData.options];
                                                                newOptions[idx].content = e.target.value;
                                                                setQuestionData({ ...questionData, options: newOptions });
                                                            }}
                                                            placeholder={`Option ${idx + 1} `}
                                                            className="w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                                                        />
                                                        <div className="flex items-center gap-2">
                                                            <label className="cursor-pointer flex items-center gap-1 px-2 py-1 rounded border border-gray-200 bg-gray-50 hover:bg-gray-100 text-xs text-gray-600">
                                                                <IconPhoto className="w-3 h-3" />
                                                                {opt.media ? "Change Image" : "Add Image"}
                                                                <input
                                                                    type="file"
                                                                    accept="image/*"
                                                                    className="hidden"
                                                                    onChange={(e) => {
                                                                        const file = e.target.files?.[0];
                                                                        if (file) {
                                                                            const newOptions = [...questionData.options];
                                                                            newOptions[idx].media = file;
                                                                            setQuestionData({ ...questionData, options: newOptions });
                                                                        }
                                                                    }}
                                                                />
                                                            </label>
                                                            {opt.media && (
                                                                <div className="flex items-center gap-1">
                                                                    <span className="text-xs text-blue-600 truncate max-w-[100px]">{opt.media.name}</span>
                                                                    <button
                                                                        onClick={() => {
                                                                            const newOptions = [...questionData.options];
                                                                            newOptions[idx].media = null;
                                                                            setQuestionData({ ...questionData, options: newOptions });
                                                                        }}
                                                                        className="text-red-500 hover:text-red-700"
                                                                    >
                                                                        <IconX className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex justify-end pt-2">
                                        <button
                                            onClick={() => handleAddQuestion(String(block.id))}
                                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                                        >
                                            Save Question
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <button
                                onClick={() => setShowAddQuestion(String(block.id))}
                                className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50 transition-all flex items-center justify-center gap-2 font-medium"
                            >
                                <IconPlus className="w-5 h-5" />
                                Add Question
                            </button>
                        )}
                    </motion.div>
                ))}

                {/* Add Block Section */}
                {showAddBlock ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="rounded-[24px] bg-white p-6 shadow-lg border-2 border-blue-100"
                    >
                        <h3 className="text-lg font-bold text-gray-900 mb-4">Add New Section</h3>
                        <div className="flex gap-3">
                            <input
                                type="text"
                                value={newBlockTitle}
                                onChange={(e) => setNewBlockTitle(e.target.value)}
                                placeholder="Section Title (e.g., 'Mathematics', 'Logical Reasoning')"
                                className="flex-1 rounded-xl border-gray-200 bg-gray-50 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                autoFocus
                            />
                            <div className="w-32">
                                <input
                                    type="number"
                                    min="1"
                                    value={newBlockDuration}
                                    onChange={(e) => setNewBlockDuration(parseInt(e.target.value) || 0)}
                                    placeholder="Mins"
                                    className="w-full rounded-xl border-gray-200 bg-gray-50 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    title="Duration in minutes"
                                />
                            </div>
                            <button
                                onClick={handleAddBlock}
                                className="rounded-xl bg-blue-600 px-6 py-2.5 font-semibold text-white hover:bg-blue-700 transition-colors"
                            >
                                Add
                            </button>
                            <button
                                onClick={() => setShowAddBlock(false)}
                                className="rounded-xl bg-gray-100 px-6 py-2.5 font-semibold text-gray-600 hover:bg-gray-200 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <button
                        onClick={() => setShowAddBlock(true)}
                        className="w-full py-4 rounded-[24px] bg-white/50 border-2 border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 hover:bg-white transition-all flex items-center justify-center gap-2 font-semibold text-lg"
                    >
                        <IconPlus className="w-6 h-6" />
                        Add New Section
                    </button>
                )}
            </div>
        </div>
    );
};
