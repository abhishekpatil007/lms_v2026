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
    IconFilter,
    IconSortAscending,
    IconCheck,
} from '@tabler/icons-react';
import { videosApi } from '@/api/endpoints/videos';
import { topicsApi } from '@/api/endpoints/topics';
import type { Video, Topic } from '@/types';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

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
    if (!seconds) return '0:00';
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

const formatDurationHuman = (seconds: number) => {
    if (seconds === 0) return null;
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (hrs > 0) return `${hrs}h ${mins}m`;
    return `${mins}m`;
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

    useEffect(() => {
        if (!video) return;
        saveRecentVideo(video);
        const interval = setInterval(() => {
            if (video.duration) {
                const existing = getProgress(video.id);
                if (!existing) saveProgress(video.id, 0, video.duration);
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
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4"
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
                    {/* Header */}
                    <div className="flex items-center justify-between px-3 sm:px-5 py-2.5 bg-gray-800/50">
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                            <button onClick={() => prevVideo && onNavigate(prevVideo)} disabled={!prevVideo}
                                className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="Previous (P)">
                                <IconPlayerSkipBack size={16} />
                            </button>
                            <div className="min-w-0">
                                <h3 className="text-white font-bold text-xs sm:text-sm truncate">{video.title}</h3>
                                {video.description && <p className="text-gray-500 text-[10px] truncate hidden sm:block">{video.description}</p>}
                            </div>
                            <button onClick={() => nextVideo && onNavigate(nextVideo)} disabled={!nextVideo}
                                className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all disabled:opacity-30 disabled:cursor-not-allowed" title="Next (N)">
                                <IconPlayerSkipForward size={16} />
                            </button>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                            <button onClick={() => setShowShortcuts(s => !s)} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all hidden sm:flex" title="Shortcuts (?)">
                                <IconKeyboard size={16} />
                            </button>
                            <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700/50 transition-all">
                                <IconX size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Shortcuts */}
                    <AnimatePresence>
                        {showShortcuts && (
                            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-gray-800 border-b border-gray-700 overflow-hidden">
                                <div className="px-4 py-2.5 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                    {[['Esc', 'Close'], ['N', 'Next'], ['P', 'Previous'], ['?', 'Shortcuts'], ['F', 'Fullscreen'], ['M', 'Mute'], ['←/→', 'Seek'], ['Space', 'Play/Pause']].map(([key, desc]) => (
                                        <div key={key} className="flex items-center gap-2">
                                            <kbd className="px-1.5 py-0.5 rounded bg-gray-700 text-gray-300 font-mono text-[10px] min-w-[24px] text-center">{key}</kbd>
                                            <span className="text-gray-400">{desc}</span>
                                        </div>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Video */}
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
                            <iframe ref={iframeRef}
                                src={`https://player.mux.com/${muxPlaybackId}?autoplay=1${progress && progress.currentTime > 10 ? `&start_time=${Math.floor(progress.currentTime)}` : ''}`}
                                className="w-full h-full" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={video.title} />
                        ) : playbackUrl ? (
                            <video src={playbackUrl} controls autoPlay className="w-full h-full" />
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <IconVideo className="w-16 h-16 text-gray-600 mb-4" />
                                <p className="text-gray-400">No playback available</p>
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    <div className="px-3 sm:px-5 py-2.5 bg-gray-800/30">
                        {video.description && (
                            <p className="text-xs text-gray-400 mb-2 line-clamp-2">{video.description}</p>
                        )}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            {video.duration != null && <span className="flex items-center gap-1"><IconClock size={13} />{formatDuration(video.duration)}</span>}
                            {video.language && <span className="px-1.5 py-0.5 rounded bg-gray-700 text-gray-300 uppercase font-bold text-[10px]">{video.language}</span>}
                            <span className="flex items-center gap-1"><IconCalendar size={13} />{new Date(video.createdAt).toLocaleDateString()}</span>
                        </div>
                        {nextVideo && (
                            <button onClick={() => onNavigate(nextVideo)}
                                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-gray-700/50 hover:bg-gray-700 text-gray-300 hover:text-white transition-all text-xs">
                                <span className="hidden sm:inline">Up next:</span>
                                <span className="font-medium truncate max-w-[120px]">{nextVideo.title}</span>
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
// Compact Video Row (for list view inside topics)
// ---------------------------------------------------------------------------
const VideoRow: React.FC<{
    video: Video;
    index: number;
    onClick: (video: Video) => void;
}> = ({ video, index, onClick }) => {
    const progress = getProgress(video.id);
    const isCompleted = progress && progress.percent >= 95;
    const hasProgress = progress && progress.percent > 0;

    return (
        <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.03 }}
            onClick={() => onClick(video)}
            className={cn(
                "group flex items-center gap-3 p-2 sm:p-2.5 rounded-xl cursor-pointer transition-all",
                isCompleted ? "bg-emerald-50/50 hover:bg-emerald-50" : "hover:bg-gray-50"
            )}
        >
            {/* Thumbnail */}
            <div className="relative shrink-0 w-20 sm:w-28 aspect-video rounded-lg overflow-hidden bg-gray-900">
                {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-900/80 to-gray-900">
                        <IconVideo className="w-5 h-5 text-gray-600" />
                    </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                    <div className="w-7 h-7 rounded-full bg-white/90 flex items-center justify-center">
                        <IconPlayerPlay className="w-3 h-3 text-gray-900 fill-current ml-0.5" />
                    </div>
                </div>
                {video.duration ? (
                    <div className="absolute bottom-0.5 right-0.5 px-1 py-0.5 rounded bg-black/70 text-white text-[8px] font-bold">{formatDuration(video.duration)}</div>
                ) : null}
                {hasProgress && !isCompleted && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/30">
                        <div className="h-full bg-violet-500 rounded-r-full" style={{ width: `${progress.percent}%` }} />
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <h5 className={cn(
                    "text-xs sm:text-sm font-semibold truncate transition-colors",
                    isCompleted ? "text-emerald-700" : "text-gray-900 group-hover:text-violet-600"
                )}>
                    {video.title}
                </h5>
                {video.description && (
                    <p className="text-[10px] sm:text-xs text-gray-400 line-clamp-1 mt-0.5">{video.description}</p>
                )}
                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-400">
                    {video.duration ? <span>{formatDuration(video.duration)}</span> : null}
                    {video.language && <span className="uppercase font-bold">{video.language}</span>}
                    {hasProgress && !isCompleted && <span className="text-violet-500 font-semibold">{progress.percent}%</span>}
                </div>
            </div>

            {/* Status */}
            <div className="shrink-0">
                {isCompleted ? (
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center">
                        <IconCheck className="w-3.5 h-3.5 text-emerald-600" />
                    </div>
                ) : (
                    <div className="w-6 h-6 rounded-full bg-gray-100 group-hover:bg-violet-100 flex items-center justify-center transition-colors">
                        <IconPlayerPlay className="w-3 h-3 text-gray-400 group-hover:text-violet-600 fill-current ml-0.5 transition-colors" />
                    </div>
                )}
            </div>
        </motion.div>
    );
};

// ---------------------------------------------------------------------------
// Topic Section (inline, no separate component)
// ---------------------------------------------------------------------------
const TopicSection: React.FC<{
    topic: Topic & { videos?: Video[] };
    index: number;
    defaultOpen: boolean;
    onVideoClick: (video: Video) => void;
}> = ({ topic, index, defaultOpen, onVideoClick }) => {
    const [open, setOpen] = useState(defaultOpen);
    const videos = topic.videos || [];
    const totalDuration = videos.reduce((acc, v) => acc + (v.duration || 0), 0);
    const progressMap = getProgressMap();
    const completedCount = videos.filter(v => { const p = progressMap[v.id]; return p && p.percent >= 95; }).length;
    const topicPercent = videos.length > 0 ? Math.round((completedCount / videos.length) * 100) : 0;

    return (
        <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className={cn(
                "rounded-2xl border overflow-hidden transition-all",
                open ? "border-violet-200 shadow-md bg-white" : "border-gray-100 bg-white hover:border-gray-200 hover:shadow-sm"
            )}
        >
            <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 p-3 sm:p-4 text-left">
                {/* Topic number */}
                <div className={cn(
                    "shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center text-sm font-bold transition-all",
                    topicPercent >= 100 ? "bg-emerald-100 text-emerald-600" : open ? "bg-violet-100 text-violet-600" : "bg-gray-100 text-gray-400"
                )}>
                    {topicPercent >= 100 ? <IconCheck size={18} /> : (index + 1)}
                </div>

                <div className="flex-1 min-w-0">
                    <h3 className="text-sm sm:text-base font-bold text-gray-900 truncate">{topic.title}</h3>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] sm:text-xs text-gray-400">
                        <span>{videos.length} video{videos.length !== 1 ? 's' : ''}</span>
                        {totalDuration > 0 && (
                            <>
                                <span className="text-gray-200">·</span>
                                <span>{formatDurationHuman(totalDuration)}</span>
                            </>
                        )}
                        {topicPercent > 0 && (
                            <>
                                <span className="text-gray-200">·</span>
                                <span className={topicPercent >= 100 ? "text-emerald-500 font-semibold" : "text-violet-500 font-semibold"}>
                                    {topicPercent >= 100 ? 'Complete' : `${completedCount}/${videos.length}`}
                                </span>
                            </>
                        )}
                    </div>
                </div>

                {/* Progress bar mini */}
                {topicPercent > 0 && topicPercent < 100 && (
                    <div className="hidden sm:flex shrink-0 w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full transition-all" style={{ width: `${topicPercent}%` }} />
                    </div>
                )}

                <div className={cn(
                    "shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all text-gray-400",
                    open ? "bg-violet-50 text-violet-500 rotate-180" : "bg-gray-50"
                )}>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </div>
            </button>

            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                    >
                        <div className="px-3 sm:px-4 pb-3 sm:pb-4 space-y-1">
                            {videos.length === 0 ? (
                                <p className="text-sm text-gray-400 text-center py-6">No videos in this module yet.</p>
                            ) : (
                                videos.map((video, idx) => (
                                    <VideoRow key={video.id} video={video} index={idx} onClick={onVideoClick} />
                                ))
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

// ---------------------------------------------------------------------------
// Video Card (for grid view)
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
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.02 }}
            onClick={() => onClick(video)}
            className="group bg-white rounded-xl overflow-hidden border border-gray-100 hover:shadow-lg hover:border-violet-200 transition-all cursor-pointer"
        >
            <div className="relative aspect-video bg-gray-900">
                {video.thumbnail_url ? (
                    <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-900/80 to-gray-900">
                        <IconVideo className="w-10 h-10 text-gray-700" />
                    </div>
                )}
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                    <div className="w-10 h-10 rounded-full bg-white/95 flex items-center justify-center shadow-lg">
                        <IconPlayerPlay className="w-4 h-4 text-violet-600 fill-current ml-0.5" />
                    </div>
                </div>
                {video.duration ? (
                    <div className="absolute bottom-1.5 right-1.5 px-1.5 py-0.5 rounded bg-black/70 text-white text-[10px] font-bold backdrop-blur-sm">{formatDuration(video.duration)}</div>
                ) : null}
                {isCompleted && (
                    <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md bg-emerald-500/90 text-white text-[10px] font-bold flex items-center gap-0.5">
                        <IconCheck size={10} /> Done
                    </div>
                )}
                {hasProgress && !isCompleted && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                        <div className="h-full bg-violet-500 rounded-r-full" style={{ width: `${progress.percent}%` }} />
                    </div>
                )}
            </div>
            <div className="p-2.5 sm:p-3">
                <h3 className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-1 leading-snug group-hover:text-violet-600 transition-colors">{video.title}</h3>
                {video.description && (
                    <p className="text-[10px] sm:text-xs text-gray-400 line-clamp-1 mt-0.5">{video.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1.5 text-[10px] text-gray-400">
                    {video.language && <span className="uppercase font-bold">{video.language}</span>}
                    <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                    {hasProgress && !isCompleted && <span className="text-violet-500 font-semibold ml-auto">{progress.percent}%</span>}
                </div>
            </div>
        </motion.div>
    );
};

// ---------------------------------------------------------------------------
// Continue Watching Strip
// ---------------------------------------------------------------------------
const ContinueWatching: React.FC<{
    videos: Video[];
    onVideoClick: (video: Video) => void;
}> = ({ videos, onVideoClick }) => {
    const scrollRef = useRef<HTMLDivElement>(null);
    const progressMap = getProgressMap();

    const continueList = videos
        .filter(v => { const p = progressMap[v.id]; return p && p.percent > 0 && p.percent < 95; })
        .sort((a, b) => new Date(progressMap[b.id].updatedAt).getTime() - new Date(progressMap[a.id].updatedAt).getTime())
        .slice(0, 10);

    if (continueList.length === 0) return null;

    return (
        <div className="mb-6">
            <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm sm:text-base font-bold text-gray-900">Continue Watching</h2>
                <div className="flex gap-1">
                    <button onClick={() => scrollRef.current?.scrollBy({ left: -260, behavior: 'smooth' })}
                        className="p-1 rounded-md border border-gray-200 text-gray-400 hover:text-gray-600 transition-all"><IconChevronLeft size={14} /></button>
                    <button onClick={() => scrollRef.current?.scrollBy({ left: 260, behavior: 'smooth' })}
                        className="p-1 rounded-md border border-gray-200 text-gray-400 hover:text-gray-600 transition-all"><IconChevronRight size={14} /></button>
                </div>
            </div>
            <div ref={scrollRef} className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide scroll-smooth -mx-1 px-1">
                {continueList.map((video) => {
                    const p = progressMap[video.id];
                    return (
                        <div key={video.id} onClick={() => onVideoClick(video)}
                            className="group shrink-0 w-[200px] sm:w-[240px] rounded-xl overflow-hidden bg-white border border-gray-100 hover:shadow-md hover:border-violet-200 transition-all cursor-pointer">
                            <div className="relative aspect-video bg-gray-900">
                                {video.thumbnail_url ? (
                                    <img src={video.thumbnail_url} alt="" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-violet-900/80 to-gray-900">
                                        <IconVideo className="w-8 h-8 text-gray-600" />
                                    </div>
                                )}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                                    <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                                        <IconPlayerPlay className="w-3.5 h-3.5 text-violet-600 fill-current ml-0.5" />
                                    </div>
                                </div>
                                <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
                                    <div className="h-full bg-violet-500 rounded-r-full" style={{ width: `${p.percent}%` }} />
                                </div>
                            </div>
                            <div className="p-2">
                                <h4 className="text-xs font-semibold text-gray-900 line-clamp-1">{video.title}</h4>
                                <p className="text-[10px] text-gray-400 mt-0.5">{p.percent}% · {formatTimeShort(p.currentTime)}</p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
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
    const [selectedLanguage, setSelectedLanguage] = useState('');
    const [viewMode, setViewMode] = useState<'topic' | 'grid'>('topic');
    const [selectedVideo, setSelectedVideo] = useState<Video | null>(null);
    const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'title_asc'>('newest');
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => { fetchData(); }, []);

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

    const sortVideos = useCallback((videos: Video[]) => {
        return [...videos].sort((a, b) => {
            switch (sortBy) {
                case 'newest': return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                case 'title_asc': return a.title.localeCompare(b.title);
                default: return 0;
            }
        });
    }, [sortBy]);

    const groupedTopics = useMemo(() => {
        const filtered = allVideos.filter(v =>
            (!selectedLanguage || v.language === selectedLanguage) &&
            (!searchQuery || v.title.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        const topicList: Topic[] = topics.map(t => ({
            ...t,
            videos: sortVideos(filtered.filter(v => String(v.topic_id) === String(t.id)))
        }));
        const untracked = filtered.filter(v => !v.topic_id);
        if (untracked.length > 0) {
            topicList.push({ id: 0, title: 'General Resources', description: '', order_index: 999, batch_id: 'all', createdAt: '', updatedAt: '', videos: sortVideos(untracked) });
        }
        return topicList.filter(t => (t.videos?.length || 0) > 0).sort((a, b) => a.order_index - b.order_index);
    }, [allVideos, topics, selectedLanguage, searchQuery, sortBy, sortVideos]);

    const filteredAndSorted = useMemo(() => {
        const filtered = allVideos.filter(v =>
            (!selectedLanguage || v.language === selectedLanguage) &&
            (!searchQuery || v.title.toLowerCase().includes(searchQuery.toLowerCase()))
        );
        return sortVideos(filtered);
    }, [allVideos, selectedLanguage, searchQuery, sortBy, sortVideos]);

    const handleVideoClick = useCallback((video: any) => {
        if (video.duration) {
            const existing = getProgress(video.id);
            if (!existing) saveProgress(video.id, 0, video.duration);
        }
        saveRecentVideo(video as Video);
        setSelectedVideo(video as Video);
    }, []);

    const handleNavigate = useCallback((video: Video) => { setSelectedVideo(video); }, []);

    // Stats
    const totalDuration = allVideos.reduce((acc, v) => acc + (v.duration || 0), 0);
    const progressMap = getProgressMap();
    const completedCount = allVideos.filter(v => { const p = progressMap[v.id]; return p && p.percent >= 95; }).length;
    const languages = Array.from(new Set(allVideos.map(v => v.language).filter(Boolean))).sort();
    const activeFilters = (selectedLanguage ? 1 : 0) + (sortBy !== 'newest' ? 1 : 0);

    return (
        <div className="max-w-7xl mx-auto px-1 sm:px-0">
            {/* Header */}
            {!loading && allVideos.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="mb-5">
                    <div className="flex items-start sm:items-center justify-between gap-3 flex-col sm:flex-row">
                        <div>
                            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900">My Videos</h1>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                                <span>{allVideos.length} videos</span>
                                {totalDuration > 0 && <><span>·</span><span>{formatDurationHuman(totalDuration)}</span></>}
                                {completedCount > 0 && <><span>·</span><span className="text-emerald-500 font-semibold">{completedCount} done</span></>}
                            </div>
                        </div>
                        {/* Quick stats */}
                        {allVideos.length > 5 && (
                            <div className="flex items-center gap-3">
                                <div className="text-right hidden sm:block">
                                    <div className="text-lg font-bold text-gray-900">{Math.round((completedCount / allVideos.length) * 100)}%</div>
                                    <div className="text-[10px] text-gray-400">completed</div>
                                </div>
                                <div className="w-12 h-12 relative hidden sm:block">
                                    <svg className="w-12 h-12 -rotate-90" viewBox="0 0 36 36">
                                        <circle cx="18" cy="18" r="15" fill="none" stroke="#f3f4f6" strokeWidth="2.5" />
                                        <circle cx="18" cy="18" r="15" fill="none" stroke="#8b5cf6" strokeWidth="2.5"
                                            strokeDasharray={`${(completedCount / Math.max(allVideos.length, 1)) * 94.2} 94.2`} strokeLinecap="round" />
                                    </svg>
                                </div>
                            </div>
                        )}
                    </div>
                </motion.div>
            )}

            {/* Continue Watching */}
            {!loading && <ContinueWatching videos={allVideos} onVideoClick={handleVideoClick} />}

            {/* Search + Filter Bar */}
            {!loading && allVideos.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="mb-5">
                    <div className="flex items-center gap-2">
                        {/* Search */}
                        <div className="relative flex-1">
                            <IconSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-300" />
                            <input
                                type="text"
                                placeholder="Search videos..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full rounded-xl bg-white border border-gray-100 py-2 sm:py-2.5 pl-9 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-200 transition-all"
                            />
                        </div>

                        {/* Filter toggle */}
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={cn(
                                "shrink-0 flex items-center gap-1.5 px-3 py-2 sm:py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all",
                                showFilters || activeFilters > 0 ? "bg-violet-50 border-violet-200 text-violet-700" : "bg-white border-gray-100 text-gray-500 hover:border-gray-200"
                            )}
                        >
                            <IconFilter size={15} />
                            <span className="hidden sm:inline">Filters</span>
                            {activeFilters > 0 && (
                                <span className="w-4 h-4 rounded-full bg-violet-500 text-white text-[10px] flex items-center justify-center font-bold">{activeFilters}</span>
                            )}
                        </button>

                        {/* View toggle */}
                        <div className="shrink-0 flex bg-white border border-gray-100 rounded-xl p-0.5">
                            <button onClick={() => setViewMode('topic')}
                                className={cn("p-1.5 sm:p-2 rounded-lg transition-all", viewMode === 'topic' ? "bg-gray-900 text-white shadow-sm" : "text-gray-400 hover:text-gray-600")} title="List View">
                                <IconLayoutList size={15} />
                            </button>
                            <button onClick={() => setViewMode('grid')}
                                className={cn("p-1.5 sm:p-2 rounded-lg transition-all", viewMode === 'grid' ? "bg-gray-900 text-white shadow-sm" : "text-gray-400 hover:text-gray-600")} title="Grid View">
                                <IconLayoutGrid size={15} />
                            </button>
                        </div>
                    </div>

                    {/* Expanded filters */}
                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="flex flex-wrap items-center gap-2 pt-3">
                                    {/* Language */}
                                    {languages.length > 1 && (
                                        <div className="flex items-center gap-1">
                                            <span className="text-[10px] text-gray-400 font-semibold uppercase mr-1">Lang:</span>
                                            <button onClick={() => setSelectedLanguage('')}
                                                className={cn("px-2 py-1 rounded-lg text-[11px] font-semibold transition-all", !selectedLanguage ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100")}>
                                                All
                                            </button>
                                            {languages.map(lang => (
                                                <button key={lang} onClick={() => setSelectedLanguage(selectedLanguage === lang ? '' : lang!)}
                                                    className={cn("px-2 py-1 rounded-lg text-[11px] font-semibold uppercase transition-all", selectedLanguage === lang ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-500 hover:bg-gray-100")}>
                                                    {lang}
                                                </button>
                                            ))}
                                        </div>
                                    )}

                                    <div className="w-px h-5 bg-gray-100 mx-1 hidden sm:block" />

                                    {/* Sort */}
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-gray-400 font-semibold uppercase mr-1">Sort:</span>
                                        {([
                                            { value: 'newest' as const, label: 'Newest' },
                                            { value: 'oldest' as const, label: 'Oldest' },
                                            { value: 'title_asc' as const, label: 'A-Z' },
                                        ]).map(opt => (
                                            <button key={opt.value} onClick={() => setSortBy(opt.value)}
                                                className={cn("px-2 py-1 rounded-lg text-[11px] font-semibold transition-all", sortBy === opt.value ? "bg-violet-100 text-violet-700" : "bg-gray-50 text-gray-400 hover:bg-gray-100")}>
                                                {opt.label}
                                            </button>
                                        ))}
                                    </div>

                                    {activeFilters > 0 && (
                                        <button onClick={() => { setSelectedLanguage(''); setSortBy('newest'); }}
                                            className="text-[11px] text-red-400 hover:text-red-600 font-semibold ml-auto transition-colors">
                                            Clear all
                                        </button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </motion.div>
            )}

            {/* Content */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-violet-500" />
                </div>
            ) : allVideos.length === 0 ? (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gray-50 flex items-center justify-center mb-4 text-gray-300">
                        <IconVideo size={36} />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">No Videos Yet</h3>
                    <p className="text-sm text-gray-500 max-w-xs">Videos will appear here once your instructor publishes them.</p>
                </motion.div>
            ) : filteredAndSorted.length === 0 ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center py-16 text-center">
                    <IconSearch className="w-10 h-10 text-gray-200 mb-3" />
                    <p className="text-sm text-gray-500">No videos match your search.</p>
                    <button onClick={() => { setSearchQuery(''); setSelectedLanguage(''); }} className="mt-2 text-xs text-violet-500 font-semibold hover:underline">Clear filters</button>
                </motion.div>
            ) : viewMode === 'topic' ? (
                <div className="space-y-3">
                    {groupedTopics.map((topic, idx) => (
                        <TopicSection key={topic.id} topic={topic} index={idx} defaultOpen={idx === 0} onVideoClick={handleVideoClick} />
                    ))}
                </div>
            ) : (
                <div className="space-y-6">
                    {groupedTopics.map((topic, tIdx) => (
                        <div key={topic.id}>
                            <div className="flex items-center gap-2 mb-3">
                                <div className="w-7 h-7 rounded-lg bg-violet-100 text-violet-600 flex items-center justify-center text-xs font-bold">{tIdx + 1}</div>
                                <h3 className="text-sm sm:text-base font-bold text-gray-900">{topic.title}</h3>
                                <span className="text-xs text-gray-400">{topic.videos?.length || 0} videos</span>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3">
                                {(topic.videos || []).map((video, idx) => (
                                    <VideoCard key={video.id} video={video} idx={idx} onClick={handleVideoClick} />
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Player Modal */}
            {selectedVideo && (
                <VideoPlayerModal video={selectedVideo} onClose={() => setSelectedVideo(null)} allVideos={filteredAndSorted} onNavigate={handleNavigate} />
            )}
        </div>
    );
};