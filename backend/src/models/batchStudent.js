import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const BatchStudent = sequelize.define('BatchStudent', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    batch_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    student_id: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
    },
    enrolled_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'batch_students',
    timestamps: true,
    indexes: [
        {
            unique: true,
            fields: ['batch_id', 'student_id'],
            name: 'unique_batch_student',
        },
    ],
});

BatchStudent.associate = (models) => {
    BatchStudent.belongsTo(models.Batch, {
        foreignKey: 'batch_id',
        as: 'batch',
    });

    BatchStudent.belongsTo(models.User, {
        foreignKey: 'student_id',
        as: 'student',
    });
};

export default BatchStudent;
