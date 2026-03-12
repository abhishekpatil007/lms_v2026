import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IconPlus,
  IconX,
  IconGripVertical,
  IconPencil,
  IconTrash,
  IconCheck,
  IconAlertCircle
} from '@tabler/icons-react';
import { topicsApi } from '@/api/endpoints/topics';
import type { Topic } from '@/types';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';

interface TopicManagerProps {
  batchId: string;
  batchName: string;
  onClose: () => void;
}

export const TopicManager: React.FC<TopicManagerProps> = ({
  batchId,
  batchName,
  onClose
}) => {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTopicId, setEditingTopicId] = useState<number | null>(null);
  
  const [newTopic, setNewTopic] = useState({
    title: '',
    description: '',
    order_index: 0
  });

  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    order_index: 0
  });

  useEffect(() => {
    fetchTopics();
  }, [batchId]);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      const { topics: data } = await topicsApi.listByBatch(batchId);
      setTopics(data.sort((a, b) => a.order_index - b.order_index));
    } catch (error) {
      console.error('Error fetching topics:', error);
      toast.error('Failed to load topics');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTopic.title.trim()) return;

    try {
      const order = topics.length > 0 ? Math.max(...topics.map(t => t.order_index)) + 1 : 1;
      await topicsApi.create({
        batch_id: batchId,
        title: newTopic.title,
        description: newTopic.description,
        order_index: order
      });
      toast.success('Topic created');
      setNewTopic({ title: '', description: '', order_index: 0 });
      setShowAddForm(false);
      fetchTopics();
    } catch (error) {
      toast.error('Failed to create topic');
    }
  };

  const handleUpdate = async (id: number) => {
    if (!editForm.title.trim()) return;
    try {
      await topicsApi.update(id, editForm);
      toast.success('Topic updated');
      setEditingTopicId(null);
      fetchTopics();
    } catch (error) {
      toast.error('Failed to update topic');
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this topic? All associations will be removed.')) return;
    try {
      await topicsApi.delete(id);
      toast.success('Topic deleted');
      fetchTopics();
    } catch (error) {
      toast.error('Failed to delete topic');
    }
  };

  const startEditing = (topic: Topic) => {
    setEditingTopicId(topic.id);
    setEditForm({
      title: topic.title,
      description: topic.description || '',
      order_index: topic.order_index
    });
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-2xl rounded-[28px] bg-white p-8 shadow-2xl max-h-[90vh] flex flex-col"
      >
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Manage Topics</h2>
            <p className="text-sm text-gray-500 mt-1">Batch: {batchName}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 hover:bg-gray-100 transition-colors"
          >
            <IconX className="w-6 h-6 text-gray-500" strokeWidth={2} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#A78BFA]"></div>
            </div>
          ) : topics.length === 0 && !showAddForm ? (
            <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
              <IconAlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 font-medium">No topics found for this batch</p>
              <button
                onClick={() => setShowAddForm(true)}
                className="mt-4 text-[#A78BFA] font-bold text-sm hover:underline"
              >
                + Add your first topic
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {topics.map((topic) => (
                <div
                  key={topic.id}
                  className={cn(
                    "group rounded-xl border-2 p-4 transition-all",
                    editingTopicId === topic.id ? "border-[#A78BFA] bg-[#A78BFA]/5" : "border-gray-50 hover:border-gray-100 bg-white shadow-sm"
                  )}
                >
                  {editingTopicId === topic.id ? (
                    <div className="space-y-3">
                      <input
                        autoFocus
                        type="text"
                        value={editForm.title}
                        onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                        className="w-full rounded-lg border-gray-200 text-sm font-bold focus:ring-[#A78BFA]"
                        placeholder="Topic Title"
                      />
                      <textarea
                        value={editForm.description}
                        onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                        className="w-full rounded-lg border-gray-200 text-sm focus:ring-[#A78BFA]"
                        placeholder="Description (optional)"
                        rows={2}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingTopicId(null)}
                          className="px-3 py-1.5 text-xs font-bold text-gray-500 hover:bg-gray-100 rounded-lg"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleUpdate(topic.id)}
                          className="px-3 py-1.5 text-xs font-bold bg-[#A78BFA] text-white rounded-lg shadow-sm"
                        >
                          Save Changes
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-4">
                      <div className="cursor-grab text-gray-300">
                        <IconGripVertical className="w-5 h-5" />
                      </div>
                      <div className="flex-1">
                        <h4 className="text-sm font-bold text-gray-900">{topic.title}</h4>
                        {topic.description && (
                          <p className="text-xs text-gray-500 line-clamp-1">{topic.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => startEditing(topic)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-600 transition-colors"
                          title="Edit"
                        >
                          <IconPencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(topic.id)}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-600 transition-colors"
                          title="Delete"
                        >
                          <IconTrash className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <AnimatePresence>
            {showAddForm && (
              <motion.form
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                onSubmit={handleCreate}
                className="rounded-2xl bg-gray-50 p-5 space-y-4 border-2 border-gray-100"
              >
                <h3 className="text-sm font-bold text-gray-900">New Topic</h3>
                <div>
                  <input
                    autoFocus
                    type="text"
                    value={newTopic.title}
                    onChange={(e) => setNewTopic({ ...newTopic, title: e.target.value })}
                    className="w-full rounded-xl border-gray-200 bg-white px-4 py-2.5 text-sm font-medium focus:ring-[#A78BFA]"
                    placeholder="Topic Title (e.g., Module 1: Basics)"
                    required
                  />
                </div>
                <div>
                  <textarea
                    value={newTopic.description}
                    onChange={(e) => setNewTopic({ ...newTopic, description: e.target.value })}
                    className="w-full rounded-xl border-gray-200 bg-white px-4 py-2.5 text-sm focus:ring-[#A78BFA]"
                    placeholder="Brief description of what's covered..."
                    rows={2}
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAddForm(false)}
                    className="px-4 py-2 text-sm font-bold text-gray-500 hover:bg-white rounded-xl transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-[#2D2D2D] text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl transition-all"
                  >
                    Add Topic
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </div>

        {!showAddForm && !loading && (
          <div className="mt-8">
            <button
              onClick={() => setShowAddForm(true)}
              className="w-full flex items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[#A78BFA]/30 py-4 text-[#A78BFA] font-bold hover:bg-[#A78BFA]/5 transition-all text-sm"
            >
              <IconPlus className="w-5 h-5" />
              Add New Topic
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
};
