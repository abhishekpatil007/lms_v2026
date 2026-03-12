import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  IconChevronDown, 
  IconChevronRight, 
  IconVideo, 
  IconFile,
  IconClock,
  IconDownload,
  IconPlayerPlay
} from '@tabler/icons-react';
import { cn } from '@/lib/utils';
import type { Topic, Video, Document } from '@/types';

interface TopicAccordionProps {
  topics: Topic[];
  resourceType: 'video' | 'document';
  onResourceClick: (resource: Video | Document) => void;
  renderResourceInfo?: (resource: Video | Document) => React.ReactNode;
}

export const TopicAccordion: React.FC<TopicAccordionProps> = ({
  topics,
  resourceType,
  onResourceClick,
  renderResourceInfo
}) => {
  const [expandedTopics, setExpandedTopics] = useState<number[]>([]);

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
        const hasResources = resourceType === 'video' 
          ? (topic.videos?.length || 0) > 0 
          : (topic.documents?.length || 0) > 0;
        
        const resources = resourceType === 'video' ? topic.videos : topic.documents;

        return (
          <motion.div
            key={topic.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={cn(
              "overflow-hidden rounded-[24px] border-2 transition-all duration-300",
              isExpanded ? "border-[#A78BFA] bg-white shadow-xl" : "border-gray-50 bg-white shadow-sm hover:border-gray-100"
            )}
          >
            {/* Topic Header */}
            <button
              onClick={() => toggleTopic(topic.id)}
              className="flex w-full items-center justify-between p-6 text-left"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-300",
                  isExpanded ? "bg-[#A78BFA] text-white rotate-12" : "bg-gray-100 text-gray-400"
                )}>
                  {isExpanded ? <IconChevronDown size={24} /> : <IconChevronRight size={24} />}
                </div>
                <div>
                  <h4 className="text-lg font-bold text-gray-900">{topic.title}</h4>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm text-gray-500 font-medium">
                      {(resources?.length || 0)} {resourceType === 'video' ? 'videos' : 'documents'}
                    </span>
                    {topic.description && (
                      <>
                        <span className="text-gray-300">•</span>
                        <p className="text-xs text-gray-400 line-clamp-1">{topic.description}</p>
                      </>
                    )}
                  </div>
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
                  <div className="p-6 pt-0 border-t border-gray-50 bg-gray-50/30">
                    {!hasResources ? (
                      <div className="py-8 text-center bg-white/50 rounded-2xl border border-dashed border-gray-200">
                        <p className="text-sm text-gray-400 italic">This topic is currently empty.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 mt-4">
                        {resources?.map((resource) => (
                          <motion.div
                            key={resource.id}
                            whileHover={{ x: 4 }}
                            onClick={() => onResourceClick(resource)}
                            className="group flex items-center justify-between p-4 rounded-2xl bg-white border border-gray-100 hover:border-[#A78BFA] hover:shadow-md transition-all cursor-pointer"
                          >
                            <div className="flex items-center gap-4">
                              <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-[#A78BFA]/10 group-hover:text-[#A78BFA] transition-colors">
                                {resourceType === 'video' ? (
                                  <IconPlayerPlay size={20} strokeWidth={2.5} />
                                ) : (
                                  <IconFile size={20} />
                                )}
                              </div>
                              <div>
                                <h5 className="text-sm font-bold text-gray-900 group-hover:text-[#A78BFA] transition-colors">
                                  {resource.title}
                                </h5>
                                {renderResourceInfo ? (
                                  renderResourceInfo(resource)
                                ) : (
                                  <div className="flex items-center gap-3 mt-0.5">
                                    {resourceType === 'video' ? (
                                      <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold text-gray-400">
                                        <IconClock size={12} />
                                        {(resource as Video).duration ? `${Math.floor((resource as Video).duration! / 60)}m` : '0m'}
                                      </span>
                                    ) : (
                                      <span className="text-[10px] uppercase tracking-wider font-bold text-gray-400">
                                        {(resource as Document).file_type}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <button className="h-8 w-8 rounded-full flex items-center justify-center text-gray-300 group-hover:bg-[#A78BFA] group-hover:text-white transition-all shadow-sm">
                              {resourceType === 'video' ? <IconPlayerPlay size={14} /> : <IconDownload size={14} />}
                            </button>
                          </motion.div>
                        ))}
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
