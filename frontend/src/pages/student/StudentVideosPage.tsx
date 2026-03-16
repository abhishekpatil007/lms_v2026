import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
    IconVideo,
    IconPlayerPlay,
    IconFilter,
    IconClock,
    IconCalendar,
    IconLayoutGrid,
    IconLayoutList,
    IconSearch
} from '@tabler/icons-react';
import { videosApi } from '@/api/endpoints/videos';
import { topicsApi } from '@/api/endpoints/topics';
import type { Video, Topic } from '@/types';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { TopicAccordion } from '@/components/topics/TopicAccordion';

export const StudentVideosPage = () => {
    const [allVideos, setAllVideos] = useState<Video[]>([]);
    const [topics, setTopics] = useState<Topic[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('');
    const [viewMode, setViewMode] = useState<'topic' | 'grid'>('topic');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [{ videos }, { topics: topicData }] = await Promise.all([
                videosApi.list(),
                // Since student might be in multiple batches, we'd ideally fetch topics for all ongoing batches.
                // For now, if student is enrolled in batches, we fetch their topics.
                // If the generic list doesn't return topics, we can fetch uniquely.
                // In a production app, we'd have a 'my-topics' endpoint.
                topicsApi.listByBatch('enrolled') // Backend should handle 'enrolled' special keyword or we iterate.
            ]).catch(async (err) => {
                // Fallback if topicsApi fails or doesn't support 'enrolled'
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

    // Group videos by topic
    const groupedTopics = useMemo(() => {
        const filtered = allVideos.filter(v =>
            (!selectedLanguage || v.language === selectedLanguage) &&
            (!searchQuery || v.title.toLowerCase().includes(searchQuery.toLowerCase()))
        );

        // Clone topics to avoid mutation and add 'General' if needed
        const topicList: Topic[] = topics.map(t => ({
            ...t,
            videos: filtered.filter(v => v.topic_id === t.id)
        }));

        const untrackedVideos = filtered.filter(v => !v.topic_id);
        if (untrackedVideos.length > 0) {
            topicList.push({
                id: 0, // General topic
                title: 'General Resources',
                description: 'Videos not assigned to a specific module',
                order_index: 999,
                batch_id: 'all',
                createdAt: '',
                updatedAt: '',
                videos: untrackedVideos
            });
        }

        return topicList.sort((a, b) => a.order_index - b.order_index);
    }, [allVideos, topics, selectedLanguage, searchQuery]);

    const formatDuration = (seconds?: number) => {
        if (!seconds) return '00:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleVideoClick = (video: any) => {
        // Logic to open video player (e.g., Modal or separate page)
        toast.success(`Playing: ${video.title}`);
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
                <div className="mb-8 flex flex-wrap items-center gap-4">
                    <div className="relative flex-1">
                        <IconSearch className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" strokeWidth={2} />
                        <input
                            type="text"
                            placeholder="Search videos..."
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
                            value={selectedLanguage}
                            onChange={(e) => setSelectedLanguage(e.target.value)}
                            className="pl-10 pr-10 py-2.5 w-full rounded-xl border border-gray-200 bg-white text-gray-700 outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 appearance-none cursor-pointer font-medium"
                        >
                            <option value="">All Languages</option>
                            {Array.from(new Set(allVideos.map(v => v.language).filter(Boolean))).sort().map(lang => (
                                <option key={lang} value={lang!}>{lang}</option>
                            ))}
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
                    {allVideos.filter(v => (!selectedLanguage || v.language === selectedLanguage) && (!searchQuery || v.title.toLowerCase().includes(searchQuery.toLowerCase()))).map((video, idx) => (
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
        </div>
    );
};
