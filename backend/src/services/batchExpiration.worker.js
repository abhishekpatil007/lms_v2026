import cron from 'node-cron';
import db from '../models/index.js';
import { createModuleLogger } from '../utils/logger/logger.js';
import { Op } from 'sequelize';

const logger = createModuleLogger('batchExpirationWorker');
const { Batch } = db;

/**
 * Automatically updates batches whose end_date has passed to 'completed' status.
 * Runs every day at midnight.
 */
export const initBatchExpirationWorker = () => {
    // Run every day at 00:00
    cron.schedule('0 0 * * *', async () => {
        logger.info('Running batch expiration check...');
        try {
            const today = new Date().toISOString().split('T')[0];

            const [updatedCount] = await Batch.update(
                { status: 'completed' },
                {
                    where: {
                        status: 'ongoing',
                        end_date: {
                            [Op.lt]: today
                        }
                    }
                }
            );

            if (updatedCount > 0) {
                logger.info(`Batch expiration check complete. Updated ${updatedCount} batches to 'completed'.`);
            } else {
                logger.info('Batch expiration check complete. No batches updated.');
            }
        } catch (error) {
            logger.error(`Error in batch expiration worker: ${error.message}`);
        }
    });

    logger.info('Batch Expiration Worker initialized (Daily at 00:00)');
};
