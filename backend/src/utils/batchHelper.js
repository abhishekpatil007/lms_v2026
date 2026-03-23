import db from '../models/index.js';
const { BatchStudent, Batch } = db;

/**
 * Checks if a user (student or instructor) is authorized for a batch.
 * @param {string} userId - The ID of the user.
 * @param {string} batchId - The ID of the batch.
 * @param {string} role - The role of the user (admin, instructor, student).
 * @returns {Promise<boolean>}
 */
export const isUserAuthorizedForBatch = async (userId, batchId, role) => {
    if (role === 'admin') return true;

    if (role === 'instructor') {
        const batch = await Batch.findOne({
            where: { id: batchId, instructor_id: userId, is_active: true }
        });
        return !!batch;
    }

    if (role === 'student') {
        const enrollment = await BatchStudent.findOne({
            where: { batch_id: batchId, student_id: userId }
        });
        return !!enrollment;
    }

    return false;
};
