import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    IconBrandZoom,
    IconCalendar,
    IconClock,
    IconPlayerPlay,
    IconVideo,
    IconExternalLink,
    IconSearch,
    IconFilter,
} from '@tabler/icons-react';
import { cn, formatDateIST, formatTimeIST } from '@/lib/utils';
import { batchesApi } from '@/api/endpoints/batches';
import { liveClassesApi } from '@/api/endpoints/liveClasses';
import { useAuthStore } from '@/store/authStore';
import { toast } from 'react-hot-toast';
import ZoomMeeting from '@/components/Zoom/ZoomMeeting';

// ---------------------------------------------------------------------------
// Countdown Hook
// ---------------------------------------------------------------------------
function useCountdown(targetDate: string) {
    const [timeLeft, setTimeLeft] = useState('');

    useEffect(() => {
        const calc = () => {
            const now = Date.now();
            const target = new Date(targetDate).getTime();
            const diff = target - now;
            if (diff <= 0) { setTimeLeft(''); return; }

            const days = Math.floor(diff / (1000 * 60 * 60 * 24));
            const hrs = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

            if (days > 0) setTimeLeft(`${days}d ${hrs}h`);
            else if (hrs > 0) setTimeLeft(`${hrs}h ${mins}m`);
            else setTimeLeft(`${mins}m`);
        };
        calc();
        const interval = setInterval(calc, 60000);
        return () => clearInterval(interval);
    }, [targetDate]);

    return timeLeft;
}

const CountdownBadge: React.FC<{ startTime: string }> = ({ startTime }) => {
    const timeLeft = useCountdown(startTime);
    if (!timeLeft) return null;
    return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-violet-50 text-violet-600 text-[10px] font-bold">
            <IconClock size={11} />
            Starts in {timeLeft}
        </span>
    );
};

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export const StudentLiveClassesPage = () => {
    const [batches, setBatches] = useState<any[]>([]);
    const [liveClasses, setLiveClasses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedBatchId, setSelectedBatchId] = useState<string>('all');
    const [activeZoomMeeting, setActiveZoomMeeting] = useState<any>(null);
    const { user } = useAuthStore();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const { batches } = await batchesApi.getStudentBatches();
            setBatches(batches);
            const allClasses: any[] = [];
            for (const batch of batches) {
                try {
                    const { liveClasses } = await liveClassesApi.listByBatch(batch.id);
                    allClasses.push(...liveClasses.map((lc: any) => ({ ...lc, batch })));
                } catch {}
            }
            setLiveClasses(allClasses);
        } catch (error) {
            console.error('Error fetching live classes:', error);
            toast.error('Failed to load live classes');
        } finally {
            setLoading(false);
        }
    };

    const upcomingClasses = useMemo(() => {
        return liveClasses
            .filter((lc) => lc.status === 'scheduled' || lc.status === 'live')
            .filter((lc) => selectedBatchId === 'all' || lc.batch?.id === selectedBatchId)
            .filter((lc) => !searchQuery || (lc.topic || lc.title || '').toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
    }, [liveClasses, selectedBatchId, searchQuery]);

    const pastClasses = useMemo(() => {
        return liveClasses
            .filter((lc) => lc.status === 'completed' || lc.status === 'cancelled')
            .filter((lc) => selectedBatchId === 'all' || lc.batch?.id === selectedBatchId)
            .filter((lc) => !searchQuery || (lc.topic || lc.title || '').toLowerCase().includes(searchQuery.toLowerCase()))
            .sort((a, b) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
    }, [liveClasses, selectedBatchId, searchQuery]);

    const displayedClasses = activeTab === 'upcoming' ? upcomingClasses : pastClasses;

    const formatDateTime = (dateStr: string) => {
        return {
            date: formatDateIST(dateStr),
            time: formatTimeIST(dateStr),
        };
    };

    const formatDuration = (minutes?: number) => {
        if (!minutes) return '--';
        if (minutes < 60) return `${minutes} min`;
        const hrs = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hrs}h ${mins}m` : `${hrs}h`;
    };

    const statusConfig: Record<string, { label: string; bg: string; text: string; dot?: string }> = {
        scheduled: { label: 'Scheduled', bg: 'bg-blue-50', text: 'text-blue-700' },
        live: { label: 'LIVE NOW', bg: 'bg-green-50', text: 'text-green-700', dot: 'bg-green-500' },
        completed: { label: 'Completed', bg: 'bg-gray-100', text: 'text-gray-600' },
        cancelled: { label: 'Cancelled', bg: 'bg-red-50', text: 'text-red-600' },
    };

    const handleJoinClass = async (lcId: number) => {
        try {
            const signatureResponse = await liveClassesApi.getSignature(lcId, { role: 0 });
            setActiveZoomMeeting(signatureResponse);
        } catch (error: any) {
            console.error('Error getting Zoom signature:', error);
            toast.error(error.response?.data?.message || 'Failed to join meeting');
        }
    };

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6"
            >
                <div>
                    <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-2">
                        Live Classes
                    </h1>
                    <p className="text-gray-500 text-lg">
                        Join scheduled sessions and access past recordings
                    </p>
                </div>

                {/* Tab Toggle */}
                <div className="flex items-center gap-2 p-1.5 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <button
                        onClick={() => setActiveTab('upcoming')}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all',
                            activeTab === 'upcoming'
                                ? 'bg-gray-900 text-white shadow-md'
                                : 'text-gray-500 hover:bg-gray-50'
                        )}
                    >
                        <IconBrandZoom size={18} />
                        Upcoming
                    </button>
                    <button
                        onClick={() => setActiveTab('past')}
                        className={cn(
                            'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all',
                            activeTab === 'past'
                                ? 'bg-gray-900 text-white shadow-md'
                                : 'text-gray-500 hover:bg-gray-50'
                        )}
                    >
                        <IconClock size={18} />
                        Past
                    </button>
                </div>
            </motion.div>

            {/* Search & Filters */}
            {liveClasses.length > 0 && (
                <div className="mb-6 flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <IconSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
                        <input
                            type="text"
                            placeholder="Search classes..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-xl border-0 bg-white py-3 pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                        />
                    </div>
                    <div className="relative w-full sm:w-auto sm:min-w-[200px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <IconFilter className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                            value={selectedBatchId}
                            onChange={(e) => setSelectedBatchId(e.target.value)}
                            className="pl-10 pr-10 py-2.5 w-full rounded-xl border border-gray-200 bg-white text-gray-700 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 appearance-none cursor-pointer font-medium text-sm"
                        >
                            <option value="all">All Batches</option>
                            {batches.map((b) => (
                                <option key={b.id} value={b.id}>{b.batch_name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
                </div>
            ) : displayedClasses.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex flex-col items-center justify-center h-80 bg-white rounded-2xl border border-gray-200"
                >
                    <IconVideo className="w-16 h-16 text-gray-300 mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 mb-1">
                        No {activeTab === 'upcoming' ? 'upcoming' : 'past'} classes
                    </h3>
                    <p className="text-gray-500 text-sm">
                        {activeTab === 'upcoming'
                            ? 'There are no scheduled live classes at the moment.'
                            : 'No past live classes to show yet.'}
                    </p>
                </motion.div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4 md:gap-6">
                    {displayedClasses.map((lc, idx) => {
                        const { date, time } = formatDateTime(lc.start_time);
                        const status = statusConfig[lc.status] || statusConfig.scheduled;

                        return (
                            <motion.div
                                key={lc.id}
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                className="group bg-white rounded-2xl border border-gray-200 hover:shadow-xl hover:border-violet-300 transition-all overflow-hidden"
                            >
                                <div className="p-4 sm:p-5 md:p-6">
                                    {/* Status Badge */}
                                    <div className="flex items-center justify-between mb-4">
                                        <span
                                            className={cn(
                                                'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold',
                                                status.bg,
                                                status.text
                                            )}
                                        >
                                            {lc.status === 'live' && (
                                                <span className="relative flex h-2 w-2">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                                                </span>
                                            )}
                                            {status.label}
                                        </span>
                                        <span className="px-2.5 py-1 rounded-lg bg-gray-50 text-gray-500 text-[10px] font-bold uppercase tracking-wider border border-gray-100">
                                            {lc.batch?.batch_name || lc.batch?.name || 'Batch'}
                                        </span>
                                    </div>

                                    {/* Title */}
                                    <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2 group-hover:text-violet-600 transition-colors">
                                        {lc.topic || lc.title || 'Live Class'}
                                    </h3>

                                    {/* Date, Time, Duration + Countdown */}
                                    <div className="space-y-2 mb-5">
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <IconCalendar size={16} className="text-gray-400" />
                                            <span>{date}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-gray-500">
                                            <IconClock size={16} className="text-gray-400" />
                                            <span>{time}</span>
                                            {lc.duration && (
                                                <>
                                                    <span className="text-gray-300">|</span>
                                                    <span>{formatDuration(lc.duration)}</span>
                                                </>
                                            )}
                                        </div>
                                        {lc.status === 'scheduled' && (
                                            <CountdownBadge startTime={lc.start_time} />
                                        )}
                                    </div>

                                    {/* Action Buttons */}
                                    {(lc.status === 'scheduled' || lc.status === 'live') && lc.zoom_join_url && (
                                        <button
                                            onClick={() => handleJoinClass(lc.id)}
                                            className={cn(
                                                'flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold transition-all',
                                                lc.status === 'live'
                                                    ? 'bg-green-600 hover:bg-green-700 text-white shadow-md'
                                                    : 'bg-gray-900 hover:bg-gray-800 text-white shadow-md'
                                            )}
                                        >
                                            <IconBrandZoom size={18} />
                                            Join Class
                                        </button>
                                    )}

                                    {lc.status === 'completed' && lc.recording_url && (
                                        <a
                                            href={lc.recording_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white shadow-md transition-all"
                                        >
                                            <IconPlayerPlay size={18} />
                                            Watch Recording
                                            <IconExternalLink size={14} />
                                        </a>
                                    )}

                                    {lc.status === 'completed' && !lc.recording_url && (
                                        <div className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold bg-gray-50 text-gray-400 border border-gray-100">
                                            <IconVideo size={18} />
                                            No Recording Available
                                        </div>
                                    )}

                                    {lc.status === 'cancelled' && (
                                        <div className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-bold bg-red-50 text-red-400 border border-red-100">
                                            Cancelled
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            <AnimatePresence>
                {activeZoomMeeting && user && (
                    <ZoomMeeting
                        status={true}
                        meetingNumber={activeZoomMeeting.meetingNumber}
                        userName={user.name}
                        userEmail={user.email}
                        signature={activeZoomMeeting.signature}
                        sdkKey={activeZoomMeeting.sdkKey}
                        passWord={activeZoomMeeting.passWord}
                        tk={activeZoomMeeting.tk}
                        zak={activeZoomMeeting.zak}
                        onLeave={() => setActiveZoomMeeting(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
};
