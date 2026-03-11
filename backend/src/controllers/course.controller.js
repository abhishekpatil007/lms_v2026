import db from '../models/index.js';
import courseLogger from '../utils/logger/individualLogger/courseLogger.js';
const { Course, Batch, User } = db;

// Create a course
export const createCourse = async (req, res) => {
    try {
        const { title, description, category, duration, level } = req.body;
        if (!title) {
            courseLogger.warn('Create Course - Title is required');
            return res.status(400).json({ message: 'Title is required' });
        }

        const course = await Course.create({ 
            title, 
            description, 
            category, 
            duration, 
            level, 
            created_by : req.user.user.id 
        });
        courseLogger.info(`Course created successfully - Course ID: ${course.id}, Title: ${title}`);
        res.status(201).json({ message: 'Course created', course });
    } catch (err) {
        courseLogger.error(`Error in createCourse: ${err.message}`);
        res.status(500).json({ message: err.message });
    }
};

// Update a course
export const updateCourse = async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id);
        if (!course) {
            courseLogger.warn(`Update Course - Course not found: ${req.params.id}`);
            return res.status(404).json({ message: 'Course not found' });
        }

        await course.update(req.body);
        courseLogger.info(`Course updated successfully - Course ID: ${course.id}`);
        res.json({ message: 'Course updated', course });
    } catch (err) {
        courseLogger.error(`Error in updateCourse: ${err.message}`);
        res.status(500).json({ message: err.message });
    }
};

// List courses
export const listCourses = async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        const { count, rows } = await Course.findAndCountAll({
            include: [
                { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
                { model: Batch, as: 'batches' },
            ],
            limit: parseInt(limit),
            offset: parseInt(offset),
            order: [['createdAt', 'DESC']]
        });

        courseLogger.info(`Courses listed successfully - Count: ${rows.length}`);
        res.json({ 
            courses: rows,
            total: count,
            totalPages: Math.ceil(count / limit),
            currentPage: parseInt(page)
        });
    } catch (err) {
        courseLogger.error(`Error in listCourses: ${err.message}`);
        res.status(500).json({ message: err.message });
    }
};

// Get course by ID
export const getCourseById = async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id, {
            include: [{
                model: Batch,
                as: 'batches'
            }]
        });
        if (!course) {
            courseLogger.warn(`Get Course - Course not found: ${req.params.id}`);
            return res.status(404).json({ message: 'Course not found' });
        }
        courseLogger.info(`Course retrieved - Course ID: ${course.id}`);
        res.json({ course });
    } catch (err) {
        courseLogger.error(`Error in getCourseById: ${err.message}`);
        res.status(500).json({ message: err.message });
    }
};

// Deactivate a course
export const deactivateCourse = async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id);
        if (!course) {
            courseLogger.warn(`Deactivate Course - Course not found: ${req.params.id}`);
            return res.status(404).json({ message: 'Course not found' });
        }

        await course.update({ status: 'inactive' });
        courseLogger.info(`Course deactivated - Course ID: ${course.id}`);
        res.json({ message: 'Course deactivated' });
    } catch (err) {
        courseLogger.error(`Error in deactivateCourse: ${err.message}`);
        res.status(500).json({ message: err.message });
    }
};
