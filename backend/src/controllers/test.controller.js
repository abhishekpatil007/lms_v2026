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
        const { content, type, marks, options, order_index } = req.body;
        const file = req.file;

        // Transaction for question + options
        const result = await db.sequelize.transaction(async (t) => {
            const question = await Question.create({
                block_id,
                content,
                type,
                marks,
                order_index,
                reference_media_url: file ? getFileUrl(file) : null
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
                    const optionData = parsedOptions.map(opt => ({
                        question_id: question.id,
                        content: opt.content,
                        is_correct: opt.is_correct,
                        order_index: opt.order_index
                    }));

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
        const test = await Test.findByPk(id, {
            include: [
                {
                    model: Block,
                    as: 'blocks',
                    include: [
                        {
                            model: Question,
                            as: 'questions',
                            include: [{ model: Option, as: 'options' }]
                        }
                    ]
                }
            ],
            order: [
                [{ model: Block, as: 'blocks' }, 'order_index', 'ASC'],
                [{ model: Block, as: 'blocks' }, { model: Question, as: 'questions' }, 'order_index', 'ASC']
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
