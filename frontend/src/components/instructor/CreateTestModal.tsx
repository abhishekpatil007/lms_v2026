
import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { IconX, IconPlus, IconClipboardList } from "@tabler/icons-react";
import toast from "react-hot-toast";
import { testsApi } from "../../api/endpoints/tests";
import type { Test } from "@/types";

interface CreateTestModalProps {
    isOpen: boolean;
    onClose: () => void;
    batchId: string;
    onSuccess: () => void;
}

export const CreateTestModal: React.FC<CreateTestModalProps> = ({ isOpen, onClose, batchId, onSuccess }) => {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        title: "",
        description: "",
        start_time: "",
        end_time: "",
        duration_minutes: 60,
        max_attempts: 1,
        shuffle_questions: false,
        show_results_immediately: false,
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (!formData.title || !formData.start_time || !formData.end_time) {
            toast.error("Please fill in all required fields");
            return;
        }

        if (new Date(formData.end_time) <= new Date(formData.start_time)) {
            toast.error("End time must be after start time");
            return;
        }

        setLoading(true);
        try {
            await testsApi.create({
                ...formData,
                batch_id: batchId,
                // Ensure duration is number
                duration_minutes: Number(formData.duration_minutes),
                max_attempts: Number(formData.max_attempts),
            });

            toast.success("Test created successfully!");
            onSuccess();
            handleClose();
        } catch (error: any) {
            console.error("Error creating test:", error);
            toast.error(error?.response?.data?.message || "Failed to create test");
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setFormData({
            title: "",
            description: "",
            start_time: "",
            end_time: "",
            duration_minutes: 60,
            max_attempts: 1,
            shuffle_questions: false,
            show_results_immediately: false,
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={handleClose}
                    className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="relative w-full max-w-2xl bg-white rounded-[24px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-6 flex-shrink-0">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                                    <IconClipboardList className="w-6 h-6 text-white" strokeWidth={2} />
                                </div>
                                <h2 className="text-2xl font-bold text-white">Create New Test</h2>
                            </div>
                            <button
                                onClick={handleClose}
                                disabled={loading}
                                className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors text-white"
                            >
                                <IconX className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Form */}
                    <div className="overflow-y-auto p-6">
                        <form id="create-test-form" onSubmit={handleSubmit} className="space-y-6">

                            {/* Basic Info */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Basic Details</h3>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Test Title <span className="text-red-500">*</span></label>
                                    <input
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleChange}
                                        placeholder="e.g. Mid-Term Physics Exam"
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                        required
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        placeholder="Instructions or topics covered..."
                                        rows={3}
                                        className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none"
                                    />
                                </div>
                            </div>

                            {/* Timing */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Timing & Duration</h3>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Start Time <span className="text-red-500">*</span></label>
                                        <input
                                            type="datetime-local"
                                            name="start_time"
                                            value={formData.start_time}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">End Time <span className="text-red-500">*</span></label>
                                        <input
                                            type="datetime-local"
                                            name="end_time"
                                            value={formData.end_time}
                                            onChange={handleChange}
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes) <span className="text-red-500">*</span></label>
                                        <input
                                            type="number"
                                            name="duration_minutes"
                                            value={formData.duration_minutes}
                                            onChange={handleChange}
                                            min="1"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Max Attempts <span className="text-red-500">*</span></label>
                                        <input
                                            type="number"
                                            name="max_attempts"
                                            value={formData.max_attempts}
                                            onChange={handleChange}
                                            min="1"
                                            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Settings */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-800 border-b pb-2">Settings</h3>

                                <div className="space-y-3">
                                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            name="shuffle_questions"
                                            checked={formData.shuffle_questions}
                                            onChange={handleChange}
                                            className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                                        />
                                        <div>
                                            <div className="font-medium text-gray-900">Shuffle Questions</div>
                                            <div className="text-xs text-gray-500">Randomize question order for each student</div>
                                        </div>
                                    </label>

                                    <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
                                        <input
                                            type="checkbox"
                                            name="show_results_immediately"
                                            checked={formData.show_results_immediately}
                                            onChange={handleChange}
                                            className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                                        />
                                        <div>
                                            <div className="font-medium text-gray-900">Show Results Immediately</div>
                                            <div className="text-xs text-gray-500">Allow students to see their score right after submission</div>
                                        </div>
                                    </label>
                                </div>
                            </div>

                        </form>
                    </div>

                    {/* Footer */}
                    <div className="p-6 border-t bg-gray-50 flex-shrink-0 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={handleClose}
                            disabled={loading}
                            className="px-6 py-2.5 rounded-xl border border-gray-300 text-gray-700 font-medium hover:bg-gray-100 transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            form="create-test-form"
                            disabled={loading}
                            className="px-6 py-2.5 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-semibold hover:shadow-lg transition-all disabled:opacity-70 flex items-center gap-2"
                        >
                            {loading ? "Creating..." : (
                                <>
                                    <IconPlus className="w-5 h-5" />
                                    Create Test
                                </>
                            )}
                        </button>
                    </div>

                </motion.div>
            </div>
        </AnimatePresence>
    );
};
