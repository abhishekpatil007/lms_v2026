import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const User = sequelize.define('User', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password_hash: { type: DataTypes.STRING, allowNull: false },
    role: {
        type: DataTypes.ENUM('student', 'instructor', 'admin'),
        allowNull: false,
        defaultValue: 'student',
    },
    preferred_language: { type: DataTypes.STRING(10), allowNull: false, defaultValue: 'en' },
    is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
    reset_token: { type: DataTypes.STRING, allowNull: true },
    reset_token_expiry: { type: DataTypes.DATE, allowNull: true },
}, {
    tableName: 'users',
    underscored: true,
    timestamps: true,
});

User.associate = (models) => {

    User.hasMany(models.Batch, {
        foreignKey: 'instructor_id',
        as: 'instructedBatches',
    });

    User.hasMany(models.Batch, {
        foreignKey: 'created_by',
        as: 'createdBatches',
    });

    User.hasMany(models.Course, {
        foreignKey: 'created_by',
        as: 'createCourse',
    });

    User.belongsToMany(models.Batch, {
        through: models.BatchStudent,
        foreignKey: 'student_id',
        otherKey: 'batch_id',
        as: 'enrolledBatches',
    });
};

export default User;
