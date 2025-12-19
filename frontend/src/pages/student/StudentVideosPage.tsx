import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    IconVideo,
    IconPlayerPlay,
    IconFilter,
    IconClock,
    IconCalendar
} from '@tabler/icons-react';
import { videosApi } from '@/api/endpoints/videos';
import type { Video } from '@/types';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

export const StudentVideosPage = () => {
    const [allVideos, setAllVideos] = useState<Video[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedLanguage, setSelectedLanguage] = useState<string>('');

    useEffect(() => {
        fetchVideos();
    }, []);

    const fetchVideos = async () => {
        try {
            setLoading(true);
            // Fetch all videos. The backend should handle authorization.
            const { videos } = await videosApi.list();
            setAllVideos(videos);
        } catch (error) {
            console.error('Error fetching videos:', error);
            toast.error('Failed to load video library');
        } finally {
            setLoading(false);
        }
    };

    // Derive unique languages from valid videos
    const languages = useMemo(() => {
        const langs = new Set<string>();
        allVideos.forEach(v => {
            if (v.language) {
                langs.add(v.language);
            }
        });
        return Array.from(langs).sort();
    }, [allVideos]);

    // Filter videos based on selection
    const displayedVideos = useMemo(() => {
        if (!selectedLanguage) return allVideos;
        return allVideos.filter(v => v.language === selectedLanguage);
    }, [allVideos, selectedLanguage]);

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-0">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mb-8"
            >
                <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
                    Video Library
                </h1>
                <p className="text-gray-500">
                    Watch recorded lectures and supplementary videos
                </p>
            </motion.div>

            {/* Filters - Only show if we have videos */}
            {allVideos.length > 0 && (
                <div className="mb-8 flex flex-wrap items-center gap-4">
                    <div className="relative min-w-[200px]">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <IconFilter className="h-5 w-5 text-gray-400" />
                        </div>
                        <select
                            value={selectedLanguage}
                            onChange={(e) => setSelectedLanguage(e.target.value)}
                            className="pl-10 pr-10 py-2.5 w-full rounded-xl border border-gray-200 bg-white text-gray-700 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 appearance-none cursor-pointer"
                        >
                            <option value="">All Languages</option>
                            {languages.map(lang => (
                                <option key={lang} value={lang}>{lang}</option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* Video Grid */}
            {loading ? (
                <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
            ) : displayedVideos.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-64 bg-white rounded-[24px] border border-gray-100 shadow-sm">
                    <IconVideo className="w-16 h-16 text-gray-300 mb-4" strokeWidth={1.5} />
                    <p className="text-gray-500 font-medium">No videos found</p>
                    {selectedLanguage && <p className="text-sm text-gray-400 mt-1">Try selecting a different language</p>}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {displayedVideos.map((video, idx) => (
                        <motion.div
                            key={video.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: idx * 0.05 }}
                            className="group relative bg-white rounded-[20px] overflow-hidden shadow-sm border border-gray-100 hover:shadow-lg transition-all"
                        >
                            {/* Thumbnail / Player Placeholder */}
                            <div className="relative aspect-video bg-gray-900 group-video-hover">
                                {video.thumbnail_url ? (
                                    <img
                                        src={video.thumbnail_url}
                                        alt={video.title}
                                        className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                                    />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-800 to-gray-900">
                                        <IconVideo className="w-12 h-12 text-gray-600" />
                                    </div>
                                )}

                                {/* Play Overlay */}
                                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20 backdrop-blur-[2px]">
                                    <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform">
                                        <IconPlayerPlay className="w-5 h-5 text-gray-900 fill-current ml-1" />
                                    </div>
                                </div>

                                {/* Duration Badge */}
                                <div className="absolute bottom-2 right-2 px-2 py-1 rounded-md bg-black/70 text-white text-[10px] font-bold">
                                    {formatDuration(video.duration)}
                                </div>
                            </div>

                            <div className="p-4">
                                <h3 className="text-base font-bold text-gray-900 mb-1 line-clamp-2 min-h-[3rem]" title={video.title}>
                                    {video.title}
                                </h3>

                                <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
                                    <div className="flex items-center gap-1.5">
                                        <IconCalendar className="w-3.5 h-3.5" />
                                        <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                                    </div>
                                    {video.language && (
                                        <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                                            {video.language}
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Click Utility (If we had a playback Page/Modal, we'd wire it here) */}
                            {/* For now, just a visual indicator or link if URL exists */}
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    );
};
