import { useState, useEffect } from "react";
import {
    IconSearch,
    IconFileInvoice,
    IconDownload,
    IconEye,
    IconFilter,
    IconLayoutDashboard,
    IconUsers,
    IconBook,
    IconSchool,
    IconSettings,
    IconLogout,
    IconVideo,
    IconFile,
    IconBrandZoom,
    IconChecklist,
    IconPlus,
} from "@tabler/icons-react";
import { invoicesApi } from "@/api/endpoints/invoices";
import type { Invoice } from "@/types";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import { useAuthStore } from "@/store/authStore";
import { Logo, LogoIcon } from "./AdminDashboard";
import { CreateInvoiceModal } from "@/components/invoices/CreateInvoiceModal";

export const InvoicesPage = () => {
    const { user, logout } = useAuthStore();
    const [open, setOpen] = useState(false);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    const links = [
        {
            label: "Dashboard",
            href: "/admin/dashboard",
            icon: <IconLayoutDashboard className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
        },
        {
            label: "Users",
            href: "/admin/users",
            icon: <IconUsers className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
        },
        {
            label: "Courses",
            href: "/admin/courses",
            icon: <IconBook className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
        },
        {
            label: "Batches",
            href: "/admin/batches",
            icon: <IconSchool className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
        },
        {
            label: "Tests",
            href: "/admin/tests",
            icon: <IconChecklist className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
        },
        {
            label: "Videos",
            href: "/admin/videos",
            icon: <IconVideo className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
        },
        {
            label: "Documents",
            href: "/admin/documents",
            icon: <IconFile className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
        },
        {
            label: "Live Classes",
            href: "/admin/live-classes",
            icon: <IconBrandZoom className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
        },
        {
            label: "Webinars",
            href: "/admin/webinars",
            icon: <IconBrandZoom className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
        },
        {
            label: "Invoices",
            href: "/admin/invoices",
            icon: <IconFileInvoice className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
        },
        {
            label: "Settings",
            href: "/admin/settings",
            icon: <IconSettings className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
        },
    ];

    useEffect(() => {
        fetchInvoices();
    }, [page, search, statusFilter]);

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

    const getStatusColor = (status: string) => {
        switch (status) {
            case "paid":
                return "bg-green-100 text-green-700";
            case "pending":
                return "bg-yellow-100 text-yellow-700";
            case "cancelled":
                return "bg-red-100 text-red-700";
            default:
                return "bg-gray-100 text-gray-700";
        }
    };

    return (
        <div className="flex w-full h-screen bg-[#E8E6E1]">
            <Sidebar open={open} setOpen={setOpen}>
                <SidebarBody className="justify-between gap-10">
                    <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto">
                        {open ? <Logo /> : <LogoIcon />}
                        <div className="mt-8 flex flex-col gap-1">
                            {links.map((link, idx) => (
                                <SidebarLink key={idx} link={link} />
                            ))}
                        </div>
                    </div>
                    <div>
                        <SidebarLink
                            link={{
                                label: user?.name || "Admin",
                                href: "/admin/profile",
                                icon: (
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-[#3D3532] shadow-sm">
                                        {user?.name?.charAt(0)?.toUpperCase() || 'A'}
                                    </div>
                                ),
                            }}
                        />
                        <button
                            onClick={handleLogout}
                            className="mt-2 flex w-full items-center gap-3 py-3 px-3 rounded-lg transition-all duration-200 hover:bg-white/10 text-white"
                            title="Logout"
                        >
                            <IconLogout className="h-6 w-6 shrink-0" strokeWidth={2} />
                            <motion.span
                                animate={{
                                    display: open ? "inline-block" : "none",
                                    opacity: open ? 1 : 0,
                                }}
                                className="!m-0 inline-block whitespace-pre !p-0 text-sm font-semibold"
                            >
                                Logout
                            </motion.span>
                        </button>
                    </div>
                </SidebarBody>
            </Sidebar>

            <div className="flex flex-1 overflow-auto">
                <div className="flex h-full w-full flex-1 flex-col gap-6 p-6 md:p-10">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-[24px] bg-white p-6 shadow-lg">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Invoices</h1>
                            <p className="text-gray-500 mt-1">Manage and track all student invoices</p>
                        </div>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="flex items-center gap-2 rounded-xl bg-[#2D2D2D] px-5 py-3 text-sm font-bold text-white shadow-lg hover:shadow-xl transition-all hover:bg-[#2D2D2D]/90"
                        >
                            <IconPlus className="h-5 w-5" strokeWidth={2.5} />
                            Create Invoice
                        </button>
                    </div>

                    {/* Filters */}
                    <div className="rounded-[24px] bg-white p-6 shadow-lg">
                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative">
                                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                <input
                                    type="text"
                                    placeholder="Search by invoice number..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                />
                            </div>
                            <div className="w-full md:w-48">
                                <div className="relative">
                                    <IconFilter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
                                    <select
                                        value={statusFilter}
                                        onChange={(e) => setStatusFilter(e.target.value)}
                                        className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 appearance-none bg-white"
                                    >
                                        <option value="">All Status</option>
                                        <option value="paid">Paid</option>
                                        <option value="pending">Pending</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Invoices List */}
                    <div className="rounded-[24px] bg-white shadow-lg overflow-hidden">
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
                                                    ₹{invoice.total}
                                                </td>
                                                <td className="px-6 py-4 text-sm text-gray-600">
                                                    {new Date(invoice.issued_at).toLocaleDateString()}
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
                                                        <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                                                            <IconDownload className="w-5 h-5" />
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
                </div>
            </div>

            <AnimatePresence>
                {showCreateModal && (
                    <CreateInvoiceModal
                        onClose={() => setShowCreateModal(false)}
                        onSuccess={() => {
                            fetchInvoices();
                            setShowCreateModal(false);
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
