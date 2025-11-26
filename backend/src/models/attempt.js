import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Attempt = sequelize.define('Attempt', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    test_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false }, // Student

    start_time: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    end_time: { type: DataTypes.DATE, allowNull: true }, // When the attempt was submitted/auto-submitted

    status: {
        type: DataTypes.ENUM('ongoing', 'submitted', 'evaluated', 'expired'),
        defaultValue: 'ongoing'
    },

    total_score: { type: DataTypes.FLOAT, defaultValue: 0 },

    device_fingerprint: { type: DataTypes.STRING, allowNull: true },
    ip_address: { type: DataTypes.STRING, allowNull: true },

    is_valid: { type: DataTypes.BOOLEAN, defaultValue: true } // Can be invalidated by proctoring
}, {
    tableName: 'attempts',
    underscored: true,
    timestamps: true,
    indexes: [
        { fields: ['test_id'] },
        { fields: ['user_id'] },
        { fields: ['test_id', 'user_id'] } // For checking max attempts
    ]
});

Attempt.associate = (models) => {
    Attempt.belongsTo(models.Test, { foreignKey: 'test_id', as: 'test' });
    Attempt.belongsTo(models.User, { foreignKey: 'user_id', as: 'student' });
    Attempt.hasMany(models.AttemptBlock, { foreignKey: 'attempt_id', as: 'blocks' });
    Attempt.hasMany(models.AttemptAnswer, { foreignKey: 'attempt_id', as: 'answers' });
    Attempt.hasMany(models.ProctoringLog, { foreignKey: 'attempt_id', as: 'logs' });
};

export default Attempt;
