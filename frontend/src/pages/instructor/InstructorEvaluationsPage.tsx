import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Sidebar, SidebarBody, SidebarLink } from "@/components/ui/sidebar";
import {
    IconLayoutDashboard,
    IconUsers,
    IconBook,
    IconSchool,
    IconSettings,
    IconLogout,
    IconSearch,
    IconVideo,
    IconFile,
    IconBrandZoom,
    IconChecklist,
    IconEdit,
} from "@tabler/icons-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { Logo, LogoIcon } from "../admin/AdminDashboard"; // Reusing Admin Logo logic
import { evaluationApi } from "@/api/endpoints/evaluation";

export const InstructorEvaluationsPage = () => {
    const { user, logout } = useAuthStore();
    const navigate = useNavigate();
    const [open, setOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [pendingAttempts, setPendingAttempts] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const handleLogout = () => {
        logout();
        window.location.href = '/login';
    };

    const links = [
        {
            label: "Dashboard",
            href: "/instructor/batches",
            icon: <IconLayoutDashboard className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
        },
        {
            label: "Webinars",
            href: "/instructor/webinars",
            icon: <IconBrandZoom className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
        },
        {
            label: "Tests",
            href: "/instructor/tests",
            icon: <IconChecklist className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
        },
        {
            label: "Evaluations",
            href: "/instructor/evaluations",
            icon: <IconEdit className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
        },
        {
            label: "Settings",
            href: "/instructor/settings",
            icon: <IconSettings className="h-6 w-6 shrink-0 text-white" strokeWidth={2} />,
        },
    ];

    useEffect(() => {
        fetchPendingEvaluations();
    }, []);

    const fetchPendingEvaluations = async () => {
        try {
            setLoading(true);
            const data = await evaluationApi.getPending();
            setPendingAttempts(data);
        } catch (error) {
            console.error("Error fetching evaluations:", error);
        } finally {
            setLoading(false);
        }
    };

    const filteredAttempts = (pendingAttempts || []).filter((attempt) =>
        attempt.test?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        attempt.student?.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

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
                                label: user?.name || "Instructor",
                                href: "/instructor/profile",
                                icon: (
                                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-bold text-[#3D3532] shadow-sm">
                                        {user?.name?.charAt(0)?.toUpperCase() || 'I'}
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
                <div className="flex h-full w-full flex-1 flex-col gap-5 p-5 md:p-7">
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="mb-2"
                    >
                        <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-2">
                            Pending Evaluations
                        </h1>
                        <p className="text-lg text-gray-500">
                            Grade student submissions and provide feedback.
                        </p>
                    </motion.div>

                    <div className="rounded-[28px] bg-white p-6 shadow-lg">
                        <div className="flex items-center justify-between mb-5">
                            <div className="flex items-center gap-3">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-orange-400 to-red-500 flex items-center justify-center">
                                    <IconEdit className="w-7 h-7 text-white" strokeWidth={2} />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">Submissions</h2>
                                    <p className="mt-0.5 text-xs text-gray-500">
                                        {filteredAttempts.length} pending
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div className="relative mb-6">
                            <IconSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
                            <input
                                type="text"
                                placeholder="Search by test or student name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-xl border-0 bg-gray-50 py-3 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-[#2D2D2D]/20"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredAttempts.map((attempt) => (
                                <motion.div
                                    key={attempt.id}
                                    whileHover={{ scale: 1.02 }}
                                    className="p-5 rounded-2xl bg-gray-50 border border-gray-100 hover:shadow-md transition-all cursor-pointer"
                                    onClick={() => navigate(`/instructor/evaluations/${attempt.id}`)}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div className="bg-white p-2 rounded-lg shadow-sm text-xs font-bold text-gray-700">
                                            Attempt #{attempt.id}
                                        </div>
                                        <span className="text-xs text-gray-500">
                                            {new Date(attempt.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h3 className="font-semibold text-lg text-gray-900 mb-1">{attempt.test?.title}</h3>
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700">
                                            {attempt.student?.name?.charAt(0)}
                                        </div>
                                        <span className="text-sm text-gray-600 truncate">{attempt.student?.name}</span>
                                    </div>
                                    <button className="w-full py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors">
                                        Evaluate Now
                                    </button>
                                </motion.div>
                            ))}
                        </div>

                        {!loading && filteredAttempts.length === 0 && (
                            <div className="text-center py-10 text-gray-500">
                                No pending evaluations found.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
