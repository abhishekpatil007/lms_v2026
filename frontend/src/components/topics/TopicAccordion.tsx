import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconChevronDown,
  IconVideo,
  IconFile,
  IconClock,
  IconDownload,
  IconPlayerPlay,
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import type { Topic, Video, Document } from '@/types';

interface TopicAccordionProps {
  topics: Topic[];
  resourceType: 'video' | 'document';
  onResourceClick: (resource: Video | Document) => void;
  renderResourceInfo?: (resource: Video | Document) => React.ReactNode;
}

const formatDuration = (seconds?: number) => {
  if (!seconds) return null;
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  if (hrs > 0) return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const getVideoProgress = (videoId: string): { percent: number; currentTime: number } | null => {
  try {
    const map = JSON.parse(localStorage.getItem('lms_video_progress') || '{}');
    return map[videoId] || null;
  } catch { return null; }
};

const getTotalDuration = (videos?: Video[]) => {
  if (!videos?.length) return null;
  const total = videos.reduce((acc, v) => acc + (v.duration || 0), 0);
  if (total === 0) return null;
  const hrs = Math.floor(total / 3600);
  const mins = Math.floor((total % 3600) / 60);
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
};

export const TopicAccordion: React.FC<TopicAccordionProps> = ({
  topics,
  resourceType,
  onResourceClick,
  renderResourceInfo
}) => {
  const [expandedTopics, setExpandedTopics] = useState<number[]>(
    // Auto-expand first topic
    topics.length > 0 ? [topics[0].id] : []
  );

  const toggleTopic = (id: number) => {
    setExpandedTopics(prev =>
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  if (!topics || topics.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-6 text-center bg-white/50 backdrop-blur-sm rounded-[32px] border-2 border-dashed border-gray-200">
        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4 text-gray-400">
          {resourceType === 'video' ? <IconVideo size={32} /> : <IconFile size={32} />}
        </div>
        <h3 className="text-xl font-bold text-gray-900 mb-2">No Content Found</h3>
        <p className="text-gray-500 max-w-sm">
          There are no {resourceType}s organized by topic for this batch yet.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {topics.map((topic, index) => {
        const isExpanded = expandedTopics.includes(topic.id);
        const resources = resourceType === 'video' ? topic.videos : topic.documents;
        const hasResources = (resources?.length || 0) > 0;
        const totalDuration = resourceType === 'video' ? getTotalDuration(topic.videos) : null;

        // Calculate topic completion for videos
        let completedCount = 0;
        if (resourceType === 'video' && topic.videos) {
          topic.videos.forEach(v => {
            const p = getVideoProgress(v.id);
            if (p && p.percent >= 95) completedCount++;
          });
        }
        const totalCount = resources?.length || 0;
        const topicProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

        return (
          <motion.div
            key={topic.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            className={cn(
              "overflow-hidden rounded-2xl border transition-all duration-300",
              isExpanded ? "border-violet-200 bg-white shadow-lg" : "border-gray-100 bg-white shadow-sm hover:border-gray-200 hover:shadow-md"
            )}
          >
            {/* Topic Header */}
            <button
              onClick={() => toggleTopic(topic.id)}
              className="flex w-full items-center justify-between p-4 sm:p-5 text-left"
            >
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className={cn(
                  "flex h-10 w-10 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl transition-all duration-300",
                  isExpanded ? "bg-violet-500 text-white" : "bg-gray-100 text-gray-400"
                )}>
                  {resourceType === 'video' ? <IconVideo size={20} /> : <IconFile size={20} />}
                </div>
                <div className="min-w-0">
                  <h4 className="text-base sm:text-lg font-bold text-gray-900 truncate">{topic.title}</h4>
                  <div className="flex items-center gap-2 sm:gap-3 mt-0.5 flex-wrap">
                    <span className="text-xs text-gray-500 font-medium">
                      {totalCount} {resourceType === 'video' ? 'video' : 'document'}{totalCount !== 1 ? 's' : ''}
                    </span>
                    {totalDuration && (
                      <>
                        <span className="text-gray-300 text-xs">·</span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <IconClock size={11} />
                          {totalDuration}
                        </span>
                      </>
                    )}
                    {topicProgress > 0 && (
                      <>
                        <span className="text-gray-300 text-xs">·</span>
                        <span className={cn("text-xs font-semibold", topicProgress >= 100 ? "text-emerald-500" : "text-violet-500")}>
                          {topicProgress >= 100 ? '✓ Complete' : `${topicProgress}% done`}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {/* Mini progress ring */}
                {resourceType === 'video' && topicProgress > 0 && topicProgress < 100 && (
                  <div className="hidden sm:block relative h-8 w-8">
                    <svg className="h-8 w-8 -rotate-90" viewBox="0 0 36 36">
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#e5e7eb" strokeWidth="3" />
                      <circle cx="18" cy="18" r="14" fill="none" stroke="#8b5cf6" strokeWidth="3"
                        strokeDasharray={`${topicProgress * 0.88} 88`} strokeLinecap="round" />
                    </svg>
                  </div>
                )}
                <div className={cn(
                  "h-8 w-8 flex items-center justify-center rounded-lg transition-all",
                  isExpanded ? "bg-violet-100 text-violet-600" : "bg-gray-50 text-gray-400"
                )}>
                  <IconChevronDown size={18} className={cn("transition-transform duration-300", isExpanded ? "rotate-180" : "")} />
                </div>
              </div>
            </button>

            {/* Resources List */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                  <div className="px-4 sm:px-5 pb-4 sm:pb-5">
                    {!hasResources ? (
                      <div className="py-8 text-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                        <p className="text-sm text-gray-400">No content in this module yet.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {resources?.map((resource, rIdx) => {
                          const isVideo = resourceType === 'video';
                          const video = resource as Video;
                          const progress = isVideo ? getVideoProgress(video.id) : null;
                          const isCompleted = progress && progress.percent >= 95;
                          const hasProgress = progress && progress.percent > 0;
                          const duration = isVideo ? formatDuration(video.duration) : null;

                          return (
                            <motion.div
                              key={resource.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: rIdx * 0.05 }}
                              onClick={() => onResourceClick(resource)}
                              className={cn(
                                "group flex items-center gap-3 p-2.5 sm:p-3 rounded-xl border transition-all cursor-pointer",
                                isCompleted
                                  ? "border-emerald-100 bg-emerald-50/30 hover:border-emerald-200"
                                  : "border-gray-100 bg-white hover:border-violet-200 hover:shadow-sm"
                              )}
                            >
                              {/* Thumbnail / Icon */}
                              {isVideo && video.thumbnail_url ? (
                                <div className="relative shrink-0 w-24 sm:w-32 aspect-video rounded-lg overflow-hidden bg-gray-900">
                                  <img src={video.thumbnail_url} alt={video.title} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" />
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
                                    <div className="w-8 h-8 rounded-full bg-white/90 flex items-center justify-center">
                                      <IconPlayerPlay className="w-3.5 h-3.5 text-gray-900 fill-current ml-0.5" />
                                    </div>
                                  </div>
                                  {duration && (
                                    <div className="absolute bottom-1 right-1 px-1.5 py-0.5 rounded bg-black/70 text-white text-[9px] font-bold">
                                      {duration}
                                    </div>
                                  )}
                                  {/* Progress bar on thumbnail */}
                                  {hasProgress && !isCompleted && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-black/30">
                                      <div className="h-full bg-violet-500 rounded-r-full" style={{ width: `${progress.percent}%` }} />
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className={cn(
                                  "shrink-0 h-10 w-10 sm:h-12 sm:w-12 rounded-xl flex items-center justify-center transition-colors",
                                  isCompleted
                                    ? "bg-emerald-100 text-emerald-500"
                                    : "bg-gray-50 text-gray-400 group-hover:bg-violet-50 group-hover:text-violet-500"
                                )}>
                                  {isVideo ? <IconPlayerPlay size={18} /> : <IconFile size={18} />}
                                </div>
                              )}

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <h5 className={cn(
                                  "text-sm font-semibold truncate transition-colors",
                                  isCompleted ? "text-emerald-700" : "text-gray-900 group-hover:text-violet-600"
                                )}>
                                  {resource.title}
                                </h5>
                                {renderResourceInfo ? (
                                  renderResourceInfo(resource)
                                ) : (
                                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                    {isVideo && duration && (
                                      <span className="text-[10px] text-gray-400 font-medium flex items-center gap-0.5">
                                        <IconClock size={10} />
                                        {duration}
                                      </span>
                                    )}
                                    {isVideo && video.language && (
                                      <span className="text-[10px] text-gray-400 font-bold uppercase">{video.language}</span>
                                    )}
                                    {!isVideo && (
                                      <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                                        {(resource as Document).file_type}
                                      </span>
                                    )}
                                    {hasProgress && !isCompleted && (
                                      <span className="text-[10px] font-semibold text-violet-500">{progress.percent}%</span>
                                    )}
                                    {isCompleted && (
                                      <span className="text-[10px] font-semibold text-emerald-500 flex items-center gap-0.5">
                                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                                        Watched
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>

                              {/* Action button */}
                              <button className={cn(
                                "shrink-0 h-9 w-9 rounded-xl flex items-center justify-center transition-all",
                                isCompleted
                                  ? "text-emerald-400 bg-emerald-50 group-hover:bg-emerald-100"
                                  : "text-gray-300 bg-gray-50 group-hover:bg-violet-500 group-hover:text-white"
                              )}>
                                {resourceType === 'video' ? <IconPlayerPlay size={16} /> : <IconDownload size={16} />}
                              </button>
                            </motion.div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
};