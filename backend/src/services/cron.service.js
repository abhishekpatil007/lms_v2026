import cron from 'node-cron';
import { Op } from 'sequelize';
import db from '../models/index.js';
const { Batch } = db;
import batchLogger from '../utils/logger/individualLogger/batchLogger.js';

export const initCronJobs = () => {
    // Run daily at midnight to update batch statuses
    cron.schedule('0 0 * * *', async () => {
        batchLogger.info('Starting daily cron job to update batch statuses.');
        try {
            const today = new Date();
            const todayDateString = today.toISOString().split('T')[0];

            // Update to Draft: If start_date is in the future
            await Batch.update(
                { status: 'draft' },
                {
                    where: {
                        start_date: { [Op.gt]: todayDateString },
                        status: { [Op.ne]: 'draft' }
                    }
                }
            );

            // Update to Ongoing: If today is between start_date and end_date (inclusive)
            await Batch.update(
                { status: 'ongoing' },
                {
                    where: {
                        start_date: { [Op.lte]: todayDateString },
                        end_date: { [Op.gte]: todayDateString },
                        status: { [Op.ne]: 'ongoing' }
                    }
                }
            );

            // Update to Completed: If end_date is in the past
            await Batch.update(
                { status: 'completed' },
                {
                    where: {
                        end_date: { [Op.lt]: todayDateString },
                        status: { [Op.ne]: 'completed' }
                    }
                }
            );

            batchLogger.info('Daily cron job for batch status update finished successfully.');
        } catch (error) {
            batchLogger.error(`Error in automated batch status update: ${error.message}`);
        }
    });

    batchLogger.info('Cron jobs initialized successfully.');
};
