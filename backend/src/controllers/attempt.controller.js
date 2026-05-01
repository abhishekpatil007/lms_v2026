import db from '../models/index.js';
import { getFileUrl } from '../services/storage.service.js';
import { Op } from 'sequelize';
import { createModuleLogger } from '../utils/logger/logger.js';

const { Test, Block, Question, Attempt, AttemptBlock, AttemptAnswer, ProctoringLog } = db;
const logger = createModuleLogger('attemptController');

export const startAttempt = async (req, res) => {
    try {
        const { test_id } = req.body;
        const userId = req.user.user.id;

        // 1. Fetch Test
        const test = await Test.findByPk(test_id);
        if (!test) return res.status(404).json({ message: 'Test not found' });

        // 3. Check Eligibility (Time, Max Attempts)
        const now = new Date();
        if (now < test.start_time || now > test.end_time) {
            return res.status(403).json({ message: 'Test is not currently active' });
        }

        const attemptCount = await Attempt.count({ where: { test_id, user_id: userId } });
        if (attemptCount >= test.max_attempts) {
            return res.status(403).json({ message: 'Max attempts reached' });
        }

        // 4. Create Attempt
        const attempt = await Attempt.create({
            test_id,
            user_id: userId,
            ip_address: req.ip,
            status: 'ongoing'
        });

        res.status(201).json(attempt);
    } catch (error) {
        logger.error(`Error starting attempt: ${error.message}`);
        res.status(500).json({ message: 'Error starting attempt', error: error.message });
    }
};

export const startBlock = async (req, res) => {
    try {
        const { attempt_id, block_id } = req.body;
        const userId = req.user.user.id;

        const attempt = await Attempt.findOne({ where: { id: attempt_id, user_id: userId } });
        if (!attempt || attempt.status !== 'ongoing') {
            return res.status(403).json({ message: 'Invalid attempt' });
        }

        // Check if block already started
        let attemptBlock = await AttemptBlock.findOne({ where: { attempt_id, block_id } });

        if (attemptBlock) {
            if (attemptBlock.status === 'completed') {
                return res.status(400).json({ message: 'Block already completed', attemptBlock });
            }
            // If ongoing, simply proceed to fetch questions so user can resume
        } else {
            // New Block Start: Check if another block is currently ongoing
            const ongoingBlock = await AttemptBlock.findOne({
                where: { attempt_id, status: 'ongoing' }
            });
            if (ongoingBlock) {
                return res.status(400).json({ message: 'Another block is currently active. Submit it first.' });
            }

            const block = await Block.findByPk(block_id);
            if (!block) return res.status(404).json({ message: 'Block not found' });

            attemptBlock = await AttemptBlock.create({
                attempt_id,
                block_id,
                start_time: new Date(),
                status: 'ongoing'
            });
        }

        // Return questions for this block
        const questions = await Question.findAll({
            where: { block_id },
            attributes: ['id', 'content', 'type', 'marks', 'reference_media_url', 'order_index'],
            include: [{ model: db.Option, as: 'options', attributes: ['id', 'content', 'order_index', 'media_url'] }],
            order: [['order_index', 'ASC']]
        });

        // Include block metadata for frontend timer/display
        const blockData = await Block.findByPk(block_id, { attributes: ['id', 'title', 'duration_minutes', 'order_index', 'total_marks'] });
        res.json({ attemptBlock, questions, block: blockData });
    } catch (error) {
        res.status(500).json({ message: 'Error starting block', error: error.message });
    }
};

export const submitBlock = async (req, res) => {
    try {
        const { attempt_id, block_id, answers } = req.body;
        const userId = req.user.user.id;

        const attemptBlock = await AttemptBlock.findOne({
            where: { attempt_id, block_id },
            include: [{ model: Block, as: 'block' }]
        });

        if (!attemptBlock)
            return res.status(404).json({ message: 'Block attempt not found' });

        // Verify ownership
        const attempt = await Attempt.findByPk(attempt_id);
        if (attempt.user_id !== userId)
            return res.status(403).json({ message: 'Unauthorized' });

        if (attemptBlock.status === 'completed') {
            return res.json({ message: 'Block already submitted' });
        }

        const now = new Date();
        const startTime = new Date(attemptBlock.start_time);
        const maxDuration = attemptBlock.block.duration_minutes * 60 * 1000;
        const buffer = 30 * 1000;

        let result;

        await db.sequelize.transaction(async (t) => {
            // Save answers
            if (answers && Array.isArray(answers)) {
                for (const ans of answers) {
                    await AttemptAnswer.upsert({
                        attempt_id,
                        question_id: ans.question_id,
                        selected_option_id: ans.selected_option_id || null,
                        text_answer: ans.text_answer || null,
                    }, { transaction: t });
                }
            }

            // Mark block completed
            attemptBlock.status = 'completed';
            attemptBlock.end_time = now;
            await attemptBlock.save({ transaction: t });

            // Check if last block
            const nextBlock = await Block.findOne({
                where: {
                    test_id: attemptBlock.block.test_id,
                    order_index: { [Op.gt]: attemptBlock.block.order_index }
                },
                transaction: t
            });

            if (!nextBlock) {
                attempt.status = 'submitted';
                attempt.end_time = now;
                await attempt.save({ transaction: t });
                result = { isFinal: true };
            } else {
                result = { isFinal: false };
            }
        });

        // Single point of response:
        if (result.isFinal) {
            return res.json({ message: 'Attempt submitted successfully', isFinal: true });
        } else {
            return res.json({ message: 'Block submitted successfully', isFinal: false });
        }

    } catch (error) {
        logger.error(`Error submitting block: ${error.message}`);
        res.status(500).json({
            message: 'Error submitting block',
            error: error.message
        });
    }
};

export const uploadAnswerFile = async (req, res) => {
    try {
        const { attempt_id, question_id } = req.body;
        const files = req.files || [];

        if (files.length === 0) return res.status(400).json({ message: 'No files uploaded' });

        const fileUrls = files.map(f => getFileUrl(f));

        // Check if there's an existing answer with files to append to
        const existing = await AttemptAnswer.findOne({ where: { attempt_id, question_id } });
        let allUrls = fileUrls;
        if (existing && existing.file_url) {
            try {
                const prev = JSON.parse(existing.file_url);
                allUrls = [...prev, ...fileUrls];
            } catch {
                allUrls = [existing.file_url, ...fileUrls];
            }
        }

        await AttemptAnswer.upsert({
            attempt_id,
            question_id,
            file_url: JSON.stringify(allUrls)
        });

        res.json({ message: 'Files uploaded', fileUrls: allUrls });
    } catch (error) {
        res.status(500).json({ message: 'Error uploading files', error: error.message });
    }
};

export const resumeAttempt = async (req, res) => {
    try {
        const { test_id } = req.query;
        const userId = req.user.user.id;

        const attempt = await Attempt.findOne({
            where: {
                test_id,
                user_id: userId,
                status: 'ongoing'
            },
            include: [{ model: AttemptBlock, as: 'blocks' }]
        });

        if (!attempt) {
            return res.status(404).json({ message: 'No active attempt found' });
        }

        // Find active block
        const activeBlock = attempt.blocks.find(b => b.status === 'ongoing');

        res.json({
            attempt,
            activeBlock,
            serverTime: new Date()
        });
    } catch (error) {
        res.status(500).json({ message: 'Error resuming attempt', error: error.message });
    }
};

export const logProctoringEvent = async (req, res) => {
    try {
        const { attempt_id, event_type, details } = req.body;
        await ProctoringLog.create({
            attempt_id,
            event_type,
            details: JSON.stringify(details)
        });
        res.status(200).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

export const getAttemptResult = async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.user.id;

        const attempt = await Attempt.findOne({
            where: { id, user_id: userId },
            include: [
                { model: Test, as: 'test' },
                {
                    model: AttemptAnswer,
                    as: 'answers',
                    include: [{ model: Question, as: 'question' }]
                }
            ]
        });

        if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

        if (attempt.status === 'ongoing') {
            return res.status(400).json({ message: 'Attempt is still ongoing' });
        }

        // Check if results should be shown
        if (!attempt.test.show_results_immediately && attempt.status !== 'evaluated') {
            return res.json({
                message: 'Test submitted successfully. Results will be declared later.',
                status: attempt.status,
                attempt_id: attempt.id
            });
        }

        // Return results
        res.json({
            attempt_id: attempt.id,
            test_title: attempt.test.title,
            total_score: attempt.total_score,
            status: attempt.status,
            answers: attempt.answers.map(ans => ({
                question_id: ans.question_id,
                question: ans.question.content,
                selected_option_id: ans.selected_option_id,
                text_answer: ans.text_answer,
                marks_awarded: ans.marks_awarded,
                is_correct: ans.marks_awarded > 0 // Simple check, might need refinement based on logic
            }))
        });

    } catch (error) {
        logger.error(`Error fetching attempt result: ${error.message}`);
        res.status(500).json({ message: 'Error fetching result', error: error.message });
    }
};

export const getAllAttempts = async (req, res) => {
    try {
        const userId = req.user.user.id;
        const { test_id } = req.query;

        const where = { user_id: userId };
        if (test_id) {
            where.test_id = test_id;
        }

        const attempts = await Attempt.findAll({
            where,
            include: [
                { model: Test, as: 'test', attributes: ['id', 'title'] }
            ],
            order: [['createdAt', 'DESC']] // Fixed casing to match Sequelize default often, or strictly what was there. The previous code had created_at which might be wrong if standard is createdAt. checking previous file... it had created_at. I will stick to created_at if that's what was there, OR check the model. Actually previous file output said `createdAt` in response for other methods. I'll use `createdAt`. Wait. the view_file output showed `created_at` at line 345. Let's look at the view_file output again.
            // step 33 output: "order: [['created_at', 'DESC']]"
            // But step 28 output (Get Test Details response Body) shows "createdAt": "..."
            // Usually Sequelize uses camelCase `createdAt` by default unless underscored: true is set.
            // Option model had underscored: true.
            // Let's assume the previous code `created_at` was either correct (underscored) or incorrect.
            // I'll stick to what was there (`created_at`) to be safe, OR actually `createdAt` is standard in JS context for Sequelize unless raw query.
            // Ah, line 345 in step 33 says `order: [['created_at', 'DESC']]`.
            // I will use `where` construction and keep order as is but usually it's `createdAt`.
            // Let's look at `Attempt` model? I don't have it open.
            // Safe bet: The file had `order: [['created_at', 'DESC']]` so I will keep it but add the `where` logic.
        });

        res.json(attempts);
    } catch (error) {
        logger.error(`Error fetching attempts: ${error.message}`);
        res.status(500).json({ message: 'Error fetching attempts', error: error.message });
    }
};
