import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { IconX, IconUpload, IconCheck, IconUser, IconSchool, IconCurrencyRupee, IconFileInvoice, IconMail } from '@tabler/icons-react';
import { invoicesApi } from '@/api/endpoints/invoices';
import { usersApi } from '@/api/endpoints/users';
import { batchesApi } from '@/api/endpoints/batches';
import type { User, Batch } from '@/types';
import { cn } from '@/lib/utils';

interface CreateInvoiceModalProps {
    onClose: () => void;
    onSuccess: () => void;
}

type TabType = 'offline' | 'online' | 'manual' | 'bulk';

export const CreateInvoiceModal = ({ onClose, onSuccess }: CreateInvoiceModalProps) => {
    const [activeTab, setActiveTab] = useState<TabType>('offline');
    const [loading, setLoading] = useState(false);
    const [students, setStudents] = useState<User[]>([]);
    const [batches, setBatches] = useState<Batch[]>([]);

    // Form States
    const [formData, setFormData] = useState({
        studentId: '',
        batchId: '',
        amount: '',
        gst_rate: 18,
        is_gst_inclusive: true,
        notes: '',
    });

    // Manual Invoice State
    const [manualData, setManualData] = useState({
        fullName: '',
        email: '',
        courseName: '',
        batchName: '',
        amount: '',
        method: 'Offline',
        transactionId: '',
    });

    // Bulk Upload State
    const [file, setFile] = useState<File | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [studentsRes, batchesRes] = await Promise.all([
                usersApi.getStudents(),
                batchesApi.list(),
            ]);
            setStudents(studentsRes.students || []);
            setBatches(batchesRes.batches || []);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (activeTab === 'offline') {
                await invoicesApi.offlineEnroll({
                    ...formData,
                    studentId: Number(formData.studentId),
                    amount: Number(formData.amount),
                });
            } else if (activeTab === 'online') {
                await invoicesApi.requestPayment({
                    ...formData,
                    studentId: Number(formData.studentId),
                    amount: Number(formData.amount),
                });
            } else if (activeTab === 'manual') {
                await invoicesApi.sendManual(manualData);
            } else if (activeTab === 'bulk') {
                if (!file) {
                    alert('Please select a file');
                    setLoading(false);
                    return;
                }
                await invoicesApi.bulkUpload(file);
            }

            onSuccess();
            onClose();
        } catch (error: any) {
            console.error('Error creating invoice:', error);
            alert(error.response?.data?.message || 'Failed to create invoice');
        } finally {
            setLoading(false);
        }
    };

    const tabs = [
        { id: 'offline', label: 'Offline Enroll', icon: <IconUser className="w-4 h-4" /> },
        { id: 'online', label: 'Request Payment', icon: <IconCurrencyRupee className="w-4 h-4" /> },
        { id: 'manual', label: 'Manual Invoice', icon: <IconFileInvoice className="w-4 h-4" /> },
        { id: 'bulk', label: 'Bulk Upload', icon: <IconUpload className="w-4 h-4" /> },
    ];

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={onClose}
        >
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
                className="w-full max-w-2xl rounded-[28px] bg-white shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */}
                <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900">Create Invoice</h3>
                        <p className="text-sm text-gray-500">Select a method to generate invoices</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 hover:bg-gray-100 transition-colors"
                    >
                        <IconX className="h-5 w-5 text-gray-500" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-gray-100 px-6 pt-2 overflow-x-auto">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as TabType)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                                activeTab === tab.id
                                    ? "border-[#3D3532] text-[#3D3532]"
                                    : "border-transparent text-gray-500 hover:text-gray-700"
                            )}
                        >
                            {tab.icon}
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Offline & Online Forms (Shared Fields) */}
                        {(activeTab === 'offline' || activeTab === 'online') && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Select Student *
                                        </label>
                                        <select
                                            required
                                            value={formData.studentId}
                                            onChange={(e) => setFormData({ ...formData, studentId: e.target.value })}
                                            className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20 cursor-pointer"
                                        >
                                            <option value="">Select a student</option>
                                            {students.map((s) => (
                                                <option key={s.id} value={s.id}>{s.name} ({s.email})</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Select Batch *
                                        </label>
                                        <select
                                            required
                                            value={formData.batchId}
                                            onChange={(e) => setFormData({ ...formData, batchId: e.target.value })}
                                            className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20 cursor-pointer"
                                        >
                                            <option value="">Select a batch</option>
                                            {batches.map((b) => (
                                                <option key={b.id} value={b.id}>{b.batch_name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Amount (₹) *
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            value={formData.amount}
                                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                            className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20"
                                            placeholder="Enter amount"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            GST Rate (%)
                                        </label>
                                        <select
                                            value={formData.gst_rate}
                                            onChange={(e) => setFormData({ ...formData, gst_rate: Number(e.target.value) })}
                                            className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20 cursor-pointer"
                                        >
                                            <option value={0}>0%</option>
                                            <option value={5}>5%</option>
                                            <option value={12}>12%</option>
                                            <option value={18}>18%</option>
                                            <option value={28}>28%</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="gst_inclusive"
                                        checked={formData.is_gst_inclusive}
                                        onChange={(e) => setFormData({ ...formData, is_gst_inclusive: e.target.checked })}
                                        className="rounded border-gray-300 text-[#2D2D2D] focus:ring-[#2D2D2D]"
                                    />
                                    <label htmlFor="gst_inclusive" className="text-sm text-gray-700">
                                        Amount is GST inclusive
                                    </label>
                                </div>

                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Notes (Optional)
                                    </label>
                                    <textarea
                                        rows={3}
                                        value={formData.notes}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20 resize-none"
                                        placeholder="Add any internal notes..."
                                    />
                                </div>
                            </>
                        )}

                        {/* Manual Invoice Form */}
                        {activeTab === 'manual' && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Full Name *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={manualData.fullName}
                                            onChange={(e) => setManualData({ ...manualData, fullName: e.target.value })}
                                            className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20"
                                            placeholder="Student Name"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Email *
                                        </label>
                                        <input
                                            type="email"
                                            required
                                            value={manualData.email}
                                            onChange={(e) => setManualData({ ...manualData, email: e.target.value })}
                                            className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20"
                                            placeholder="student@example.com"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Course Name
                                        </label>
                                        <input
                                            type="text"
                                            value={manualData.courseName}
                                            onChange={(e) => setManualData({ ...manualData, courseName: e.target.value })}
                                            className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20"
                                            placeholder="e.g. Web Development"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Batch Name
                                        </label>
                                        <input
                                            type="text"
                                            value={manualData.batchName}
                                            onChange={(e) => setManualData({ ...manualData, batchName: e.target.value })}
                                            className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20"
                                            placeholder="e.g. Batch A"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Amount *
                                        </label>
                                        <input
                                            type="number"
                                            required
                                            value={manualData.amount}
                                            onChange={(e) => setManualData({ ...manualData, amount: e.target.value })}
                                            className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20"
                                            placeholder="0.00"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                            Payment Method
                                        </label>
                                        <select
                                            value={manualData.method}
                                            onChange={(e) => setManualData({ ...manualData, method: e.target.value })}
                                            className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20 cursor-pointer"
                                        >
                                            <option value="Offline">Offline</option>
                                            <option value="Online">Online</option>
                                            <option value="Bank Transfer">Bank Transfer</option>
                                        </select>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                                        Transaction ID (Optional)
                                    </label>
                                    <input
                                        type="text"
                                        value={manualData.transactionId}
                                        onChange={(e) => setManualData({ ...manualData, transactionId: e.target.value })}
                                        className="w-full rounded-xl border-0 bg-gray-50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20"
                                        placeholder="e.g. TXN123456"
                                    />
                                </div>
                            </>
                        )}

                        {/* Bulk Upload Form */}
                        {activeTab === 'bulk' && (
                            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-200 rounded-2xl bg-gray-50/50">
                                <IconUpload className="w-12 h-12 text-gray-400 mb-4" />
                                <p className="text-sm font-semibold text-gray-700 mb-2">
                                    Upload Excel File
                                </p>
                                <p className="text-xs text-gray-500 mb-6 text-center max-w-xs">
                                    Upload an .xlsx file with columns: email, fullName, courseName, batchName, amount
                                </p>
                                <input
                                    type="file"
                                    accept=".xlsx, .xls"
                                    onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
                                    className="hidden"
                                    id="file-upload"
                                />
                                <label
                                    htmlFor="file-upload"
                                    className="cursor-pointer rounded-xl bg-white px-6 py-2.5 text-sm font-semibold text-gray-700 shadow-sm border border-gray-200 hover:bg-gray-50 transition-all"
                                >
                                    {file ? file.name : 'Choose File'}
                                </label>
                            </div>
                        )}

                        {/* Submit Button */}
                        <div className="pt-4">
                            <button
                                type="submit"
                                disabled={loading}
                                className={cn(
                                    "w-full rounded-xl py-3 text-sm font-bold text-white shadow-lg transition-all flex items-center justify-center gap-2",
                                    loading ? "opacity-70 cursor-not-allowed" : "hover:shadow-xl",
                                    activeTab === 'offline' ? "bg-gradient-to-br from-[#B4F481] to-[#9FE66F] text-[#2D2D2D]" :
                                        activeTab === 'online' ? "bg-gradient-to-br from-[#60A5FA] to-[#3B82F6]" :
                                            "bg-[#2D2D2D]"
                                )}
                            >
                                {loading ? (
                                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                                ) : (
                                    <>
                                        {activeTab === 'offline' && 'Enroll & Create Invoice'}
                                        {activeTab === 'online' && 'Send Payment Link'}
                                        {activeTab === 'manual' && 'Generate Invoice'}
                                        {activeTab === 'bulk' && 'Process Bulk Upload'}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </motion.div>
        </motion.div>
    );
};
