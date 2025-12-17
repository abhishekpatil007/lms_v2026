// src/controllers/batch.controller.js
import { Op } from 'sequelize';;
import db from '../models/index.js';
const { Course, Batch, User, BatchStudent } = db;
import { sendWelcomeEmail, notifyInstructor } from '../services/batchEmail.service.js';
import batchLogger from '../utils/logger/individualLogger/batchLogger.js';

// --------------------------
// Helper: Auto-update batch status
// --------------------------
const updateBatchStatusIfNeeded = async (batch) => {
    const today = new Date();
    let newStatus = batch.status;

    if (batch.start_date && batch.end_date) {
        const start = new Date(batch.start_date);
        const end = new Date(batch.end_date);

        if (today < start) newStatus = 'draft';
        else if (today >= start && today <= end) newStatus = 'ongoing';
        else if (today > end) newStatus = 'completed';
    }

    if (newStatus !== batch.status) {
        await batch.update({ status: newStatus });
        batch.status = newStatus;
    }

    return batch;
};

// --------------------------
// Admin: Create Batch
// --------------------------
export const createBatch = async (req, res) => {
    try {
        const { batch_name, course_id, start_date, end_date, instructor_id, description } = req.body;
        if (!batch_name || !course_id || !start_date || !end_date) {
            batchLogger.warn('Create Batch - Required fields missing');
            return res.status(400).json({ message: 'Required fields missing' });
        }

        const course = await Course.findByPk(course_id);
        if (!course) {
            batchLogger.warn(`Create Batch - Course not found: ${course_id}`);
            return res.status(400).json({ message: 'Course not found' });
        }

        const batch = await Batch.create({
            batch_name,
            course_id,
            start_date,
            end_date,
            instructor_id: instructor_id || null,
            description: description || null,
            created_by: req.user.user.id
        });

        if (instructor_id) {
            await notifyInstructor(batch, instructor_id);
        }

        batchLogger.info(`Batch created successfully - Batch ID: ${batch.id}, Name: ${batch_name}`);
        res.status(201).json({ message: 'Batch created successfully', batch });
    } catch (err) {
        batchLogger.error(`Error in createBatch: ${err.message}`);
        res.status(500).json({ message: err.message });
    }
};


// --------------------------
// Admin: Update Batch
// --------------------------
export const updateBatch = async (req, res) => {
    try {
        const batch = await Batch.findByPk(req.params.id);
        if (!batch) {
            batchLogger.warn(`Update Batch - Batch not found: ${req.params.id}`);
            return res.status(404).json({ message: 'Batch not found' });
        }

        const prevInstructor = batch.instructor_id;

        await batch.update(req.body);

        // Notify new instructor if changed
        if (req.body.instructor_id && req.body.instructor_id !== prevInstructor) {
            await notifyInstructor(batch, req.body.instructor_id);
            batchLogger.info(`Batch updated with new instructor - Batch ID: ${batch.id}, Instructor ID: ${req.body.instructor_id}`);
        }

        batchLogger.info(`Batch updated successfully - Batch ID: ${batch.id}`);
        res.json({ message: 'Batch updated successfully', batch });
    } catch (err) {
        batchLogger.error(`Error in updateBatch: ${err.message}`);
        res.status(500).json({ message: err.message });
    }
};

// --------------------------
// Admin: List all batches
// --------------------------
export const listBatches = async (req, res) => {
    try {
        const { status, course_id } = req.query;
        const instructorId = req.user.user.id;
        const where = {
            is_active: true,
        };
        if (req.user.user.role == "instructor") {
            where.instructor_id = instructorId;
        }

        if (status) where.status = status;
        if (course_id) where.course_id = course_id;

        const batches = await Batch.findAll({
            where,
            include: [
                { model: User, as: 'instructor', attributes: ['id', 'name', 'email'] },
                { model: User, as: 'createdBy', attributes: ['id', 'name', 'email'] },
                {
                    model: User,
                    as: 'students',
                    attributes: ['id', 'name', 'email'],
                    through: {
                        attributes: ['enrolled_at'],
                    },
                },
                { model: Course, as: 'course' },
            ],
            order: [['createdAt', 'DESC']],
        });

        await Promise.all(batches.map(updateBatchStatusIfNeeded));

        batchLogger.info(`Batches listed - Count: ${batches.length}, Role: ${req.user.user.role}`);
        res.json({ batches });
    } catch (err) {
        batchLogger.error(`Error in listBatches: ${err.message}`);
        res.status(500).json({ message: err.message });
    }
};


// --------------------------
// Admin/Instructor/Student: Get batch details
// --------------------------
export const getBatchById = async (req, res) => {
    try {
        const batch = await Batch.findByPk(req.params.id, {
            include: [
                { model: User, as: 'instructor', attributes: ['id', 'name', 'email'] },
                { model: Course, as: 'course', attributes: ['id', 'title'] },
                {
                    model: User,
                    as: 'students',
                    attributes: ['id', 'name', 'email'],
                    through: { attributes: ['enrolled_at'] }
                },
            ],
        });

        if (!batch) {
            batchLogger.warn(`Get Batch - Batch not found: ${req.params.id}`);
            return res.status(404).json({ message: 'Batch not found' });
        }

        batchLogger.info(`Batch retrieved - Batch ID: ${batch.id}`);
        res.json({ batch });
    } catch (err) {
        batchLogger.error(`Error in getBatchById: ${err.message}`);
        res.status(500).json({ message: err.message });
    }
};


// --------------------------
// Admin: Deactivate batch
// --------------------------
export const deactivateBatch = async (req, res) => {
    try {
        const batch = await Batch.findByPk(req.params.id);
        if (!batch) {
            batchLogger.warn(`Deactivate Batch - Batch not found: ${req.params.id}`);
            return res.status(404).json({ message: 'Batch not found' });
        }

        await batch.update({ is_active: false, status: 'inactive' });

        batchLogger.info(`Batch deactivated - Batch ID: ${batch.id}`);
        res.json({ message: 'Batch deactivated successfully' });
    } catch (err) {
        batchLogger.error(`Error in deactivateBatch: ${err.message}`);
        res.status(500).json({ message: err.message });
    }
};

// --------------------------
// Admin: Assign Instructor
// --------------------------
export const assignInstructor = async (req, res) => {
    try {
        const { instructor_id } = req.body;
        const batch = await Batch.findByPk(req.params.id);
        if (!batch) {
            batchLogger.warn(`Assign Instructor - Batch not found: ${req.params.id}`);
            return res.status(404).json({ message: 'Batch not found' });
        }

        await batch.update({ instructor_id });
        await notifyInstructor(batch, instructor_id);

        batchLogger.info(`Instructor assigned - Batch ID: ${batch.id}, Instructor ID: ${instructor_id}`);
        res.json({ message: 'Instructor assigned successfully' });
    } catch (err) {
        batchLogger.error(`Error in assignInstructor: ${err.message}`);
        res.status(500).json({ message: err.message });
    }
};

// --------------------------
// Admin: Enroll Student(s)
// --------------------------
export const enrollStudents = async (req, res) => {
    try {
        const { studentIds } = req.body; // array of student IDs
        if (!studentIds || !studentIds.length) {
            batchLogger.warn('Enroll Students - No students provided');
            return res.status(400).json({ message: 'No students provided' });
        }

        const enrollments = studentIds.map((id) => ({ batch_id: req.params.id, student_id: id }));
        await BatchStudent.bulkCreate(enrollments, { ignoreDuplicates: true });

        // Trigger welcome email for each student
        for (let studentId of studentIds) {
            await sendWelcomeEmail(studentId, req.params.id);
        }

        batchLogger.info(`Students enrolled - Batch ID: ${req.params.id}, Count: ${studentIds.length}`);
        res.json({ message: `${studentIds.length} students enrolled successfully` });
    } catch (err) {
        batchLogger.error(`Error in enrollStudents: ${err.message}`);
        res.status(500).json({ message: err.message });
    }
};

// --------------------------
// Instructor: Get their batches
// --------------------------
export const getInstructorBatches = async (req, res) => {
    try {
        const batches = await Batch.findAll({
            where: { instructor_id: req.user.user.id, status: { [Op.not]: 'completed' }, is_active: true },
        });
        batchLogger.info(`Instructor batches retrieved - Instructor ID: ${req.user.user.id}, Count: ${batches.length}`);
        res.json({ batches });
    } catch (err) {
        batchLogger.error(`Error in getInstructorBatches: ${err.message}`);
        res.status(500).json({ message: err.message });
    }
};

// --------------------------
// Student: Get their batches
// --------------------------
export const getStudentBatches = async (req, res) => {
    try {
        const batches = await Batch.findAll({
            where: {
                status: { [Op.not]: 'completed' },
            },
            include: [
                {
                    model: User,
                    as: 'students',
                    where: { id: req.user.user.id },
                    attributes: ['id', 'name', 'email'],
                    through: {
                        attributes: ['enrolled_at'],
                    },
                },
            ],
        });

        batchLogger.info(
            `Student batches retrieved - Student ID: ${req.user.user.id}, Count: ${batches.length}`
        );

        res.json({ batches });
    } catch (err) {
        batchLogger.error(`Error in getStudentBatches: ${err.message}`);
        res.status(500).json({ message: err.message });
    }
};
// --------------------------
// Admin: Get all instructors
// --------------------------
export const getAllInstructors = async (req, res) => {
    try {
        const instructors = await User.findAll({
            where: { role: 'instructor', is_active: true },
            attributes: ['id', 'name', 'email'],
            order: [['name', 'ASC']],
        });

        batchLogger.info(`All instructors retrieved - Count: ${instructors.length}`);
        res.json({ instructors });
    } catch (err) {
        batchLogger.error(`Error in getAllInstructors: ${err.message}`);
        res.status(500).json({ message: err.message });
    }
};

// --------------------------
// Admin: Get all students
// --------------------------
export const getAllStudents = async (req, res) => {
    try {
        const students = await User.findAll({
            where: { role: 'student', is_active: true },
            attributes: ['id', 'name', 'email'],
            order: [['name', 'ASC']],
        });

        batchLogger.info(`All students retrieved - Count: ${students.length}`);
        res.json({ students });
    } catch (err) {
        batchLogger.error(`Error in getAllStudents: ${err.message}`);
        res.status(500).json({ message: err.message });
    }
};
