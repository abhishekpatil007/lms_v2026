import db from '../models/index.js';
import { createModuleLogger } from '../utils/logger/logger.js';

const { Topic, Video, Document, BatchStudent, Batch } = db;
const logger = createModuleLogger('topicController');

export const createTopic = async (req, res) => {
    try {
        const { batch_id, title, description, order_index } = req.body;
        
        const topic = await Topic.create({
            batch_id,
            title,
            description,
            order_index,
        });

        logger.info(`Topic created - Topic ID: ${topic.id}, Batch ID: ${batch_id}`);
        res.status(201).json(topic);
    } catch (error) {
        logger.error(`Error creating topic: ${error.message}`);
        res.status(500).json({ message: 'Error creating topic', error: error.message });
    }
};

export const updateTopic = async (req, res) => {
    try {
        const { id } = req.params;
        const { title, description, order_index, is_active } = req.body;

        const topic = await Topic.findByPk(id);
        if (!topic) return res.status(404).json({ message: 'Topic not found' });

        await topic.update({
            title: title !== undefined ? title : topic.title,
            description: description !== undefined ? description : topic.description,
            order_index: order_index !== undefined ? order_index : topic.order_index,
            is_active: is_active !== undefined ? is_active : topic.is_active,
        });

        logger.info(`Topic updated - Topic ID: ${id}`);
        res.json(topic);
    } catch (error) {
        logger.error(`Error updating topic: ${error.message}`);
        res.status(500).json({ message: 'Error updating topic', error: error.message });
    }
};

export const deleteTopic = async (req, res) => {
    try {
        const { id } = req.params;
        const topic = await Topic.findByPk(id);
        if (!topic) return res.status(404).json({ message: 'Topic not found' });

        // Check if topic has resources
        const videoCount = await Video.count({ where: { topic_id: id } });
        const docCount = await Document.count({ where: { topic_id: id } });

        if (videoCount > 0 || docCount > 0) {
            return res.status(400).json({ 
                message: 'Cannot delete topic with existing resources. Reassign or delete resources first.' 
            });
        }

        await topic.destroy();
        logger.info(`Topic deleted - Topic ID: ${id}`);
        res.json({ message: 'Topic deleted successfully' });
    } catch (error) {
        logger.error(`Error deleting topic: ${error.message}`);
        res.status(500).json({ message: 'Error deleting topic', error: error.message });
    }
};

export const listTopicsByBatch = async (req, res) => {
    try {
        const { batch_id } = req.params;
        const { page = 1, limit = 10, search = '' } = req.query;
        const offset = (page - 1) * limit;

        const userId = req.user?.user?.id || req.user?.id;
        const role = req.user?.user?.role || req.user?.role;

        let whereClause = { is_active: true };

        if (batch_id === 'enrolled' && role === 'student') {
            const enrollments = await BatchStudent.findAll({
                where: { student_id: userId },
                include: [{
                    model: Batch,
                    as: 'batch',
                    where: { status: 'ongoing' },
                    attributes: ['id']
                }],
                raw: true,
                nest: true
            });
            const batchIds = enrollments.map(e => e.batch_id);
            if (batchIds.length === 0) return res.json({ topics: [], total: 0, totalPages: 0, currentPage: parseInt(page) });
            whereClause.batch_id = batchIds;
        } else {
            whereClause.batch_id = batch_id;
        }

        if (search) {
            whereClause.title = { [db.Sequelize.Op.like]: `%${search}%` };
        }

        const { count, rows } = await Topic.findAndCountAll({
            where: whereClause,
            order: [['order_index', 'ASC'], ['created_at', 'ASC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
        });

        res.json({
            topics: rows,
            total: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        logger.error(`Error listing topics: ${error.message}`);
        res.status(500).json({ message: 'Error listing topics', error: error.message });
    }
};
