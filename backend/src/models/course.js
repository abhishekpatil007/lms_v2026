import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Course = sequelize.define('Course', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
    },
    title: {
        type: DataTypes.STRING(255),
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    category: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    duration: {
        type: DataTypes.INTEGER,
    },
    level: {
        type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
        allowNull: false,
        defaultValue: 'beginner',
    },
    status: {
        type: DataTypes.ENUM('active', 'inactive'),
        allowNull: false,
        defaultValue: 'active',
    },
    created_by: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
    },
}, {
    tableName: 'courses',
    underscored: true,
    timestamps: true,
});

Course.associate = (models) => {
    Course.belongsTo(models.User, {
        foreignKey: 'created_by',
        as: 'creator',
    });

    Course.hasMany(models.Batch, {
        foreignKey: 'course_id',
        as: 'batches',
    });
};

export default Course;
