import db from '../models/index.js';
const { Course, Batch, User } = db;

// Create a course
export const createCourse = async (req, res) => {
    try {
        const { title, description } = req.body;
        if (!title) return res.status(400).json({ message: 'Title is required' });

        const course = await Course.create({ title, description, created_by : req.user.user.id });
        res.status(201).json({ message: 'Course created', course });
    } catch (err) {
        console.error('createCourse', err);
        res.status(500).json({ message: err.message });
    }
};

// Update a course
export const updateCourse = async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        await course.update(req.body);
        res.json({ message: 'Course updated', course });
    } catch (err) {
        console.error('updateCourse', err);
        res.status(500).json({ message: err.message });
    }
};

// List courses
export const listCourses = async (req, res) => {
    try {
        const courses = await Course.findAll({
            include: [
                { model: User, as: 'creator', attributes: ['id', 'name', 'email'] },
                { model: Batch, as: 'batches' },
            ],
            order: [['createdAt', 'DESC']]
        });
        res.json({ courses });
    } catch (err) {
        console.error('listCourses', err);
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
        if (!course) return res.status(404).json({ message: 'Course not found' });
        res.json({ course });
    } catch (err) {
        console.error('getCourseById', err);
        res.status(500).json({ message: err.message });
    }
};

// Deactivate a course
export const deactivateCourse = async (req, res) => {
    try {
        const course = await Course.findByPk(req.params.id);
        if (!course) return res.status(404).json({ message: 'Course not found' });

        await course.update({ status: 'inactive' });
        res.json({ message: 'Course deactivated' });
    } catch (err) {
        console.error('deactivateCourse', err);
        res.status(500).json({ message: err.message });
    }
};
