import db from '../models/index.js';
import { createModuleLogger } from '../utils/logger/logger.js';

const { User, Course, Batch, Test } = db;
const logger = createModuleLogger('statsController');

export const getDashboardStats = async (req, res) => {
    try {
        const [
            totalStudents,
            totalInstructors,
            totalCourses,
            totalBatches,
            activeBatches,
            completedBatches,
            draftBatches
        ] = await Promise.all([
            User.count({ where: { role: 'student' } }),
            User.count({ where: { role: 'instructor' } }),
            Course.count({ where: { status: 'active' } }),
            Batch.count(),
            Batch.count({ where: { status: 'ongoing' } }),
            Batch.count({ where: { status: 'completed' } }),
            Batch.count({ where: { status: 'draft' } })
        ]);

        const totalUsers = totalStudents + totalInstructors + 1; // +1 for admin

        res.json({
            totalUsers,
            totalStudents,
            totalInstructors,
            totalCourses,
            totalBatches,
            activeBatches,
            completedBatches,
            draftBatches
        });
    } catch (error) {
        logger.error(`Error fetching dashboard stats: ${error.message}`);
        res.status(500).json({ message: 'Error fetching stats', error: error.message });
    }
};
