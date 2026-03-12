import db from '../models/index.js';
import { createModuleLogger } from '../utils/logger/logger.js';

const { User } = db;
const logger = createModuleLogger('userController');

export const getAllInstructors = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const offset = (page - 1) * limit;
        const where = { role: 'instructor', is_active: true };

        if (search) {
            where[db.Sequelize.Op.or] = [
                { name: { [db.Sequelize.Op.like]: `%${search}%` } },
                { email: { [db.Sequelize.Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await User.findAndCountAll({
            where,
            attributes: ['id', 'name', 'email', 'is_active', 'created_at'],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['name', 'ASC']],
        });

        logger.info(`Instructors retrieved - Count: ${rows.length}`);
        res.json({
            instructors: rows,
            total: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page)
        });
    } catch (err) {
        logger.error(`Error in getAllInstructors: ${err.message}`);
        res.status(500).json({ message: err.message });
    }
};

export const getAllStudents = async (req, res) => {
    try {
        const { page = 1, limit = 10, search = '' } = req.query;
        const offset = (page - 1) * limit;
        const where = { role: 'student', is_active: true };

        if (search) {
            where[db.Sequelize.Op.or] = [
                { name: { [db.Sequelize.Op.like]: `%${search}%` } },
                { email: { [db.Sequelize.Op.like]: `%${search}%` } }
            ];
        }

        const { count, rows } = await User.findAndCountAll({
            where,
            attributes: ['id', 'name', 'email', 'is_active', 'created_at'],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['name', 'ASC']],
        });

        logger.info(`Students retrieved - Count: ${rows.length}`);
        res.json({
            students: rows,
            total: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page)
        });
    } catch (err) {
        logger.error(`Error in getAllStudents: ${err.message}`);
        res.status(500).json({ message: err.message });
    }
};
