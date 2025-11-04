// src/models/video.model.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Video = sequelize.define('Video', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    uploaded_by: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
    },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    language: { type: DataTypes.STRING(10), allowNull: true },
    mux_upload_id: { type: DataTypes.STRING, allowNull: true },
    mux_asset_id: { type: DataTypes.STRING, allowNull: true },
    mux_playback_id: { type: DataTypes.STRING, allowNull: true },
    upload_status: {
        type: DataTypes.ENUM('pending', 'ready', 'failed', 'cancelled'),
        defaultValue: 'pending',
    },
    visibility: {
        type: DataTypes.ENUM('public', 'batch', 'private'),
        defaultValue: 'batch',
    },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, {
    tableName: 'videos',
    underscored: true,
    timestamps: true,
});

Video.associate = (models) => {
    Video.belongsTo(models.User, { foreignKey: 'uploaded_by', as: 'uploader' });
    Video.belongsToMany(models.Batch, {
        through: models.BatchVideo,
        foreignKey: 'video_id',
        otherKey: 'batch_id',
        as: 'batches',
    });
};

export default Video;
