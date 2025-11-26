import db from '../models/index.js';
import { createModuleLogger } from '../utils/logger/logger.js';

const { Attempt, AttemptAnswer, Question, User, Test } = db;
const logger = createModuleLogger('evaluationController');

export const getPendingEvaluations = async (req, res) => {
    try {
        const { test_id } = req.query;

        const whereClause = { status: 'submitted' };
        if (test_id) whereClause.test_id = test_id;

        const attempts = await Attempt.findAll({
            where: whereClause,
            include: [
                { model: User, as: 'student', attributes: ['id', 'name', 'email'] },
                { model: Test, as: 'test', attributes: ['id', 'title'] }
            ]
        });

        res.json(attempts);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching evaluations', error: error.message });
    }
};

export const getAttemptDetails = async (req, res) => {
    try {
        const { attempt_id } = req.params;

        const attempt = await Attempt.findByPk(attempt_id, {
            include: [
                {
                    model: AttemptAnswer,
                    as: 'answers',
                    include: [{ model: Question, as: 'question' }]
                }
            ]
        });

        if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

        res.json(attempt);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching attempt details', error: error.message });
    }
};

export const submitScore = async (req, res) => {
    try {
        const { attempt_id } = req.params;
        const { scores } = req.body; // Array of { answer_id, marks_awarded, comment }

        const attempt = await Attempt.findByPk(attempt_id);
        if (!attempt) return res.status(404).json({ message: 'Attempt not found' });

        let totalScore = 0;

        await db.sequelize.transaction(async (t) => {
            for (const score of scores) {
                const answer = await AttemptAnswer.findByPk(score.answer_id, { transaction: t });
                if (answer) {
                    answer.marks_awarded = score.marks_awarded;
                    answer.evaluator_comment = score.comment;
                    answer.is_evaluated = true;
                    await answer.save({ transaction: t });
                    totalScore += parseFloat(score.marks_awarded);
                }
            }

            // Also calculate auto-graded MCQ scores if not already done or if we want to aggregate
            // For now, assume totalScore passed includes everything or we re-calculate
            // Let's just update the attempt total score

            attempt.total_score = totalScore; // This might need to be additive with existing scores if partial update
            attempt.status = 'evaluated';
            await attempt.save({ transaction: t });
        });

        res.json({ message: 'Evaluation submitted', totalScore });
    } catch (error) {
        logger.error(`Error submitting score: ${error.message}`);
        res.status(500).json({ message: 'Error submitting score', error: error.message });
    }
};
