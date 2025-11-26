import cron from 'node-cron';
import db from '../models/index.js';
import { Op } from 'sequelize';
import { createModuleLogger } from '../utils/logger/logger.js';

const { Attempt, AttemptBlock, Block, Test } = db;
const logger = createModuleLogger('autoSubmitWorker');

export const initAutoSubmitWorker = () => {
    // Run every minute
    cron.schedule('* * * * *', async () => {
        logger.info('Running auto-submit check...');
        await checkExpiredBlocks();
        await checkExpiredTests();
    });

    logger.info('✅ Auto-submit worker initialized (node-cron)');
};

async function checkExpiredBlocks() {
    try {
        const now = new Date();
        // Find ongoing blocks
        const ongoingBlocks = await AttemptBlock.findAll({
            where: { status: 'ongoing' },
            include: [{ model: Block, as: 'block' }]
        });

        for (const attemptBlock of ongoingBlocks) {
            const startTime = new Date(attemptBlock.start_time);
            const durationMs = attemptBlock.block.duration_minutes * 60 * 1000;
            const buffer = 60 * 1000; // 1 minute buffer

            if (now.getTime() > startTime.getTime() + durationMs + buffer) {
                logger.info(`Auto-submitting expired block ${attemptBlock.id}`);
                attemptBlock.status = 'completed';
                attemptBlock.end_time = now;
                await attemptBlock.save();
            }
        }
    } catch (error) {
        logger.error(`Error in checkExpiredBlocks: ${error.message}`);
    }
}

async function checkExpiredTests() {
    try {
        const now = new Date();
        // Find ongoing attempts for expired tests
        const expiredAttempts = await Attempt.findAll({
            where: { status: 'ongoing' },
            include: [{
                model: Test,
                as: 'test',
                where: {
                    end_time: { [Op.lt]: now }
                }
            }]
        });

        for (const attempt of expiredAttempts) {
            logger.info(`Auto-submitting expired attempt ${attempt.id}`);
            attempt.status = 'expired'; // or submitted
            attempt.end_time = now;
            await attempt.save();

            // Also close any open blocks
            await AttemptBlock.update(
                { status: 'completed', end_time: now },
                { where: { attempt_id: attempt.id, status: 'ongoing' } }
            );
        }
    } catch (error) {
        logger.error(`Error in checkExpiredTests: ${error.message}`);
    }
}
