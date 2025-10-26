import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Batch = sequelize.define('Batch', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    course_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
    },
    instructor_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: true,
    },
    created_by: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
    },
    batch_name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    description: DataTypes.TEXT,
    start_date: DataTypes.DATEONLY,
    end_date: DataTypes.DATEONLY,
    status: {
        type: DataTypes.ENUM('draft', 'ongoing', 'completed', 'inactive'),
        defaultValue: 'draft',
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
});

Batch.associate = (models) => {
    Batch.belongsTo(models.Course, { foreignKey: 'course_id', as: 'course' });

    Batch.belongsTo(models.User, { foreignKey: 'instructor_id', as: 'instructor' });

    Batch.belongsTo(models.User, { foreignKey: 'created_by', as: 'createdBy' });

    Batch.belongsToMany(models.User, {
        through: models.BatchStudent,
        foreignKey: 'batch_id',
        otherKey: 'student_id',
        as: 'students',
    });
};

export default Batch;
