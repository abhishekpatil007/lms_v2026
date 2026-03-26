import { useState, useEffect } from "react";
import { 
    IconArrowLeft, 
    IconDownload, 
    IconUpload, 
    IconMail, 
    IconFileText, 
    IconCheck, 
    IconAlertCircle,
    IconLoader2
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { invoicesApi } from "@/api/endpoints/invoices";
import toast from "react-hot-toast";
import { io } from "socket.io-client";

type InvoiceType = "partially_paid" | "fully_paid";

interface ProgressEvent {
    current: number;
    total: number;
    email: string;
    name: string;
    status: 'success' | 'failed';
    error?: string;
}

const SOCKET_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

export const AdminInvoiceEmailPage = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<InvoiceType>("partially_paid");
    const [file, setFile] = useState<File | null>(null);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<"idle" | "processing" | "success" | "error">("idle");
    const [summary, setSummary] = useState<any>(null);
    const [progress, setProgress] = useState<ProgressEvent | null>(null);
    const [logs, setLogs] = useState<ProgressEvent[]>([]);

    useEffect(() => {
        const socket = io(SOCKET_URL);

        socket.on("connect", () => {
            console.log("Connected to socket");
            socket.emit("join_admin_invoices");
        });

        socket.on("invoice_progress", (data: ProgressEvent) => {
            setProgress(data);
            setLogs(prev => [data, ...prev].slice(0, 50)); // Keep last 50 logs
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    const handleDownloadTemplate = async () => {
        setIsDownloading(true);
        try {
            const response = await invoicesApi.getEmailModuleTemplate(activeTab);
            const url = window.URL.createObjectURL(new Blob([response]));
            const link = document.createElement("a");
            link.href = url;
            link.setAttribute("download", `Invoice_Template_${activeTab}.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            toast.success("Template downloaded successfully");
        } catch (error) {
            console.error("Download error:", error);
            toast.error("Failed to download template");
        } finally {
            setIsDownloading(false);
        }
    };

    const handlePreview = async () => {
        try {
            const response = await invoicesApi.getInvoicePreview(activeTab);
            const url = window.URL.createObjectURL(new Blob([response], { type: 'application/pdf' }));
            window.open(url, "_blank");
        } catch (error) {
            console.error("Preview error:", error);
            toast.error("Failed to generate preview");
        }
    };

    const handleUpload = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!file) {
            toast.error("Please select an Excel file first");
            return;
        }

        setIsUploading(true);
        setUploadStatus("processing");
        setLogs([]);
        setProgress(null);
        try {
            const result = await invoicesApi.sendInvoiceEmailBulk(activeTab, file);
            setUploadStatus("success");
            setSummary(result.summary);
            toast.success("Bulk invoices processed successfully");
        } catch (error: any) {
            setUploadStatus("error");
            toast.error(error?.response?.data?.message || "Failed to process bulk invoices");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="flex h-full w-full flex-col gap-6 p-4 md:p-8 bg-gray-50/50">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button
                    onClick={() => navigate(-1)}
                    className="p-2 rounded-xl bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
                >
                    <IconArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Invoice Email Module</h1>
                    <p className="text-sm text-gray-500">Send bulk invoices/receipts using custom templates</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 p-1 bg-gray-200/50 rounded-2xl w-fit">
                <button
                    onClick={() => { setActiveTab("partially_paid"); setUploadStatus("idle"); setFile(null); }}
                    className={cn(
                        "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                        activeTab === "partially_paid"
                            ? "bg-white text-violet-600 shadow-md"
                            : "text-gray-500 hover:text-gray-700"
                    )}
                >
                    Partially Paid (Receipt)
                </button>
                <button
                    onClick={() => { setActiveTab("fully_paid"); setUploadStatus("idle"); setFile(null); }}
                    className={cn(
                        "px-6 py-2.5 rounded-xl text-sm font-bold transition-all",
                        activeTab === "fully_paid"
                            ? "bg-white text-emerald-600 shadow-md"
                            : "text-gray-500 hover:text-gray-700"
                    )}
                >
                    Fully Paid (Tax Invoice)
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Step 1: Download */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-6"
                >
                    <div className="flex items-start gap-4">
                        <div className={cn(
                            "p-3 rounded-2xl",
                            activeTab === "partially_paid" ? "bg-violet-50 text-violet-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                            <IconDownload className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Step 1: Download Template</h3>
                            <p className="text-sm text-gray-500">Download the pre-filled Excel template with student details.</p>
                        </div>
                    </div>

                    <div className="flex-1 flex items-center justify-center border-2 border-dashed border-gray-100 rounded-3xl bg-gray-50/50 p-6">
                        <div className="text-center w-full">
                            <IconFileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                            <p className="text-sm text-gray-400 max-w-[280px] mx-auto mb-6">
                                Download the template or preview the design alignment before processing.
                            </p>
                            
                            <div className="flex flex-col md:flex-row gap-4">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleDownloadTemplate}
                                    disabled={isDownloading}
                                    className={cn(
                                        "flex-1 p-5 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2",
                                        activeTab === "partially_paid" 
                                            ? "border-violet-100 hover:border-violet-300 bg-violet-50/30 text-violet-600"
                                            : "border-emerald-100 hover:border-emerald-300 bg-emerald-50/30 text-emerald-600"
                                    )}
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-2xl flex items-center justify-center",
                                        activeTab === "partially_paid" ? "bg-violet-100" : "bg-emerald-100"
                                    )}>
                                        {isDownloading ? (
                                            <IconLoader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            <IconDownload className="w-5 h-5" />
                                        )}
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-sm">{isDownloading ? "Generating..." : "Download Excel"}</p>
                                    </div>
                                </motion.button>

                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handlePreview}
                                    className={cn(
                                        "flex-1 p-5 rounded-3xl border-2 border-dashed transition-all flex flex-col items-center justify-center gap-2",
                                        activeTab === "partially_paid" 
                                            ? "border-amber-100 hover:border-amber-300 bg-amber-50/30 text-amber-600"
                                            : "border-blue-100 hover:border-blue-300 bg-blue-50/30 text-blue-600"
                                    )}
                                >
                                    <div className={cn(
                                        "w-10 h-10 rounded-2xl flex items-center justify-center",
                                        activeTab === "partially_paid" ? "bg-amber-100" : "bg-blue-100"
                                    )}>
                                        <IconFileText className="w-5 h-5" />
                                    </div>
                                    <div className="text-center">
                                        <p className="font-bold text-sm">Preview Design</p>
                                    </div>
                                </motion.button>
                            </div>
                        </div>
                    </div>
                </motion.div>

                {/* Step 2: Upload & Send */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-6"
                >
                    <div className="flex items-start gap-4">
                        <div className={cn(
                            "p-3 rounded-2xl",
                            activeTab === "partially_paid" ? "bg-violet-50 text-violet-600" : "bg-emerald-50 text-emerald-600"
                        )}>
                            <IconMail className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-gray-900">Step 2: Upload & Send</h3>
                            <p className="text-sm text-gray-500">Upload the filled Excel sheet to trigger bulk emails.</p>
                        </div>
                    </div>

                    <form onSubmit={handleUpload} className="flex-1 flex flex-col gap-4">
                        <div className={cn(
                            "flex-1 border-2 border-dashed rounded-3xl transition-all relative group",
                            file ? "border-green-200 bg-green-50/20" : "border-gray-200 hover:border-violet-300 bg-gray-50/50"
                        )}>
                            <input
                                type="file"
                                accept=".xlsx, .xls, .csv"
                                onChange={(e) => setFile(e.target.files?.[0] || null)}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                                {file ? (
                                    <>
                                        <div className="w-12 h-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center mb-4">
                                            <IconCheck className="w-6 h-6" />
                                        </div>
                                        <p className="font-bold text-gray-900">{file.name}</p>
                                        <p className="text-sm text-gray-500 mt-1">Ready to upload</p>
                                    </>
                                ) : (
                                    <>
                                        <IconUpload className="w-12 h-12 text-gray-300 mb-4 group-hover:text-violet-400 transition-colors" />
                                        <p className="font-bold text-gray-900">Choose Excel File</p>
                                        <p className="text-sm text-gray-400 mt-1">or drag and drop here</p>
                                    </>
                                )}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={!file || isUploading}
                            className={cn(
                                "w-full py-4 rounded-2xl text-white font-bold shadow-lg transition-all flex items-center justify-center gap-2",
                                activeTab === "partially_paid" ? "bg-violet-600 hover:bg-violet-700 shadow-violet-200" : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-200",
                                (!file || isUploading) && "opacity-50 cursor-not-allowed shadow-none"
                            )}
                        >
                            {isUploading ? (
                                <IconLoader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <IconMail className="w-5 h-5" />
                            )}
                            {isUploading ? "Processing Bulk Emails..." : "Send Bulk Invoices"}
                        </button>
                    </form>
                </motion.div>
            </div>

            {/* Results / Summary / Progress */}
            <AnimatePresence>
                {uploadStatus !== "idle" && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="space-y-6"
                    >
                        {/* Progress Header */}
                        <div className={cn(
                            "p-6 rounded-3xl border shadow-sm",
                            uploadStatus === "success" ? "bg-green-50/50 border-green-100" : 
                            uploadStatus === "processing" ? "bg-violet-50/50 border-violet-100" :
                            "bg-red-50/50 border-red-100"
                        )}>
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    {uploadStatus === "success" ? (
                                        <IconCheck className="w-6 h-6 text-green-600" />
                                    ) : uploadStatus === "processing" ? (
                                        <IconLoader2 className="w-6 h-6 text-violet-600 animate-spin" />
                                    ) : (
                                        <IconAlertCircle className="w-6 h-6 text-red-600" />
                                    )}
                                    <h4 className="font-bold text-gray-900">
                                        {uploadStatus === "success" ? "Processing Complete" : 
                                         uploadStatus === "processing" ? "Processing Bulk Emails..." : 
                                         "Error Occurred"}
                                    </h4>
                                </div>
                                {progress && (
                                    <span className="text-sm font-bold text-gray-600">
                                        {progress.current} / {progress.total}
                                    </span>
                                )}
                            </div>

                            {/* Progress Bar */}
                            {progress && (
                                <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                                    <motion.div 
                                        className={cn(
                                            "h-full transition-all duration-300",
                                            activeTab === "partially_paid" ? "bg-violet-500" : "bg-emerald-500"
                                        )}
                                        initial={{ width: 0 }}
                                        animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                                    />
                                </div>
                            )}

                            {summary && uploadStatus === "success" && (
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                        <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">Total Rows</p>
                                        <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                        <p className="text-xs text-green-400 font-bold uppercase tracking-wider mb-1">Success</p>
                                        <p className="text-2xl font-bold text-green-600">{summary.success}</p>
                                    </div>
                                    <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100">
                                        <p className="text-xs text-red-400 font-bold uppercase tracking-wider mb-1">Failed</p>
                                        <p className="text-2xl font-bold text-red-600">{summary.failed}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Logs */}
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">
                            <div className="px-6 py-4 border-b border-gray-50 flex items-center justify-between">
                                <h4 className="font-bold text-gray-900">Activity Log</h4>
                                <span className="text-xs text-gray-400 font-medium">Last 50 events</span>
                            </div>
                            <div className="max-h-[300px] overflow-y-auto px-6 py-2">
                                <div className="divide-y divide-gray-50">
                                    {logs.length === 0 ? (
                                        <p className="py-8 text-center text-sm text-gray-400 italic">Waiting for activity...</p>
                                    ) : (
                                        logs.map((log, idx) => (
                                            <div key={idx} className="py-3 flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={cn(
                                                        "w-2 h-2 rounded-full",
                                                        log.status === 'success' ? "bg-green-500" : "bg-red-500"
                                                    )} />
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-900">{log.name}</p>
                                                        <p className="text-xs text-gray-400">{log.email}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={cn(
                                                        "text-[10px] font-bold uppercase px-2 py-0.5 rounded",
                                                        log.status === 'success' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
                                                    )}>
                                                        {log.status === 'success' ? "Sent" : "Failed"}
                                                    </span>
                                                    {log.error && <p className="text-[10px] text-red-400 mt-1">{log.error}</p>}
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
