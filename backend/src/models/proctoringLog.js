import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const ProctoringLog = sequelize.define('ProctoringLog', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    attempt_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },

    event_type: {
        type: DataTypes.ENUM('TAB_SWITCH', 'WINDOW_BLUR', 'FULLSCREEN_EXIT', 'DEVICE_CHANGE', 'MULTIPLE_FACES'),
        allowNull: false
    },

    timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    details: { type: DataTypes.TEXT, allowNull: true } // JSON string or text details
}, {
    tableName: 'proctoring_logs',
    underscored: true,
    timestamps: true,
    indexes: [
        { fields: ['attempt_id'] }
    ]
});

ProctoringLog.associate = (models) => {
    ProctoringLog.belongsTo(models.Attempt, { foreignKey: 'attempt_id', as: 'attempt' });
};

export default ProctoringLog;
