// src/controllers/batch.controller.js
import { Op } from 'sequelize';
import db from '../models/index.js';
const { Course, Batch, User, BatchStudent, Topic, Video, Document, LiveClass, Test } = db;
import { sendWelcomeEmail, notifyInstructor } from '../services/batchEmail.service.js';
import batchLogger from '../utils/logger/individualLogger/batchLogger.js';
import XLSX from 'xlsx';
import fs from 'fs-extra';




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
        let { status, course_id, search, page = 1, limit = 10 } = req.query;
        page = parseInt(page, 10) || 1;
        limit = parseInt(limit, 10) || 10;
        const offset = (page - 1) * limit;

        const instructorId = req.user.user.id;
        const where = {
            is_active: true,
        };
        if (req.user.user.role == "instructor") {
            where.instructor_id = instructorId;
        }

        if (status) where.status = status;
        if (course_id) where.course_id = course_id;
        if (search) {
            where.batch_name = { [Op.like]: `%${search}%` };
        }

        const { count, rows: batches } = await Batch.findAndCountAll({
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
            limit,
            offset,
            distinct: true, // required to get accurate counts when including many-to-many models
        });

        batchLogger.info(`Batches listed - Page: ${page}, Limit: ${limit}, Count: ${count}, Role: ${req.user.user.role}`);
        res.json({ 
            batches,
            total: count,
            page,
            limit,
            totalPages: Math.ceil(count / limit)
         });
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

        // Fetch counts for other associations for the overview summary
        const [studentCount, topicCount, videoCount, documentCount, liveClassCount, testCount] = await Promise.all([
            batch.countStudents(),
            Topic.count({ where: { batch_id: batch.id, is_active: true } }),
            Video.count({
                where: { is_active: true },
                include: [{
                    model: Batch,
                    as: 'batches',
                    where: { id: batch.id },
                    required: true
                }]
            }),
            Document.count({
                where: { is_active: true },
                include: [{
                    model: Batch,
                    as: 'batches',
                    where: { id: batch.id },
                    required: true
                }]
            }),
            LiveClass.count({ where: { batch_id: batch.id } }),
            Test.count({ where: { batch_id: batch.id, is_active: true } })
        ]);

        batchLogger.info(`Batch retrieved - Batch ID: ${batch.id}`);
        res.json({ 
            batch,
            counts: {
                students: studentCount,
                topics: topicCount,
                videos: videoCount,
                documents: documentCount,
                liveClasses: liveClassCount,
                tests: testCount
            }
        });
    } catch (err) {
        batchLogger.error(`Error in getBatchById: ${err.message}`);
        res.status(500).json({ message: err.message });
    }
};


// --------------------------
// Admin/Instructor: Get paginated batch students
// --------------------------
export const getBatchStudents = async (req, res) => {
    try {
        const batchId = req.params.id;
        const { page = 1, limit = 10, search = '' } = req.query;
        const offset = (page - 1) * limit;

        const batch = await Batch.findByPk(batchId);
        if (!batch) {
            return res.status(404).json({ message: 'Batch not found' });
        }

        const role = req.user?.role || req.user?.user?.role;
        const userId = req.user?.id || req.user?.user?.id;
        
        // Instructor authorization check
        if (role === 'instructor' && batch.instructor_id !== userId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Build search filter for User inclusions
        const userFilter = search ? {
            [Op.or]: [
                { name: { [Op.like]: `%${search}%` } },
                { email: { [Op.like]: `%${search}%` } }
            ]
        } : {};

        const { count, rows } = await BatchStudent.findAndCountAll({
            where: { batch_id: batchId },
            include: [{
                model: User,
                as: 'student',
                attributes: ['id', 'name', 'email', 'is_active'],
                where: userFilter, // Apply search filter to the included model
            }],
            limit: parseInt(limit),
            offset: parseInt(offset),
        });

        // Extract student objects from the mapping table
        const students = rows.map(row => row.student);

        // Also get total active vs inactive count if needed
        const activeCount = await BatchStudent.count({
            where: { batch_id: batchId },
            include: [{ model: User, as: 'student', where: { is_active: true } }]
        });

        batchLogger.info(`Paginated students fetched for Batch: ${batchId} - Count: ${students.length}`);
        
        return res.json({
            students,
            total: count,
            activeCount: activeCount,
            inactiveCount: count - activeCount,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page)
        });
    } catch (err) {
        batchLogger.error(`Error in getBatchStudents: ${err.message}`);
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

        // Trigger welcome emails in parallel
        await Promise.all(studentIds.map(studentId => sendWelcomeEmail(studentId, req.params.id)));

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
            where: { instructor_id: req.user.user.id, status: 'ongoing', is_active: true },
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
                status: 'ongoing',
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
// Admin/Instructor: Export Students to Excel
// --------------------------
export const exportStudentsToExcel = async (req, res) => {
    try {
        const students = await User.findAll({
            where: { role: 'student', is_active: true },
            attributes: ['id', 'name', 'email']
        });

        const studentData = students.map(s => ({
            ID: s.id,
            Name: s.name,
            Email: s.email
        }));

        const instructionData = [
            { Instructions: '1. This sheet contains a list of all active students.' },
            { Instructions: '2. To enroll students into the batch, keep only the rows of students you want to enroll.' },
            { Instructions: '3. Do not modify the Email column as it is used to identify students.' },
            { Instructions: '4. Save this file and upload it back in the "Enroll Students" modal.' },
            { Instructions: '5. Students who are already enrolled in this batch will be ignored (no duplicates created).' }
        ];

        const wb = XLSX.utils.book_new();
        const wsStudents = XLSX.utils.json_to_sheet(studentData);
        const wsInstructions = XLSX.utils.json_to_sheet(instructionData);

        XLSX.utils.book_append_sheet(wb, wsStudents, 'Students');
        XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

        const fileName = `Students_Export_${Date.now()}.xlsx`;
        const filePath = `./uploads/temp/${fileName}`;
        
        await fs.ensureDir('./uploads/temp');
        XLSX.writeFile(wb, filePath);

        res.download(filePath, fileName, async (err) => {
            if (err) {
                batchLogger.error(`Error downloading file: ${err.message}`);
            }
            // Cleanup file after download
            try {
                await fs.unlink(filePath);
            } catch (unlinkErr) {
                batchLogger.warn(`Failed to delete temp file: ${unlinkErr.message}`);
            }
        });

        batchLogger.info(`Students exported to Excel for Batch ID: ${req.params.id}`);
    } catch (err) {
        batchLogger.error(`Error in exportStudentsToExcel: ${err.message}`);
        res.status(500).json({ message: err.message });
    }
};

// --------------------------
// Admin: Bulk Enroll Students via Excel
// --------------------------
export const bulkEnrollStudentsFromExcel = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'Excel file required' });
        }

        const batchId = req.params.id;
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0]; // Assuming first sheet is students
        const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

        if (!data || data.length === 0) {
            return res.status(400).json({ message: 'No student data found in the Excel file' });
        }

        const emails = data.map(row => row.Email || row.email).filter(Boolean);
        
        if (emails.length === 0) {
            return res.status(400).json({ message: 'No valid student emails found in the file' });
        }

        // Find students by email
        const students = await User.findAll({
            where: {
                email: emails,
                role: 'student'
            },
            attributes: ['id', 'email']
        });

        if (students.length === 0) {
            return res.status(400).json({ message: 'No matching students found in the database' });
        }

        const studentIds = students.map(s => s.id);
        const enrollments = studentIds.map(id => ({
            batch_id: batchId,
            student_id: id
        }));

        await BatchStudent.bulkCreate(enrollments, { ignoreDuplicates: true });

        // Trigger welcome emails in parallel (using original service)
        await Promise.all(studentIds.map(studentId => sendWelcomeEmail(studentId, batchId)));

        // Cleanup uploaded file
        await fs.unlink(req.file.path);

        batchLogger.info(`Bulk enrollment successful - Batch ID: ${batchId}, Count: ${studentIds.length}`);
        res.json({ 
            message: `Successfully processed ${studentIds.length} students`,
            count: studentIds.length
        });
    } catch (err) {
        if (req.file) await fs.unlink(req.file.path).catch(() => {});
        batchLogger.error(`Error in bulkEnrollStudentsFromExcel: ${err.message}`);
        res.status(500).json({ message: err.message });
    }
};

// End of batch controller
