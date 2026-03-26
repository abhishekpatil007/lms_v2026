import db from '../models/index.js';
import { createModuleLogger } from '../utils/logger/logger.js';

const { User, Batch, BatchStudent } = db;
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
            attributes: ['id', 'name', 'email', 'is_active', 'preferred_language', 'created_at'],
            include: [{
                model: Batch,
                as: 'batches',
                attributes: ['id', 'batch_name'],
                through: { attributes: [] },
            }],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['name', 'ASC']],
            distinct: true,
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

// -------------------------------------------------------------------
// updateUser - update user details (name, email, preferred_language)
// -------------------------------------------------------------------
export const updateUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const allowedFields = ['name', 'email', 'preferred_language'];
        const updateData = {};
        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }

        await user.update(updateData);
        logger.info(`User updated - ID: ${userId}, Fields: ${Object.keys(updateData).join(', ')}`);
        return res.json({ message: 'User updated successfully', user: { id: user.id, name: user.name, email: user.email, role: user.role, preferred_language: user.preferred_language, is_active: user.is_active, created_at: user.created_at } });
    } catch (err) {
        logger.error(`Error in updateUser: ${err.message}`);
        return res.status(500).json({ message: err.message });
    }
};

// -------------------------------------------------------------------
// deleteUser - soft delete (deactivate) user by setting is_active=false
// -------------------------------------------------------------------
export const deleteUser = async (req, res) => {
    try {
        const userId = req.params.id;
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (user.role === 'admin') {
            return res.status(403).json({ message: 'Cannot delete admin users' });
        }

        await user.update({ is_active: false });

        // Remove from all batch enrollments if student
        if (user.role === 'student') {
            await BatchStudent.destroy({ where: { student_id: userId } });
        }

        logger.info(`User deactivated - ID: ${userId}, Role: ${user.role}`);
        return res.json({ message: 'User deleted successfully' });
    } catch (err) {
        logger.error(`Error in deleteUser: ${err.message}`);
        return res.status(500).json({ message: err.message });
    }
};
