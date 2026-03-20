import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    IconVideo,
    IconPlayerPlay,
    IconFilter,
    IconClock,
    IconCalendar,
    IconLayoutGrid,
    IconLayoutList,
    IconSearch,
    IconX,
    IconSortAscending,
    IconSortDescending,
} from '@tabler/icons-react';
import { videosApi } from '@/api/endpoints/videos';
import { topicsApi } from '@/api/endpoints/topics';
import type { Video, Topic } from '@/types';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { TopicAccordion } from '@/components/topics/TopicAccordion';

// ---------------------------------------------------------------------------
// Video Player Modal
// ---------------------------------------------------------------------------
const VideoPlayerModal: React.FC<{
    video: Video | null;
    onClose: () => void;
}> = ({ video, onClose }) => {
    const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
    const [muxPlaybackId, setMuxPlaybackId] = useState<string | null>(null);
    const [loadingPlayback, setLoadingPlayback] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!video) return;
        setLoadingPlayback(true);
        setError(null);
        videosApi.getPlaybackUrl(video.id)
            .then((res: any) => {
                setPlaybackUrl(res.playback_url || res.playbackUrl);
                setMuxPlaybackId(res.mux_playback_id || null);
            })
            .catch(() => setError('Playback not available for this video.'))
            .finally(() => setLoadingPlayback(false));
    }, [video]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handleEsc);
        return () => window.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    // Save to recently watched
    useEffect(() => {
        if (!video) return;
        try {
            const key = 'lms_recent_videos';
            const recent = JSON.parse(localStorage.getItem(key) || '[]');
            const filtered = recent.filter((r: any) => r.id !== video.id);
            filtered.unshift({ id: video.id, title: video.title, watchedAt: new Date().toISOString() });
            localStorage.setItem(key, JSON.stringify(filtered.slice(0, 10)));
        } catch {}
    }, [video]);

    if (!video) return null;

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25 }}
                    className="bg-gray-900 rounded-2xl overflow-hidden w-full max-w-4xl shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 bg-gray-800/50">
                        <h3 className="text-white font-bold text-sm sm:text-base truncate pr-4">{video.title}</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors shrink-0">
                            <IconX size={20} />
                        </button>
                    </div>

                    {/* Video Area */}
                    <div className="relative aspect-video bg-black">
                        {loadingPlayback ? (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <div className="w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        ) : error ? (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                                <IconVideo className="w-16 h-16 text-gray-600 mb-4" />
                                <p className="text-gray-400 font-medium">{error}</p>
                            </div>
                        ) : muxPlaybackId ? (
                            <iframe
                                src={`https://player.mux.com/${muxPlaybackId}?autoplay=1`}
                                className="w-full h-full"
                                allow="autoplay; fullscreen; picture-in-picture"
                                allowFullScreen
                                title={video.title}
                            />
                        ) : playbackUrl ? (
                            <video
                                src={playbackUrl}
                                controls
                                autoPlay
                                className="w-full h-full"
                            />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <IconVideo className="w-16 h-16 text-gray-600 mb-4" />
                                <p className="text-gray-400">No playback available</p>
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="px-4 sm:px-6 py-3 sm:py-4 bg-gray-800/30 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                        {video.duration && (
                            <span className="flex items-center gap-1">
                                <IconClock size={14} />
                                {Math.floor(video.duration / 60)}:{(video.duration % 60).toString().padStart(2, '0')}
                            </span>
                        )}
                        {video.language && (
                            <span className="px-2 py-0.5 rounded bg-gray-700 text-gray-300 uppercase font-bold tracking-wider">
                                {video.language}
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <IconCalendar size={14} />
                            {new Date(video.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------
export const StudentVideosPage = () => {
    const [allVideos, setAllVideos] = useState<Video[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('');
    const [viewMode, setViewMode] = useState<'topic' | 'grid'>('topic');
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title_asc' | 'title_desc'>('newest');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [{ videos }, { topics: topicData }] = await Promise.all([
                videosApi.list(),
                topicsApi.listByBatch('enrolled')
            ]).catch(async (err) => {
                const { videos: v } = await videosApi.list();
                return [{ videos: v }, { topics: [] as Topic[] }];
            }) as [{ videos: Video[] }, { topics: Topic[] }];

            setAllVideos(videos);
            setTopics(topicData || []);
        } catch (error) {
            console.error('Error fetching student video data:', error);
            toast.error('Failed to load video library');
        } finally {
            setLoading(false);
        }
    };

    const sortVideos = (videos: Video[]) => {
        return [...videos].sort((a, b) => {
            switch (sortBy) {
                case 'newest': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case 'title_asc': return a.title.localeCompare(b.title);
                case 'title_desc': return b.title.localeCompare(a.title);
                default: return 0;
            }
        });
    };

    // Group videos by topic
    const groupedTopics = useMemo(() => {
        const filtered = allVideos.filter(v =>
            (!selectedLanguage || v.language === selectedLanguage) &&
            (!searchQuery || v.title.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        const topicList: Topic[] = topics.map(t => ({
            ...t,
            videos: sortVideos(filtered.filter(v => String(v.topic_id) === String(t.id)))
        }));

        const untrackedVideos = filtered.filter(v => !v.topic_id);
        if (untrackedVideos.length > 0) {
            topicList.push({
                id: 0,
                title: 'General Resources',
                description: 'Videos not assigned to a specific module',
                order_index: 999,
                batch_id: 'all',
                createdAt: '',
                updatedAt: '',
                videos: sortVideos(untrackedVideos)
            });
        }

        return topicList.sort((a, b) => a.order_index - b.order_index);
    }, [allVideos, topics, selectedLanguage, searchQuery, sortBy]);

    const filteredAndSorted = useMemo(() => {
        const filtered = allVideos.filter(v =>
            (!selectedLanguage || v.language === selectedLanguage) &&
            (!searchQuery || v.title.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        return sortVideos(filtered);
    }, [allVideos, selectedLanguage, searchQuery, sortBy]);

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleVideoClick = (video: any) => {
        setSelectedVideo(video as Video);
    };

    return (
        <div className="max-w-7xl mx-auto">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-6"
            >
                <div>
                    <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-2">
                        Video Library
                    </h1>
                    <p className="text-gray-500 text-lg">
                        Structured learning content organized for your progress
                    </p>
                </div>

                <div className="flex items-center gap-2 p-1.5 bg-white rounded-2xl shadow-sm border border-gray-100">
                    <button
                        onClick={() => setViewMode('topic')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                            viewMode === 'topic' ? "bg-gray-900 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
                        )}
                    >
                        <IconLayoutList size={18} />
                        Topic View
                    </button>
                    <button
                        onClick={() => setViewMode('grid')}
                        className={cn(
                            "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all",
                            viewMode === 'grid' ? "bg-gray-900 text-white shadow-md" : "text-gray-500 hover:bg-gray-50"
                        )}
                    >
                        <IconLayoutGrid size={18} />
                        Grid View
                    </button>
                </div>
            </motion.div>

            {/* Filters */}
            {allVideos.length > 0 && (
                <div className="mb-8 flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[200px]">
                        <IconSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
                        <input
                            type="text"
                            placeholder="Search videos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-xl border-0 bg-white py-3 pl-10 pr-4 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20"
                        />
                    </div>
                    <div className="relative w-full sm:w-auto sm:min-w-[180px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <IconFilter className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                            value={selectedLanguage}
                            onChange={(e) => setSelectedLanguage(e.target.value)}
                            className="pl-10 pr-10 py-2.5 w-full rounded-xl border border-gray-200 bg-white text-gray-700 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 appearance-none cursor-pointer font-medium text-sm"
                        >
                            <option value="">All Languages</option>
                            {Array.from(new Set(allVideos.map(v => v.language).filter(Boolean))).sort().map(lang => (
                                <option key={lang} value={lang!}>{lang}</option>
                            ))}
                        </select>
                    </div>
                    <div className="relative w-full sm:w-auto sm:min-w-[180px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            {sortBy.includes('desc') || sortBy === 'oldest' ? <IconSortDescending className="h-5 w-5 text-gray-400" /> : <IconSortAscending className="h-5 w-5 text-gray-400" />}
                        </div>
                        <select
                            value={sortBy}
                            onChange={(e) => setSortBy(e.target.value as any)}
                            className="pl-10 pr-10 py-2.5 w-full rounded-xl border border-gray-200 bg-white text-gray-700 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 appearance-none cursor-pointer font-medium text-sm"
                        >
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="title_asc">Title A-Z</option>
                            <option value="title_desc">Title Z-A</option>
                        </select>
                    </div>
                </div>
            )}

            {/* Content Area */}
            {loading ? (
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
                </div>
            ) : viewMode === 'topic' ? (
                <TopicAccordion
                    topics={groupedTopics}
                    resourceType="video"
                    onResourceClick={handleVideoClick}
                />
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
                    {filteredAndSorted.map((video, idx) => (
                        <motion.div
                            key={video.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => handleVideoClick(video)}
                            className="group relative bg-white rounded-2xl overflow-hidden border border-gray-200 hover:shadow-xl hover:border-violet-300 transition-all cursor-pointer"
                        >
                            <div className="relative aspect-video bg-gray-900">
                                {video.thumbnail_url ? (
                                    <img
                                        src={video.thumbnail_url}
                                        alt={video.title}
                                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-900 to-gray-900 group-hover:from-violet-800 group-hover:to-gray-800 transition-all">
                                        <IconVideo className="w-12 h-12 text-gray-600 group-hover:text-gray-500" />
                                    </div>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[2px]">
                                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform">
                                        <IconPlayerPlay className="w-5 h-5 text-gray-900 fill-current ml-1" />
                                    </div>
                                </div>
                                <div className="absolute bottom-3 right-3 px-2 py-1 rounded-lg bg-black/70 text-white text-[10px] font-bold backdrop-blur-md">
                                    {formatDuration(video.duration)}
                                </div>
                            </div>

                            <div className="p-3 sm:p-4 md:p-5">
                                <h3 className="text-base font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-violet-500 transition-colors" title={video.title}>
                                    {video.title}
                                </h3>
                                <div className="flex items-center justify-between mt-auto">
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 flex items-center gap-1">
                                            <IconCalendar size={12} />
                                            {new Date(video.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    {video.language && (
                                        <span className="px-2.5 py-1 rounded-lg bg-gray-50 text-gray-500 text-[10px] font-bold uppercase tracking-wider border border-gray-100">
                                            {video.language}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Video Player Modal */}
            {selectedVideo && (
                <VideoPlayerModal
                    video={selectedVideo}
                    onClose={() => setSelectedVideo(null)}
                />
            )}
        </div>
    );
};
