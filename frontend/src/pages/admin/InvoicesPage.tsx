import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
    IconSearch,
    IconFileInvoice,
    IconDownload,
    IconEye,
    IconPlus,
    IconCash,
    IconSend,
    IconUpload,
    IconUserPlus,
    IconX,
    IconMail,
} from "@tabler/icons-react";
import { invoicesApi } from "@/api/endpoints/invoices";
import type { Invoice } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { cn, formatDateIST } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { CreateInvoiceModal } from "@/components/invoices/CreateInvoiceModal";
import toast from "react-hot-toast";

// --------------- Action Modal Wrapper ---------------
const ActionModal = ({
    title,
    onClose,
    children,
}: {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}) => (
    <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
        onClick={onClose}
    >
        <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", duration: 0.5 }}
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
                <h2 className="text-base sm:text-lg font-bold text-gray-900">{title}</h2>
                <button
                    onClick={onClose}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                >
                    <IconX className="w-5 h-5" />
                </button>
            </div>
            <div className="p-4 sm:p-6">{children}</div>
        </motion.div>
    </motion.div>
);

// --------------- Offline Enroll Modal ---------------
const OfflineEnrollModal = ({
    onClose,
    onSuccess,
}: {
    onClose: () => void;
    onSuccess: () => void;
}) => {
    const [form, setForm] = useState({
        user_id: "",
        batch_id: "",
        amount: "",
        gst_rate: "18",
        is_gst_inclusive: true,
        notes: "",
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await invoicesApi.offlineEnroll({
                user_id: Number(form.user_id),
                batch_id: Number(form.batch_id),
                amount: Number(form.amount),
                gst_rate: Number(form.gst_rate),
                is_gst_inclusive: form.is_gst_inclusive,
                payment_method: "offline",
                notes: form.notes,
            });
            toast.success("Offline enrollment created successfully");
            onSuccess();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to create offline enrollment");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ActionModal title="Offline Enroll" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                        <input
                            type="number"
                            required
                            value={form.user_id}
                            onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                            placeholder="Enter user ID"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Batch ID</label>
                        <input
                            type="number"
                            required
                            value={form.batch_id}
                            onChange={(e) => setForm({ ...form, batch_id: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                            placeholder="Enter batch ID"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (INR)</label>
                        <input
                            type="number"
                            required
                            step="0.01"
                            value={form.amount}
                            onChange={(e) => setForm({ ...form, amount: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                            placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">GST Rate (%)</label>
                        <input
                            type="number"
                            required
                            step="0.01"
                            value={form.gst_rate}
                            onChange={(e) => setForm({ ...form, gst_rate: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
                            placeholder="18"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="offline-gst-inclusive"
                        checked={form.is_gst_inclusive}
                        onChange={(e) => setForm({ ...form, is_gst_inclusive: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-violet-600 focus:ring-violet-500"
                    />
                    <label htmlFor="offline-gst-inclusive" className="text-sm text-gray-700">GST Inclusive</label>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-violet-500/20 resize-none"
                        placeholder="Optional notes..."
                    />
                </div>
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl bg-violet-600 text-white font-bold hover:bg-violet-700 transition-colors disabled:opacity-50"
                >
                    {submitting ? "Processing..." : "Enroll Offline"}
                </button>
            </form>
        </ActionModal>
    );
};

// --------------- Request Payment Modal ---------------
const RequestPaymentModal = ({
    onClose,
    onSuccess,
}: {
    onClose: () => void;
    onSuccess: () => void;
}) => {
    const [form, setForm] = useState({
        user_id: "",
        batch_id: "",
        amount: "",
        gst_rate: "18",
        is_gst_inclusive: true,
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await invoicesApi.requestPayment({
                user_id: Number(form.user_id),
                batch_id: Number(form.batch_id),
                amount: Number(form.amount),
                gst_rate: Number(form.gst_rate),
                is_gst_inclusive: form.is_gst_inclusive,
            });
            toast.success("Payment request sent successfully");
            onSuccess();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to send payment request");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ActionModal title="Request Payment" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                        <input
                            type="number"
                            required
                            value={form.user_id}
                            onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            placeholder="Enter user ID"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Batch ID</label>
                        <input
                            type="number"
                            required
                            value={form.batch_id}
                            onChange={(e) => setForm({ ...form, batch_id: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            placeholder="Enter batch ID"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (INR)</label>
                        <input
                            type="number"
                            required
                            step="0.01"
                            value={form.amount}
                            onChange={(e) => setForm({ ...form, amount: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">GST Rate (%)</label>
                        <input
                            type="number"
                            required
                            step="0.01"
                            value={form.gst_rate}
                            onChange={(e) => setForm({ ...form, gst_rate: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                            placeholder="18"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="request-gst-inclusive"
                        checked={form.is_gst_inclusive}
                        onChange={(e) => setForm({ ...form, is_gst_inclusive: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <label htmlFor="request-gst-inclusive" className="text-sm text-gray-700">GST Inclusive</label>
                </div>
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition-colors disabled:opacity-50"
                >
                    {submitting ? "Sending..." : "Send Payment Request"}
                </button>
            </form>
        </ActionModal>
    );
};

// --------------- Send Manual Invoice Modal ---------------
const SendManualModal = ({
    onClose,
    onSuccess,
}: {
    onClose: () => void;
    onSuccess: () => void;
}) => {
    const [form, setForm] = useState({
        user_id: "",
        batch_id: "",
        amount: "",
        gst_rate: "18",
        is_gst_inclusive: true,
        payment_method: "online" as "online" | "offline",
        notes: "",
    });
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            await invoicesApi.sendManual({
                user_id: Number(form.user_id),
                batch_id: Number(form.batch_id),
                amount: Number(form.amount),
                gst_rate: Number(form.gst_rate),
                is_gst_inclusive: form.is_gst_inclusive,
                payment_method: form.payment_method,
                notes: form.notes,
            });
            toast.success("Manual invoice sent successfully");
            onSuccess();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Failed to send manual invoice");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ActionModal title="Send Manual Invoice" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">User ID</label>
                        <input
                            type="number"
                            required
                            value={form.user_id}
                            onChange={(e) => setForm({ ...form, user_id: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                            placeholder="Enter user ID"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Batch ID</label>
                        <input
                            type="number"
                            required
                            value={form.batch_id}
                            onChange={(e) => setForm({ ...form, batch_id: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                            placeholder="Enter batch ID"
                        />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Amount (INR)</label>
                        <input
                            type="number"
                            required
                            step="0.01"
                            value={form.amount}
                            onChange={(e) => setForm({ ...form, amount: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                            placeholder="0.00"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">GST Rate (%)</label>
                        <input
                            type="number"
                            required
                            step="0.01"
                            value={form.gst_rate}
                            onChange={(e) => setForm({ ...form, gst_rate: e.target.value })}
                            className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20"
                            placeholder="18"
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
                    <select
                        value={form.payment_method}
                        onChange={(e) => setForm({ ...form, payment_method: e.target.value as "online" | "offline" })}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 bg-white"
                    >
                        <option value="online">Online</option>
                        <option value="offline">Offline</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        id="manual-gst-inclusive"
                        checked={form.is_gst_inclusive}
                        onChange={(e) => setForm({ ...form, is_gst_inclusive: e.target.checked })}
                        className="w-4 h-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500"
                    />
                    <label htmlFor="manual-gst-inclusive" className="text-sm text-gray-700">GST Inclusive</label>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        rows={3}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-sky-500/20 resize-none"
                        placeholder="Optional notes..."
                    />
                </div>
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 rounded-xl bg-sky-600 text-white font-bold hover:bg-sky-700 transition-colors disabled:opacity-50"
                >
                    {submitting ? "Sending..." : "Send Manual Invoice"}
                </button>
            </form>
        </ActionModal>
    );
};

// --------------- Bulk Upload Modal ---------------
const BulkUploadModal = ({
    onClose,
    onSuccess,
}: {
    onClose: () => void;
    onSuccess: () => void;
}) => {
    const [file, setFile] = useState<File | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            toast.error("Please select a CSV file");
            return;
        }
        setSubmitting(true);
        try {
            await invoicesApi.bulkUpload(file);
            toast.success("Bulk upload completed successfully");
            onSuccess();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || "Bulk upload failed");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <ActionModal title="Bulk Upload Invoices" onClose={onClose}>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Upload CSV File</label>
                    <div className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center hover:border-amber-400 transition-colors">
                        <IconUpload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500 mb-2">
                            {file ? file.name : "Click to select or drag a CSV file"}
                        </p>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="w-full opacity-0 absolute inset-0 cursor-pointer"
                            style={{ position: "relative" }}
                        />
                        <input
                            type="file"
                            accept=".csv"
                            onChange={(e) => setFile(e.target.files?.[0] || null)}
                            className="text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-amber-50 file:text-amber-700 hover:file:bg-amber-100"
                        />
                    </div>
                </div>
                <button
                    type="submit"
                    disabled={submitting || !file}
                    className="w-full py-3 rounded-xl bg-amber-600 text-white font-bold hover:bg-amber-700 transition-colors disabled:opacity-50"
                >
                    {submitting ? "Uploading..." : "Upload CSV"}
                </button>
            </form>
        </ActionModal>
    );
};

// --------------- Main InvoicesPage ---------------
export const InvoicesPage = () => {
    const navigate = useNavigate();
    const { user } = useAuthStore();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [activeModal, setActiveModal] = useState<
        "offlineEnroll" | "requestPayment" | "sendManual" | "bulkUpload" | null
    >(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [downloadingId, setDownloadingId] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState<'invoices' | 'sent'>('invoices');
    const [sentLogs, setSentLogs] = useState<any[]>([]);
    const [sentLogsTotal, setSentLogsTotal] = useState(0);
    const [sentLogsPage, setSentLogsPage] = useState(1);
    const [sentLogsTotalPages, setSentLogsTotalPages] = useState(1);
    const [sentLogsSearch, setSentLogsSearch] = useState('');
    const [sentLogsLoading, setSentLogsLoading] = useState(false);

    const handleDownload = async (invoice: Invoice) => {
        if (downloadingId) return;
        setDownloadingId(invoice.id);
        try {
            await invoicesApi.download(invoice.id, invoice.invoice_number);
            toast.success('Invoice downloaded');
        } catch {
            toast.error('Failed to download invoice');
        } finally {
            setDownloadingId(null);
        }
    };

    useEffect(() => {
        fetchInvoices();
    }, [page, search, statusFilter]);

    useEffect(() => {
        fetchAllInvoicesForStats();
    }, []);

    const fetchInvoices = async () => {
        try {
            setLoading(true);
            const data = await invoicesApi.list({
                page,
                limit: 10,
                search,
                status: statusFilter || undefined,
            });
            setInvoices(data.invoices);
            setTotalPages(data.totalPages);
        } catch (error) {
            console.error("Error fetching invoices:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchAllInvoicesForStats = async () => {
        try {
            const data = await invoicesApi.list({ limit: 9999 });
            setAllInvoices(data.invoices);
        } catch (error) {
            console.error("Error fetching invoices for stats:", error);
        }
    };

    const fetchSentLogs = async () => {
        try {
            setSentLogsLoading(true);
            const data = await invoicesApi.listSentLogs({ page: sentLogsPage, limit: 10, search: sentLogsSearch || undefined });
            setSentLogs(data.logs);
            setSentLogsTotal(data.total);
            setSentLogsTotalPages(data.totalPages);
        } catch (error) {
            console.error("Error fetching sent invoice logs:", error);
        } finally {
            setSentLogsLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === 'sent') fetchSentLogs();
    }, [activeTab, sentLogsPage, sentLogsSearch]);

    const stats = useMemo(() => {
        const totalRevenue = allInvoices
            .filter((inv) => inv.status === "paid")
            .reduce((sum, inv) => sum + Number(inv.total || 0), 0);
        const pendingAmount = allInvoices
            .filter((inv) => inv.status === "pending")
            .reduce((sum, inv) => sum + Number(inv.total || 0), 0);
        const totalCount = allInvoices.length;
        const paidCount = allInvoices.filter((inv) => inv.status === "paid").length;
        return { totalRevenue, pendingAmount, totalCount, paidCount };
    }, [allInvoices]);

    const handleActionSuccess = () => {
        setActiveModal(null);
        fetchInvoices();
        fetchAllInvoicesForStats();
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "paid":
                return "bg-emerald-100 text-emerald-700";
            case "pending":
                return "bg-amber-100 text-amber-700";
            case "overdue":
                return "bg-rose-100 text-rose-700";
            case "cancelled":
                return "bg-gray-100 text-gray-600";
            default:
                return "bg-gray-100 text-gray-600";
        }
    };

    const formatCurrency = (amount: number) =>
        new Intl.NumberFormat("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 0,
        }).format(amount);

    const statCards = [
        {
            label: "Total Revenue",
            value: formatCurrency(stats.totalRevenue),
            gradient: "from-violet-500 to-purple-600",
            icon: "₹",
        },
        {
            label: "Paid Invoices",
            value: stats.paidCount.toString(),
            gradient: "from-emerald-500 to-green-600",
            icon: "✓",
        },
        {
            label: "Pending Amount",
            value: formatCurrency(stats.pendingAmount),
            gradient: "from-amber-500 to-orange-600",
            icon: "⏳",
        },
        {
            label: "Total Invoices",
            value: stats.totalCount.toString(),
            gradient: "from-sky-500 to-blue-600",
            icon: "#",
        },
    ];

    const quickActions = [
        {
            label: "Offline Enroll",
            icon: IconUserPlus,
            modal: "offlineEnroll" as const,
            color: "bg-violet-600 hover:bg-violet-700",
        },
        {
            label: "Request Payment",
            icon: IconCash,
            modal: "requestPayment" as const,
            color: "bg-emerald-600 hover:bg-emerald-700",
        },
        {
            label: "Send Manual Invoice",
            icon: IconSend,
            modal: "sendManual" as const,
            color: "bg-sky-600 hover:bg-sky-700",
        },
        {
            label: "Bulk Upload",
            icon: IconUpload,
            modal: "bulkUpload" as const,
            color: "bg-amber-600 hover:bg-amber-700",
        },
    ];

    return (
        <>
            <div className="flex flex-1 overflow-auto">
                <div className="flex h-full w-full flex-1 flex-col gap-6 p-3 sm:p-4 md:p-7">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl bg-white p-4 sm:p-5 md:p-6 border border-gray-200">
                        <div>
                            <h1 className="text-3xl md:text-5xl font-bold text-gray-900">Invoices</h1>
                            <p className="text-sm md:text-base text-gray-500 mt-1">Manage and track all student invoices</p>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 rounded-xl bg-gray-900 px-5 py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all hover:bg-gray-800"
                        >
                            <IconPlus className="h-5 w-5" strokeWidth={2.5} />
                            Create Invoice
                        </button>
                    </div>

                    {/* Revenue Stats Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 md:gap-4">
                        {statCards.map((card, index) => (
                            <motion.div
                                key={card.label}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.1 }}
                                className={cn(
                                    "rounded-2xl bg-gradient-to-br p-3 sm:p-4 md:p-5 text-white shadow-lg",
                                    card.gradient
                                )}
                            >
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm font-medium text-white/80">{card.label}</span>
                                    <span className="text-2xl opacity-60">{card.icon}</span>
                                </div>
                                <div className="text-2xl font-bold">{card.value}</div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                        {quickActions.map((action) => (
                            <button
                                key={action.label}
                                onClick={() => setActiveModal(action.modal)}
                                className={cn(
                                    "flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all",
                                    action.color
                                )}
                            >
                                <action.icon className="w-5 h-5" strokeWidth={2.5} />
                                {action.label}
                            </button>
                        ))}
                        <button
                            onClick={() => navigate("/admin/invoices/send-email")}
                            className="flex items-center gap-2 rounded-xl bg-violet-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:shadow-lg transition-all"
                        >
                            <IconMail className="w-5 h-5" strokeWidth={2.5} />
                            Send Invoice Module
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setActiveTab('invoices')}
                            className={cn(
                                "px-5 py-2 rounded-xl text-sm font-semibold transition-all",
                                activeTab === 'invoices' ? "bg-gray-900 text-white shadow-sm" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
                            )}
                        >
                            Invoices
                        </button>
                        <button
                            onClick={() => setActiveTab('sent')}
                            className={cn(
                                "px-5 py-2 rounded-xl text-sm font-semibold transition-all",
                                activeTab === 'sent' ? "bg-gray-900 text-white shadow-sm" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
                            )}
                        >
                            Sent via Email Module
                            {sentLogsTotal > 0 && (
                                <span className="ml-2 px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 text-xs">{sentLogsTotal}</span>
                            )}
                        </button>
                    </div>

                    {/* Filters */}
                    <div className={cn("rounded-2xl bg-white p-4 sm:p-5 md:p-6 border border-gray-200", activeTab !== 'invoices' && "hidden")}>
                        <div className="relative">
                            <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                            <input
                                type="text"
                                placeholder="Search by invoice number..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>

                        {/* Status Filter Pills */}
                        <div className="flex flex-wrap items-center gap-2 mt-3">
                            <span className="text-xs font-semibold text-gray-500 mr-1">Status:</span>
                            {([
                                { value: "", label: "All" },
                                { value: "paid", label: "Paid" },
                                { value: "pending", label: "Pending" },
                                { value: "cancelled", label: "Cancelled" },
                            ] as const).map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => { setStatusFilter(opt.value); setPage(1); }}
                                    className={cn(
                                        "rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all",
                                        statusFilter === opt.value
                                            ? "bg-gray-900 text-white shadow-sm"
                                            : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Invoices List */}
                    <div className={cn("rounded-2xl bg-white border border-gray-200 overflow-hidden", activeTab !== 'invoices' && "hidden")}>
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-100">
                                    <tr>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Invoice #</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Student</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Batch</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Amount</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Date</th>
                                        <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Status</th>
                                        <th className="px-6 py-4 text-right text-sm font-semibold text-gray-600">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                                Loading invoices...
                                            </td>
                                        </tr>
                                    ) : invoices.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                                                No invoices found
                                            </td>
                                        </tr>
                                    ) : (
                                        invoices.map((invoice) => (
                                            <motion.tr
                                                key={invoice.id}
                                                initial={{ opacity: 0 }}
                                                animate={{ opacity: 1 }}
                                                className="hover:bg-gray-50 transition-colors"
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                                                            <IconFileInvoice className="w-5 h-5" />
                                                        </div>
                                                        <span className="font-medium text-gray-900">{invoice.invoice_number}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="text-sm">
                                                        <div className="font-medium text-gray-900">{invoice.student?.name}</div>
                                                        <div className="text-gray-500">{invoice.student?.email}</div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {invoice.batch?.batch_name}
                                                </td>
                                                <td className="px-6 py-4 font-medium text-gray-900">
                                                    {formatCurrency(Number(invoice.total))}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {formatDateIST(invoice.issued_at)}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className={cn(
                                                        "px-3 py-1 rounded-full text-xs font-semibold",
                                                        getStatusColor(invoice.status)
                                                    )}>
                                                        {invoice.status.toUpperCase()}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                                            <IconEye className="w-5 h-5" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleDownload(invoice)}
                                                            disabled={downloadingId === invoice.id}
                                                            className="p-2 text-gray-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title="Download PDF"
                                                        >
                                                            {downloadingId === invoice.id ? (
                                                                <div className="w-5 h-5 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
                                                            ) : (
                                                                <IconDownload className="w-5 h-5" />
                                                            )}
                                                        </button>
                                                    </div>
                                                </td>
                                            </motion.tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination */}
                        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                            >
                                Previous
                            </button>
                            <span className="text-sm text-gray-600">
                                Page {page} of {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                    {/* Sent via Email Module Table */}
                    {activeTab === 'sent' && (
                        <div className="rounded-2xl bg-white border border-gray-200 overflow-hidden">
                            {/* Search */}
                            <div className="p-4 border-b border-gray-100">
                                <div className="relative">
                                    <IconSearch className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <input
                                        type="text"
                                        placeholder="Search by name, email or invoice number..."
                                        value={sentLogsSearch}
                                        onChange={(e) => { setSentLogsSearch(e.target.value); setSentLogsPage(1); }}
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b border-gray-100">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Invoice / Receipt #</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Name</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Email</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Type</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Amount</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold text-gray-600">Sent At</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {sentLogsLoading ? (
                                            <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">Loading...</td></tr>
                                        ) : sentLogs.length === 0 ? (
                                            <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-500">No sent invoices found</td></tr>
                                        ) : sentLogs.map((log) => (
                                            <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                                                <td className="px-6 py-4 font-medium text-gray-900">{log.invoice_number || '-'}</td>
                                                <td className="px-6 py-4 text-sm text-gray-800">{log.name}</td>
                                                <td className="px-6 py-4 text-sm text-gray-500">{log.email}</td>
                                                <td className="px-6 py-4">
                                                    <span className={cn(
                                                        "px-3 py-1 rounded-full text-xs font-semibold",
                                                        log.type === 'fully_paid' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                                                    )}>
                                                        {log.type === 'fully_paid' ? 'Tax Invoice' : 'Receipt'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4 text-sm font-medium text-gray-900">
                                                    {log.amount ? `₹${Number(log.amount).toLocaleString('en-IN')}` : '-'}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">{formatDateIST(log.sent_at)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {/* Pagination */}
                            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
                                <button onClick={() => setSentLogsPage(p => Math.max(1, p - 1))} disabled={sentLogsPage === 1}
                                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50">Previous</button>
                                <span className="text-sm text-gray-600">Page {sentLogsPage} of {sentLogsTotalPages || 1}</span>
                                <button onClick={() => setSentLogsPage(p => Math.min(sentLogsTotalPages, p + 1))} disabled={sentLogsPage === sentLogsTotalPages}
                                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-50">Next</button>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Modals */}
            <AnimatePresence>
                {showCreateModal && (
                    <CreateInvoiceModal
                        onClose={() => setShowCreateModal(false)}
                        onSuccess={() => {
                            fetchInvoices();
                            fetchAllInvoicesForStats();
                            setShowCreateModal(false);
                        }}
                    />
                )}
                {activeModal === "offlineEnroll" && (
                    <OfflineEnrollModal
                        onClose={() => setActiveModal(null)}
                        onSuccess={handleActionSuccess}
                    />
                )}
                {activeModal === "requestPayment" && (
                    <RequestPaymentModal
                        onClose={() => setActiveModal(null)}
                        onSuccess={handleActionSuccess}
                    />
                )}
                {activeModal === "sendManual" && (
                    <SendManualModal
                        onClose={() => setActiveModal(null)}
                        onSuccess={handleActionSuccess}
                    />
                )}
                {activeModal === "bulkUpload" && (
                    <BulkUploadModal
                        onClose={() => setActiveModal(null)}
                        onSuccess={handleActionSuccess}
                    />
                )}
            </AnimatePresence>
        </>
    );
};
