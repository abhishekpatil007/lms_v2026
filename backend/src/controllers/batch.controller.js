// src/controllers/batch.controller.js
import { Op } from 'sequelize';;
import db from '../models/index.js';
const { Course, Batch, User, BatchStudent } = db;
import { sendWelcomeEmail, notifyInstructor } from '../services/batchEmail.service.js';

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
            return res.status(400).json({ message: 'Required fields missing' });
        }

        const course = await Course.findByPk(course_id);
        if (!course) {
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

        res.status(201).json({ message: 'Batch created successfully', batch });
    } catch (err) {
        console.error('createBatch', err);
        res.status(500).json({ message: err.message });
    }
};


// --------------------------
// Admin: Update Batch
// --------------------------
export const updateBatch = async (req, res) => {
    try {
        const batch = await Batch.findByPk(req.params.id);
        if (!batch) return res.status(404).json({ message: 'Batch not found' });

        const prevInstructor = batch.instructor_id;

        await batch.update(req.body);

        // Notify new instructor if changed
        if (req.body.instructor_id && req.body.instructor_id !== prevInstructor) {
            await notifyInstructor(batch, req.body.instructor_id);
        }

        res.json({ message: 'Batch updated successfully', batch });
    } catch (err) {
        console.error('updateBatch', err);
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
            instructor_id: instructorId,
        };

        if (status) where.status = status;
        if (course_id) where.course_id = course_id;

        const batches = await Batch.findAll({
            where,
            include: [
                { model: User, as: 'instructor' },
                { model: User, as: 'createdBy' },
                { model: User, as: 'students' },
                { model: Course, as: 'course' },
            ],
            order: [['createdAt', 'DESC']],
        });

        await Promise.all(batches.map(updateBatchStatusIfNeeded));

        res.json({ batches });
    } catch (err) {
        console.error('listBatches', err);
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

        if (!batch) return res.status(404).json({ message: 'Batch not found' });

        res.json({ batch });
    } catch (err) {
        console.error('getBatchById', err);
        res.status(500).json({ message: err.message });
    }
};


// --------------------------
// Admin: Deactivate batch
// --------------------------
export const deactivateBatch = async (req, res) => {
    try {
        const batch = await Batch.findByPk(req.params.id);
        if (!batch) return res.status(404).json({ message: 'Batch not found' });

        await batch.update({ is_active: false, status: 'inactive' });

        res.json({ message: 'Batch deactivated successfully' });
    } catch (err) {
        console.error('deactivateBatch', err);
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
        if (!batch) return res.status(404).json({ message: 'Batch not found' });

        await batch.update({ instructor_id });
        await notifyInstructor(batch, instructor_id);

        res.json({ message: 'Instructor assigned successfully' });
    } catch (err) {
        console.error('assignInstructor', err);
        res.status(500).json({ message: err.message });
    }
};

// --------------------------
// Admin: Enroll Student(s)
// --------------------------
export const enrollStudents = async (req, res) => {
    try {
        const { studentIds } = req.body; // array of student IDs
        if (!studentIds || !studentIds.length)
            return res.status(400).json({ message: 'No students provided' });

        const enrollments = studentIds.map((id) => ({ batch_id: req.params.id, student_id: id }));
        await BatchStudent.bulkCreate(enrollments, { ignoreDuplicates: true });

        // Trigger welcome email for each student
        for (let studentId of studentIds) {
            await sendWelcomeEmail(studentId, req.params.id);
        }

        res.json({ message: `${studentIds.length} students enrolled successfully` });
    } catch (err) {
        console.error('enrollStudents', err);
        res.status(500).json({ message: err.message });
    }
};

// --------------------------
// Instructor: Get their batches
// --------------------------
export const getInstructorBatches = async (req, res) => {
    try {
        const batches = await Batch.findAll({
            where: { instructor_id: req.user.user.id, status: { [Op.not]: 'completed' }, is_active : true },
        });
        res.json({ batches });
    } catch (err) {
        console.error('getInstructorBatches', err);
        res.status(500).json({ message: err.message });
    }
};

// --------------------------
// Student: Get their batches
// --------------------------
export const getStudentBatches = async (req, res) => {
    try {
        const batches = await Batch.findAll({
            include: [
                {
                    model: BatchStudent,
                    as: 'students',
                    where: { student_id: req.user.id },
                },
            ],
            where: { status: { [Op.not]: 'completed' } },
        });
        res.json({ batches });
    } catch (err) {
        console.error('getStudentBatches', err);
        res.status(500).json({ message: err.message });
    }
};
