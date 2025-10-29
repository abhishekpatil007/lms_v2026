import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const LiveClass = sequelize.define('LiveClass', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    batch_id: { type: DataTypes.UUID, allowNull: false },
    instructor_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    topic: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    start_time: { type: DataTypes.DATE, allowNull: false },
    duration: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 60 },
    zoom_meeting_id: { type: DataTypes.STRING, allowNull: true },
    zoom_join_url: { type: DataTypes.TEXT, allowNull: true },
    zoom_start_url: { type: DataTypes.TEXT, allowNull: true },
    status: { 
        type: DataTypes.ENUM('scheduled', 'live', 'completed', 'cancelled'),
        allowNull: false,
        defaultValue: 'scheduled'
    },
    recording_url: { type: DataTypes.TEXT, allowNull: true }
}, {
    tableName: 'live_classes',
    underscored: true,
    timestamps: true,
});

LiveClass.associate = (models) => {
    LiveClass.belongsTo(models.Batch, { foreignKey: 'batch_id', as: 'batch' });
    LiveClass.belongsTo(models.User, { foreignKey: 'instructor_id', as: 'instructor' });
};

export default LiveClass;
