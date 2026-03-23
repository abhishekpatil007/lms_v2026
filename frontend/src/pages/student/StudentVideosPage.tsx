import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    IconVideo,
    IconPlayerPlay,
    IconClock,
    IconCalendar,
    IconLayoutGrid,
    IconLayoutList,
    IconSearch,
    IconX,
    IconChevronLeft,
    IconChevronRight,
    IconPlayerSkipForward,
    IconPlayerSkipBack,
    IconKeyboard,
} from '@tabler/icons-react';
import { videosApi } from '@/api/endpoints/videos';
import { topicsApi } from '@/api/endpoints/topics';
import type { Video, Topic } from '@/types';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { TopicAccordion } from '@/components/topics/TopicAccordion';

// ---------------------------------------------------------------------------
// Watch Progress helpers (localStorage)
// ---------------------------------------------------------------------------
const PROGRESS_KEY = 'lms_video_progress';
const RECENT_KEY = 'lms_recent_videos';

interface WatchProgress {
    videoId: string;
    currentTime: number;
    duration: number;
    percent: number;
    updatedAt: string;
}

const getProgressMap = (): Record<string, WatchProgress> => {
    try { return JSON.parse(localStorage.getItem(PROGRESS_KEY) || '{}'); } catch { return {}; }
};

const saveProgress = (videoId: string, currentTime: number, duration: number) => {
    if (!duration || duration <= 0) return;
    const map = getProgressMap();
    const percent = Math.min(Math.round((currentTime / duration) * 100), 100);
    map[videoId] = { videoId, currentTime, duration, percent, updatedAt: new Date().toISOString() };
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
};

const getProgress = (videoId: string): WatchProgress | null => {
    return getProgressMap()[videoId] || null;
};

const saveRecentVideo = (video: Video) => {
    try {
        const recent = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
        const filtered = recent.filter((r: any) => r.id !== video.id);
        filtered.unshift({
            id: video.id,
            title: video.title,
            thumbnail_url: video.thumbnail_url,
            duration: video.duration,
            language: video.language,
            watchedAt: new Date().toISOString(),
        });
        localStorage.setItem(RECENT_KEY, JSON.stringify(filtered.slice(0, 20)));
    } catch {}
};

const formatDuration = (seconds?: number) => {
    if (!seconds) return '00:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatTimeShort = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// ---------------------------------------------------------------------------
// Enhanced Video Player Modal
// ---------------------------------------------------------------------------
const VideoPlayerModal: React.FC<{
    video: Video | null;
    onClose: () => void;
    allVideos: Video[];
    onNavigate: (video: Video) => void;
}> = ({ video, onClose, allVideos, onNavigate }) => {
    const [playbackUrl, setPlaybackUrl] = useState<string | null>(null);
    const [muxPlaybackId, setMuxPlaybackId] = useState<string | null>(null);
    const [loadingPlayback, setLoadingPlayback] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showShortcuts, setShowShortcuts] = useState(false);
    const iframeRef = useRef<HTMLIFrameElement>(null);

    // Find prev/next videos
    const currentIndex = allVideos.findIndex(v => v.id === video?.id);
    const prevVideo = currentIndex > 0 ? allVideos[currentIndex - 1] : null;
    const nextVideo = currentIndex < allVideos.length - 1 ? allVideos[currentIndex + 1] : null;

    useEffect(() => {
        if (!video) return;
        setLoadingPlayback(true);
        setError(null);
        setPlaybackUrl(null);
        setMuxPlaybackId(null);
        videosApi.getPlaybackUrl(video.id)
            .then((res: any) => {
                setPlaybackUrl(res.playback_url || res.playbackUrl);
                setMuxPlaybackId(res.mux_playback_id || null);
            })
            .catch(() => setError('Playback not available for this video.'))
            .finally(() => setLoadingPlayback(false));
    }, [video]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'n' || e.key === 'N') { if (nextVideo) onNavigate(nextVideo); }
            if (e.key === 'p' || e.key === 'P') { if (prevVideo) onNavigate(prevVideo); }
            if (e.key === '?') setShowShortcuts(s => !s);
        };
        window.addEventListener('keydown', handleKey);
        return () => window.removeEventListener('keydown', handleKey);
    }, [onClose, nextVideo, prevVideo, onNavigate]);

    // Save to recently watched & track progress
    useEffect(() => {
        if (!video) return;
        saveRecentVideo(video);

        // Poll Mux player for progress via postMessage
        const interval = setInterval(() => {
            if (video.duration) {
                // We approximate progress — Mux iframe doesn't easily expose currentTime
                // We save "started" as progress when video is opened
                const existing = getProgress(video.id);
                if (!existing) {
                    saveProgress(video.id, 0, video.duration);
                }
            }
        }, 5000);
        return () => clearInterval(interval);
    }, [video]);

    if (!video) return null;

    const progress = getProgress(video.id);

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
                    className="bg-gray-900 rounded-2xl overflow-hidden w-full max-w-5xl shadow-2xl"
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header with nav */}
                    <div className="flex items-center justify-between px-4 sm:px-6 py-3 bg-gray-800/50">
                        <div className="flex items-center gap-3 min-w-0">
                            <button
                                onClick={() => prevVideo && onNavigate(prevVideo)}
                                disabled={!prevVideo}
                                className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Previous video (P)"
                            >
                                <IconPlayerSkipBack size={18} />
                            </button>
                            <h3 className="text-white font-bold text-sm sm:text-base truncate">{video.title}</h3>
                            <button
                                onClick={() => nextVideo && onNavigate(nextVideo)}
                                disabled={!nextVideo}
                                className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                title="Next video (N)"
                            >
                                <IconPlayerSkipForward size={18} />
                            </button>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => setShowShortcuts(s => !s)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all"
                                title="Keyboard shortcuts (?)"
                            >
                                <IconKeyboard size={18} />
                            </button>
                            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all">
                                <IconX size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Shortcuts overlay */}
                    <AnimatePresence>
                        {showShortcuts && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-gray-800 border-b border-gray-700 overflow-hidden"
                            >
                                <div className="px-4 sm:px-6 py-3 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                    {[
                                        ['Esc', 'Close player'],
                                        ['N', 'Next video'],
                                        ['P', 'Previous video'],
                                        ['?', 'Toggle shortcuts'],
                                        ['F', 'Fullscreen'],
                                        ['M', 'Mute/Unmute'],
                                        ['←/→', 'Seek ±10s'],
                                        ['Space', 'Play/Pause'],
                                    ].map(([key, desc]) => (
                                        <div key={key} className="flex items-center gap-2">
                                            <kbd className="px-1.5 py-0.5 rounded bg-gray-700 text-gray-300 font-mono text-[10px] min-w-[28px] text-center">{key}</kbd>
                                            <span className="text-gray-400">{desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

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
                                ref={iframeRef}
                                src={`https://player.mux.com/${muxPlaybackId}?autoplay=1${progress && progress.currentTime > 10 ? `&start_time=${Math.floor(progress.currentTime)}` : ''}`}
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

                    {/* Footer info */}
                    <div className="px-4 sm:px-6 py-3 bg-gray-800/30">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-3 text-xs text-gray-400">
                                {video.duration != null && (
                                    <span className="flex items-center gap-1">
                                        <IconClock size={14} />
                                        {formatDuration(video.duration)}
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
                            {/* Next video preview */}
                            {nextVideo && (
                                <button
                                    onClick={() => onNavigate(nextVideo)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white transition-all text-xs"
                                >
                                    <span className="hidden sm:inline">Up next:</span>
                                    <span className="font-medium truncate max-w-[150px]">{nextVideo.title}</span>
                                    <IconChevronRight size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    );
};

// ---------------------------------------------------------------------------
// Continue Watching Carousel
// ---------------------------------------------------------------------------
const ContinueWatchingCarousel: React.FC<{
    videos: Video[];
    onVideoClick: (video: Video) => void;
}> = ({ videos, onVideoClick }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const progressMap = getProgressMap();

    // Match recent entries with actual video data and filter those with progress
    const continueList = videos
        .filter(v => {
            const p = progressMap[v.id];
            return p && p.percent > 0 && p.percent < 95;
        })
        .sort((a, b) => {
            const pa = progressMap[a.id];
            const pb = progressMap[b.id];
            return new Date(pb.updatedAt).getTime() - new Date(pa.updatedAt).getTime();
        })
        .slice(0, 10);

    const scroll = (dir: 'left' | 'right') => {
        if (scrollRef.current) {
            scrollRef.current.scrollBy({ left: dir === 'left' ? -300 : 300, behavior: 'smooth' });
        }
    };

    if (continueList.length === 0) return null;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
        >
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h2 className="text-lg font-bold text-gray-900">Continue Watching</h2>
                    <p className="text-xs text-gray-500 mt-0.5">Pick up where you left off</p>
                </div>
                <div className="flex gap-1.5">
                    <button onClick={() => scroll('left')} className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-all">
                        <IconChevronLeft size={16} />
                    </button>
                    <button onClick={() => scroll('right')} className="p-1.5 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-all">
                        <IconChevronRight size={16} />
                    </button>
                </div>
            </div>
            <div ref={scrollRef} className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide scroll-smooth -mx-1 px-1">
                {continueList.map((video) => {
                    const progress = progressMap[video.id];
                    return (
                        <div
                            key={video.id}
                            onClick={() => onVideoClick(video)}
                            className="group shrink-0 w-[260px] sm:w-[280px] rounded-2xl overflow-hidden bg-white border border-gray-200 hover:shadow-lg hover:border-violet-300 transition-all cursor-pointer"
                        >
                            <div className="relative aspect-video bg-gray-900">
                                {video.thumbnail_url ? (
                                    <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-900 to-gray-900">
                                        <IconVideo className="w-10 h-10 text-gray-600" />
                                    </div>
                                )}
                                {/* Resume overlay */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 backdrop-blur-[2px]">
                                    <div className="flex items-center gap-2 bg-white/95 rounded-full px-4 py-2 shadow-lg">
                                        <IconPlayerPlay className="w-4 h-4 text-violet-600 fill-current" />
                                        <span className="text-sm font-bold text-gray-900">Resume</span>
                                    </div>
                                </div>
                                {/* Duration */}
                                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold backdrop-blur-md">
                                    {formatDuration(video.duration)}
                                </div>
                                {/* Progress bar */}
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                                    <div
                                        className="h-full bg-violet-500 rounded-r-full transition-all"
                                        style={{ width: `${progress.percent}%` }}
                                    />
                                </div>
                            </div>
                            <div className="p-3">
                                <h4 className="text-sm font-bold text-gray-900 line-clamp-1 group-hover:text-violet-600 transition-colors">{video.title}</h4>
                                <p className="text-[10px] text-gray-400 mt-1 font-medium">
                                    {formatTimeShort(progress.currentTime)} / {formatDuration(video.duration)} · {progress.percent}% watched
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </motion.div>
    );
};

// ---------------------------------------------------------------------------
// Video Card with Progress
// ---------------------------------------------------------------------------
const VideoCard: React.FC<{
    video: Video;
    idx: number;
    onClick: (video: Video) => void;
}> = ({ video, idx, onClick }) => {
    const progress = getProgress(video.id);
    const hasProgress = progress && progress.percent > 0;
    const isCompleted = progress && progress.percent >= 95;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.03 }}
            onClick={() => onClick(video)}
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
                {/* Hover overlay */}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[2px]">
                    <div className="flex items-center gap-2 bg-white/95 rounded-full px-4 py-2 shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                        <IconPlayerPlay className="w-4 h-4 text-violet-600 fill-current" />
                        <span className="text-sm font-bold text-gray-900">
                            {hasProgress && !isCompleted ? 'Resume' : isCompleted ? 'Rewatch' : 'Play'}
                        </span>
                    </div>
                </div>
                {/* Duration badge */}
                <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold backdrop-blur-md">
                    {formatDuration(video.duration)}
                </div>
                {/* Completed badge */}
                {isCompleted && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-lg bg-emerald-500/90 text-white text-[10px] font-bold backdrop-blur-sm flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        Watched
                    </div>
                )}
                {/* Progress bar */}
                {hasProgress && !isCompleted && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                        <div
                            className="h-full bg-violet-500 rounded-r-full"
                            style={{ width: `${progress.percent}%` }}
                        />
                    </div>
                )}
            </div>

            <div className="p-3 sm:p-4">
                <h3 className="text-sm sm:text-base font-bold text-gray-900 mb-2 line-clamp-1 group-hover:text-violet-500 transition-colors" title={video.title}>
                    {video.title}
                </h3>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400 flex items-center gap-1">
                            <IconCalendar size={12} />
                            {new Date(video.createdAt).toLocaleDateString()}
                        </span>
                    </div>
                    <div className="flex items-center gap-2">
                        {hasProgress && !isCompleted && (
                            <span className="text-[10px] font-bold text-violet-500">{progress.percent}%</span>
                        )}
                        {video.language && (
                            <span className="px-2 py-0.5 rounded-lg bg-gray-50 text-gray-500 text-[10px] font-bold uppercase tracking-wider border border-gray-100">
                                {video.language}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
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
                videosApi.list({ limit: 500 }),
                topicsApi.listByBatch('enrolled')
            ]).catch(async () => {
                const { videos: v } = await videosApi.list({ limit: 500 });
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

    const handleVideoClick = useCallback((video: any) => {
        // Save initial progress when video is opened
        if (video.duration) {
            const existing = getProgress(video.id);
            if (!existing) {
                saveProgress(video.id, 0, video.duration);
            }
        }
        saveRecentVideo(video as Video);
        setSelectedVideo(video as Video);
    }, []);

    const handleNavigate = useCallback((video: Video) => {
        setSelectedVideo(video);
    }, []);

    // Compute stats
    const totalDurationSecs = allVideos.reduce((acc, v) => acc + (v.duration || 0), 0);
    const totalDurationStr = (() => {
        if (totalDurationSecs === 0) return null;
        const hrs = Math.floor(totalDurationSecs / 3600);
        const mins = Math.floor((totalDurationSecs % 3600) / 60);
        if (hrs > 0) return `${hrs}h ${mins}m`;
        return `${mins}m`;
    })();
    const progressMap = getProgressMap();
    const completedCount = allVideos.filter(v => {
        const p = progressMap[v.id];
        return p && p.percent >= 95;
    }).length;
    const languages = Array.from(new Set(allVideos.map(v => v.language).filter(Boolean))).sort();

    return (
        <div className="max-w-7xl mx-auto">
            {/* Header */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-6"
            >
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-1">
                    Video Library
                </h1>
                {!loading && allVideos.length > 0 && (
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-400">
                        <span className="font-medium">{allVideos.length} video{allVideos.length !== 1 ? 's' : ''}</span>
                        {totalDurationStr && (
                            <>
                                <span>·</span>
                                <span className="flex items-center gap-1"><IconClock size={13} />{totalDurationStr} total</span>
                            </>
                        )}
                        {completedCount > 0 && (
                            <>
                                <span>·</span>
                                <span className="text-emerald-500 font-medium">{completedCount} completed</span>
                            </>
                        )}
                    </div>
                )}
            </motion.div>

            {/* Continue Watching Carousel */}
            {!loading && allVideos.length > 0 && (
                <ContinueWatchingCarousel
                    videos={allVideos}
                    onVideoClick={handleVideoClick}
                />
            )}

            {/* Unified Toolbar */}
            {!loading && allVideos.length > 0 && (
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 bg-white rounded-2xl border border-gray-100 shadow-sm"
                >
                    {/* Search */}
                    <div className="relative flex-1 min-w-0">
                        <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
                        <input
                            type="text"
                            placeholder="Search videos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full rounded-xl bg-gray-50 border-0 py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:bg-white transition-colors"
                        />
                    </div>

                    {/* Divider */}
                    <div className="hidden sm:block w-px h-8 bg-gray-100" />

                    {/* Filter pills row */}
                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Language filter pills */}
                        {languages.length > 1 && (
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setSelectedLanguage('')}
                                    className={cn(
                                        "px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                                        !selectedLanguage ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                                    )}
                                >
                                    All
                                </button>
                                {languages.map(lang => (
                                    <button
                                        key={lang}
                                        onClick={() => setSelectedLanguage(selectedLanguage === lang ? '' : lang!)}
                                        className={cn(
                                            "px-2.5 py-1.5 rounded-lg text-xs font-semibold uppercase transition-all",
                                            selectedLanguage === lang ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100"
                                        )}
                                    >
                                        {lang}
                                    </button>
                                ))}
                            </div>
                        )}

                        {/* Sort pills */}
                        <div className="flex items-center gap-1 ml-auto">
                            {([
                                { value: 'newest', label: 'Newest' },
                                { value: 'oldest', label: 'Oldest' },
                                { value: 'title_asc', label: 'A-Z' },
                            ] as const).map(opt => (
                                <button
                                    key={opt.value}
                                    onClick={() => setSortBy(opt.value)}
                                    className={cn(
                                        "px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all",
                                        sortBy === opt.value ? "bg-violet-100 text-violet-700" : "bg-gray-50 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                    )}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>

                        {/* Divider */}
                        <div className="hidden sm:block w-px h-6 bg-gray-100" />

                        {/* View toggle */}
                        <div className="flex items-center gap-1 bg-gray-50 rounded-lg p-0.5">
                            <button
                                onClick={() => setViewMode('topic')}
                                className={cn(
                                    "p-1.5 rounded-md transition-all",
                                    viewMode === 'topic' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                                )}
                                title="Topic View"
                            >
                                <IconLayoutList size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={cn(
                                    "p-1.5 rounded-md transition-all",
                                    viewMode === 'grid' ? "bg-white text-gray-900 shadow-sm" : "text-gray-400 hover:text-gray-600"
                                )}
                                title="Grid View"
                            >
                                <IconLayoutGrid size={16} />
                            </button>
                        </div>
                    </div>
                </motion.div>
            )}

            {/* Content Area */}
            {loading ? (
                <div className="flex items-center justify-center h-96">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-500"></div>
                </div>
            ) : allVideos.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex flex-col items-center justify-center py-24 text-center"
                >
                    <div className="w-20 h-20 rounded-2xl bg-gray-50 flex items-center justify-center mb-5 text-gray-300">
                        <IconVideo size={40} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No Videos Yet</h3>
                    <p className="text-gray-500 max-w-sm">
                        Your learning videos will appear here once they're published by your instructor.
                    </p>
                </motion.div>
            ) : viewMode === 'topic' ? (
                <TopicAccordion
                    topics={groupedTopics}
                    resourceType="video"
                    onResourceClick={handleVideoClick}
                />
            ) : (
                <div className={cn(
                    "grid gap-3 sm:gap-4 md:gap-5",
                    filteredAndSorted.length <= 2
                        ? "grid-cols-1 sm:grid-cols-2 max-w-2xl"
                        : filteredAndSorted.length <= 4
                        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
                        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
                )}>
                    {filteredAndSorted.map((video, idx) => (
                        <VideoCard
                            key={video.id}
                            video={video}
                            idx={idx}
                            onClick={handleVideoClick}
                        />
                    ))}
                </div>
            )}

            {/* Video Player Modal */}
            {selectedVideo && (
                <VideoPlayerModal
                    video={selectedVideo}
                    onClose={() => setSelectedVideo(null)}
                    allVideos={filteredAndSorted}
                    onNavigate={handleNavigate}
                />
            )}
        </div>
    );
};