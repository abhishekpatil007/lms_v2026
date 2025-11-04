// src/models/batchVideo.model.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const BatchVideo = sequelize.define('BatchVideo', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    batch_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    video_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
}, {
    tableName: 'batch_videos',
    underscored: true,
    timestamps: true,
});

BatchVideo.associate = (models) => {
    // associations are set in Batch and Video models via belongsToMany
};

export default BatchVideo;
