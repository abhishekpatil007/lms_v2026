
import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    IconX,
    IconPlus,
    IconBoxMultiple,
    IconTrash,
    IconEdit,
    IconArrowLeft,
    IconGripVertical
} from "@tabler/icons-react";
import toast from "react-hot-toast";
import { testsApi } from "../../api/endpoints/tests";
import { cn } from "../../lib/utils";
import type { Test, Block, Question } from "@/types";

interface TestManagerModalProps {
    isOpen: boolean;
    onClose: () => void;
    testId: number;
}

export const TestManagerModal: React.FC<TestManagerModalProps> = ({ isOpen, onClose, testId }) => {
    const [test, setTest] = useState<Test | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedBlockId, setExpandedBlockId] = useState<number | null>(null);

    // States for sub-modals/forms
    const [showAddBlock, setShowAddBlock] = useState(false);
    const [showAddQuestion, setShowAddQuestion] = useState<{ blockId: number } | null>(null);

    useEffect(() => {
        if (isOpen && testId) {
            fetchTestDetails();
        }
    }, [isOpen, testId]);

    const fetchTestDetails = async () => {
        try {
            setLoading(true);
            const data = await testsApi.getById(testId);
            setTest(data);
        } catch (error) {
            console.error("Failed to fetch test details:", error);
            toast.error("Failed to load test details");
        } finally {
            setLoading(false);
        }
    };

    const handlePublish = async () => {
        if (!test) return;
        try {
            await testsApi.publish(test.id);
            toast.success("Test published successfully!");
            fetchTestDetails();
        } catch (error) {
            toast.error("Failed to publish test");
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
                    className="relative w-full max-w-5xl bg-gray-50 rounded-[24px] shadow-2xl overflow-hidden flex flex-col h-[90vh]"
                >
                    {/* Header */}
                    <div className="bg-white border-b px-6 py-4 flex items-center justify-between flex-shrink-0">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                            >
                                <IconArrowLeft className="w-5 h-5 text-gray-600" />
                            </button>
                            <div>
                                <h2 className="text-xl font-bold text-gray-900">{test?.title || "Loading..."}</h2>
                                <div className="text-sm text-gray-500">
                                    {test?.blocks?.length || 0} Blocks • {test?.duration_minutes} Minutes
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {test?.status !== 'published' && (
                                <button
                                    onClick={handlePublish}
                                    className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-lg hover:bg-green-700 transition-colors"
                                >
                                    Publish Test
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6">
                        {loading ? (
                            <div className="flex items-center justify-center h-full text-gray-500">
                                Loading test structure...
                            </div>
                        ) : (
                            <div className="space-y-6 max-w-4xl mx-auto">
                                {/* Blocks List */}
                                {test?.blocks && test.blocks.length > 0 ? (
                                    test.blocks.map((block) => (
                                        <div key={block.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                            <div
                                                className="p-4 flex items-center justify-between cursor-pointer hover:bg-gray-50 transition-colors"
                                                onClick={() => setExpandedBlockId(expandedBlockId === block.id ? null : block.id)}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <IconGripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                                                    <div>
                                                        <h4 className="font-semibold text-gray-800">{block.title}</h4>
                                                        <span className="text-xs text-gray-500">{block.questions?.length || 0} Questions • {block.duration_minutes} mins</span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <button className="p-2 text-gray-400 hover:text-blue-600 rounded-lg transition-colors">
                                                        <IconEdit className="w-4 h-4" />
                                                    </button>
                                                    <button className="p-2 text-gray-400 hover:text-red-600 rounded-lg transition-colors">
                                                        <IconTrash className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>

                                            {/* Questions List (Expanded) */}
                                            <AnimatePresence>
                                                {expandedBlockId === block.id && (
                                                    <motion.div
                                                        initial={{ height: 0 }}
                                                        animate={{ height: "auto" }}
                                                        exit={{ height: 0 }}
                                                        className="overflow-hidden border-t border-gray-100 bg-gray-50/50"
                                                    >
                                                        <div className="p-4 space-y-3">
                                                            {block.questions && block.questions.length > 0 ? (
                                                                block.questions.map((q, idx) => (
                                                                    <div key={q.id} className="pl-4 pr-3 py-3 bg-white rounded-lg border border-gray-200 flex items-start justify-between">
                                                                        <div className="flex gap-3">
                                                                            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold flex items-center justify-center mt-0.5">
                                                                                {idx + 1}
                                                                            </span>
                                                                            <div>
                                                                                <div className="text-sm font-medium text-gray-900">{q.content}</div>
                                                                                <div className="flex gap-2 mt-1">
                                                                                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">{q.type}</span>
                                                                                    <span className="text-xs px-2 py-0.5 bg-gray-100 rounded text-gray-600">{q.marks} Marks</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                ))
                                                            ) : (
                                                                <div className="text-center py-6 text-sm text-gray-500 italic">
                                                                    No questions in this block yet.
                                                                </div>
                                                            )}

                                                            <button
                                                                className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm font-semibold text-gray-500 hover:border-indigo-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setShowAddQuestion({ blockId: block.id });
                                                                }}
                                                            >
                                                                <IconPlus className="w-4 h-4" />
                                                                Add Question
                                                            </button>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
                                        <IconBoxMultiple className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                                        <h3 className="text-lg font-medium text-gray-900">No Blocks Added</h3>
                                        <p className="text-gray-500 mb-6">Start by adding a section (block) to your test.</p>
                                        <button
                                            onClick={() => setShowAddBlock(true)}
                                            className="px-6 py-2.5 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg"
                                        >
                                            Add First Block
                                        </button>
                                    </div>
                                )}

                                {test?.blocks && test.blocks.length > 0 && (
                                    <button
                                        onClick={() => setShowAddBlock(true)}
                                        className="w-full py-4 bg-white border-2 border-dashed border-gray-300 rounded-xl text-gray-500 font-semibold hover:border-indigo-500 hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"
                                    >
                                        <IconPlus className="w-5 h-5" />
                                        Add Another Block
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </motion.div>

                {/* Sub-Modals Placeholders */}
                {showAddBlock && (
                    <AddBlockModal
                        isOpen={showAddBlock}
                        onClose={() => setShowAddBlock(false)}
                        testId={testId}
                        onSuccess={() => {
                            fetchTestDetails();
                            setShowAddBlock(false);
                        }}
                    />
                )}

                {showAddQuestion && (
                    <AddQuestionModal
                        isOpen={!!showAddQuestion}
                        onClose={() => setShowAddQuestion(null)}
                        blockId={showAddQuestion.blockId}
                        onSuccess={() => {
                            fetchTestDetails();
                            setShowAddQuestion(null);
                        }}
                    />
                )}
            </div>
        </AnimatePresence>
    );
};

// --- Sub Components (Internal for now, extract if large) ---

const AddBlockModal = ({ isOpen, onClose, testId, onSuccess }: any) => {
    const [title, setTitle] = useState("");
    const [duration, setDuration] = useState(30);
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await testsApi.addBlock(testId, {
                title,
                duration_minutes: Number(duration),
                order_index: 0 // Backend handles order usually or send length + 1
            });
            toast.success("Block added!");
            onSuccess();
        } catch (error) {
            toast.error("Failed to add block");
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
                <h3 className="text-lg font-bold mb-4">Add New Block</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Block Title</label>
                        <input
                            value={title} onChange={e => setTitle(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="e.g. Physics Section A" required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                        <input
                            type="number" value={duration} onChange={e => setDuration(Number(e.target.value))}
                            className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                            min="1" required
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                            {loading ? "Adding..." : "Add Block"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

const AddQuestionModal = ({ isOpen, onClose, blockId, onSuccess }: any) => {
    const [content, setContent] = useState("");
    const [marks, setMarks] = useState(1);
    const [type, setType] = useState<"MCQ" | "SHORT_ANSWER">("MCQ");
    const [options, setOptions] = useState([{ content: "", is_correct: false }]);
    const [loading, setLoading] = useState(false);

    const handleAddOption = () => setOptions([...options, { content: "", is_correct: false }]);
    const handleOptionChange = (idx: number, field: string, value: any) => {
        const newOpts = [...options];
        // @ts-ignore
        newOpts[idx][field] = value;
        setOptions(newOpts);
    };
    const handleRemoveOption = (idx: number) => {
        setOptions(options.filter((_, i) => i !== idx));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const formData = new FormData();
            formData.append('content', content);
            formData.append('type', type);
            formData.append('marks', String(marks));
            formData.append('order_index', '1'); // Simplified
            if (type === 'MCQ') {
                formData.append('options', JSON.stringify(options.map((o, i) => ({ ...o, order_index: i + 1 }))));
            }

            await testsApi.addQuestion(blockId, formData);
            toast.success("Question added!");
            onSuccess();
        } catch (error) {
            toast.error("Failed to add question");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl p-6 max-h-[85vh] overflow-y-auto">
                <h3 className="text-lg font-bold mb-4">Add New Question</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Question Content</label>
                        <textarea
                            value={content} onChange={e => setContent(e.target.value)}
                            className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                            placeholder="Type your question here..." rows={3} required
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1">Type</label>
                            <select
                                value={type} onChange={e => setType(e.target.value as any)}
                                className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                            >
                                <option value="MCQ">Multiple Choice</option>
                                <option value="SHORT_ANSWER">Short Answer</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1">Marks</label>
                            <input
                                type="number" value={marks} onChange={e => setMarks(Number(e.target.value))}
                                className="w-full border rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500"
                                min="1" required
                            />
                        </div>
                    </div>

                    {type === 'MCQ' && (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium">Options</label>
                            {options.map((opt, idx) => (
                                <div key={idx} className="flex gap-2 items-center">
                                    <input
                                        type="radio" name="correct_opt"
                                        checked={opt.is_correct}
                                        onChange={() => {
                                            const newOpts = options.map((o, i) => ({ ...o, is_correct: i === idx }));
                                            setOptions(newOpts);
                                        }}
                                    />
                                    <input
                                        value={opt.content} onChange={e => handleOptionChange(idx, 'content', e.target.value)}
                                        className="flex-1 border rounded-lg px-3 py-2 text-sm"
                                        placeholder={`Option ${idx + 1}`} required
                                    />
                                    <button type="button" onClick={() => handleRemoveOption(idx)} className="text-red-500 hover:bg-red-50 p-1 rounded">
                                        <IconTrash className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                            <button type="button" onClick={handleAddOption} className="text-sm text-indigo-600 font-medium hover:underline">
                                + Add Option
                            </button>
                        </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4 border-t">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                            {loading ? "Adding..." : "Add Question"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
