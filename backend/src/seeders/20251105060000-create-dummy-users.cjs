'use strict';

const bcrypt = require('bcrypt');

module.exports = {
    async up(queryInterface, Sequelize) {
        const SALT_ROUNDS = 12;
        const users = [];

        // 🔹 Create 5 dummy instructors
        const instructors = [
            { name: 'John Doe', email: 'john.doe@lmsportal.com' },
            { name: 'Jane Smith', email: 'jane.smith@lmsportal.com' },
            { name: 'Michael Brown', email: 'michael.brown@lmsportal.com' },
            { name: 'Emily Davis', email: 'emily.davis@lmsportal.com' },
            { name: 'Robert Wilson', email: 'robert.wilson@lmsportal.com' },
        ];

        for (const instructor of instructors) {
            const hash = await bcrypt.hash('Instructor@123', SALT_ROUNDS);
            users.push({
                name: instructor.name,
                email: instructor.email,
                password_hash: hash,
                role: 'instructor',
                preferred_language: 'en',
                is_active: true,
                created_at: new Date(),
                updated_at: new Date(),
            });
        }

        // 🔹 Create 10 dummy students
        const students = [
            { name: 'Alice Johnson', email: 'alice.johnson@lmsportal.com' },
            { name: 'Bob Martin', email: 'bob.martin@lmsportal.com' },
            { name: 'Charlie Thomas', email: 'charlie.thomas@lmsportal.com' },
            { name: 'Diana Lee', email: 'diana.lee@lmsportal.com' },
            { name: 'Ethan Harris', email: 'ethan.harris@lmsportal.com' },
            { name: 'Fiona White', email: 'fiona.white@lmsportal.com' },
            { name: 'George Clark', email: 'george.clark@lmsportal.com' },
            { name: 'Hannah Lewis', email: 'hannah.lewis@lmsportal.com' },
            { name: 'Ian Walker', email: 'ian.walker@lmsportal.com' },
            { name: 'Julia Young', email: 'julia.young@lmsportal.com' },
        ];

        for (const student of students) {
            const hash = await bcrypt.hash('Student@123', SALT_ROUNDS);
            users.push({
                name: student.name,
                email: student.email,
                password_hash: hash,
                role: 'student',
                preferred_language: 'en',
                is_active: true,
                created_at: new Date(),
                updated_at: new Date(),
            });
        }

        await queryInterface.bulkInsert('users', users);
    },

    async down(queryInterface, Sequelize) {
        await queryInterface.bulkDelete('users', {
            email: [
                'john.doe@lmsportal.com',
                'jane.smith@lmsportal.com',
                'michael.brown@lmsportal.com',
                'emily.davis@lmsportal.com',
                'robert.wilson@lmsportal.com',
                'alice.johnson@lmsportal.com',
                'bob.martin@lmsportal.com',
                'charlie.thomas@lmsportal.com',
                'diana.lee@lmsportal.com',
                'ethan.harris@lmsportal.com',
                'fiona.white@lmsportal.com',
                'george.clark@lmsportal.com',
                'hannah.lewis@lmsportal.com',
                'ian.walker@lmsportal.com',
                'julia.young@lmsportal.com',
            ],
        });
    },
};
