import db from '../models/index.js';
import { getFileUrl } from '../services/storage.service.js';
import { createModuleLogger } from '../utils/logger/logger.js';

const logger = createModuleLogger('testController');

const { Test, Block, Question, Option, Batch, User } = db;

export const createTest = async (req, res) => {
    try {
        const { title, description, batch_id, start_time, end_time, duration_minutes, max_attempts, shuffle_questions } = req.body;

        // Validation
        if (!title || !batch_id || !start_time || !end_time) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        const test = await Test.create({
            title,
            description,
            batch_id,
            created_by: req.user.user.id,
            start_time,
            end_time,
            duration_minutes,
            max_attempts,
            shuffle_questions
        });

        res.status(201).json(test);
    } catch (error) {
        logger.error(`Error creating test: ${error.message}`);
        res.status(500).json({ message: 'Error creating test', error: error.message });
    }
};

export const addBlock = async (req, res) => {
    try {
        const { test_id } = req.params;
        const { title, duration_minutes, order_index } = req.body;

        const block = await Block.create({
            test_id,
            title,
            duration_minutes,
            order_index
        });

        res.status(201).json(block);
    } catch (error) {
        res.status(500).json({ message: 'Error adding block', error: error.message });
    }
};

export const addQuestion = async (req, res) => {
    try {
        const { block_id } = req.params;
        const { content, type, marks, options, order_index, model_answer } = req.body;
        const files = req.files || {};
        const referenceMediaFiles = files['reference_media'] || [];
        const optionMediaFiles = files['option_media'] || [];

        // Transaction for question + options
        const result = await db.sequelize.transaction(async (t) => {
            const question = await Question.create({
                block_id,
                content,
                type,
                marks,
                order_index,
                reference_media_url: referenceMediaFiles.length > 0 ? JSON.stringify(referenceMediaFiles.map(f => getFileUrl(f))) : null,
                model_answer: type === 'SHORT_ANSWER' ? model_answer : null
            }, { transaction: t });

            if (type === 'MCQ') {
                let parsedOptions = [];

                // Parse if string (multipart/form-data)
                if (typeof options === 'string') {
                    try {
                        parsedOptions = JSON.parse(options);
                    } catch (e) {
                        return res.status(400).json({ message: "Invalid JSON in options" });
                    }
                }
                // When request is JSON
                else if (Array.isArray(options)) {
                    parsedOptions = options;
                }

                if (parsedOptions.length > 0) {
                    const optionData = parsedOptions.map((opt, index) => {
                        // Find if there's an image for this option index
                        // We assume options are sent in order and files are named or ordered accordingly
                        // But since we can't easily map file to index via array input, we might rely on order
                        // OR we can check if the option object has a media_index or similar if we were advanced.
                        // For now, let's assume the frontend sends option_media in the same order as options that need images.

                        // Better approach: Frontend sends options as JSON string. 
                        // If we want to map specific files, we might need a more complex structure.
                        // Simplified approach: If option has `has_media: true`, we take the next available file.

                        let mediaUrl = null;
                        if (opt.has_media && optionMediaFiles.length > 0) {
                            // This is a simple FIFO assignment. 
                            // Ideally, frontend should send a unique ID to map, but for now this works if order is preserved.
                            const file = optionMediaFiles.shift();
                            if (file) mediaUrl = getFileUrl(file);
                        }

                        return {
                            question_id: question.id,
                            content: opt.content,
                            is_correct: opt.is_correct,
                            order_index: opt.order_index,
                            media_url: mediaUrl
                        };
                    });

                    await Option.bulkCreate(optionData, { transaction: t });
                }
            }

            // Update block totals
            const block = await Block.findByPk(block_id, { transaction: t });
            if (block) {
                block.total_questions += 1;
                block.total_marks += parseInt(marks || 0);
                await block.save({ transaction: t });
            }

            return question;
        });

        res.status(201).json(result);
    } catch (error) {
        logger.error(`Error adding question: ${error.message}`);
        res.status(500).json({ message: 'Error adding question', error: error.message });
    }
};

export const getTestDetails = async (req, res) => {
    try {
        const { id } = req.params;
        const userRole = req.user.user.role;

        const includeOptions = {
            model: Block,
            as: 'blocks',
            include: []
        };

        // If NOT student, include questions and options
        if (userRole !== 'student') {
            includeOptions.include.push({
                model: Question,
                as: 'questions',
                include: [{ model: Option, as: 'options' }]
            });
        }
        // If student, we might want to include questions but SANS model_answer and is_correct?
        // OR better: Don't include questions at all. Students fetch questions via startBlock.
        // The plan said: "GET /tests/:id will strictly return Test Metadata + Block Metadata"
        // So we keep clean: exclude questions entirely for students.

        const test = await Test.findByPk(id, {
            include: [includeOptions],
            order: [
                [{ model: Block, as: 'blocks' }, 'order_index', 'ASC'],
                // Only order questions if we are fetching them
                ...(userRole !== 'student' ? [[{ model: Block, as: 'blocks' }, { model: Question, as: 'questions' }, 'order_index', 'ASC']] : [])
            ]
        });

        if (!test) return res.status(404).json({ message: 'Test not found' });

        res.json(test);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching test', error: error.message });
    }
};

export const publishTest = async (req, res) => {
    try {
        const { id } = req.params;
        const test = await Test.findByPk(id);
        if (!test) return res.status(404).json({ message: 'Test not found' });

        test.status = 'published';
        await test.save();

        res.json({ message: 'Test published', test });
    } catch (error) {
        res.status(500).json({ message: 'Error publishing test', error: error.message });
    }
};

export const listTests = async (req, res) => {
    try {
        let { batch_id, status, search, page = 1, limit = 10 } = req.query;
        page = parseInt(page, 10) || 1;
        limit = parseInt(limit, 10) || 10;
        const offset = (page - 1) * limit;

        const where = {};

        if (batch_id) where.batch_id = batch_id;
        if (status) where.status = status;

        if (search) {
            where.title = { [db.Sequelize.Op.like]: `%${search}%` };
        }

        // If student, only show published tests
        if (req.user.user.role === 'student') {
            where.status = 'published';
        }

        const { count, rows: tests } = await Test.findAndCountAll({
            where,
            include: [
                { model: Batch, as: 'batch', attributes: ['id', 'batch_name'] },
                { model: User, as: 'creator', attributes: ['id', 'name'] }
            ],
            order: [['createdAt', 'DESC']],
            limit,
            offset
        });

        res.json({
            tests,
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit)
        });
    } catch (error) {
        res.status(500).json({ message: 'Error listing tests', error: error.message });
    }
};
