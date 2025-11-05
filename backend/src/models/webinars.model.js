// src/models/Webinar.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Webinar = sequelize.define('Webinar', {
    id: {         
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true, 
    },
    instructor_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    topic: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    start_time: { type: DataTypes.DATE, allowNull: false },
    duration: { type: DataTypes.INTEGER, defaultValue: 60 },
    zoom_webinar_id: { type: DataTypes.STRING, allowNull: true },
    zoom_join_url: { type: DataTypes.TEXT, allowNull: true },
    zoom_start_url: { type: DataTypes.TEXT, allowNull: true },
    status: {
        type: DataTypes.ENUM('scheduled', 'live', 'completed', 'cancelled'),
        defaultValue: 'scheduled'
    },
    recording_url: { type: DataTypes.TEXT, allowNull: true }
}, {
    tableName: 'webinars',
    underscored: true,
    timestamps: true,
});

Webinar.associate = (models) => {
    Webinar.belongsTo(models.User, { foreignKey: 'instructor_id', as: 'instructor' });
    Webinar.hasMany(models.WebinarRegistration, { foreignKey: 'webinar_id', as: 'webinar_registrations' });
};

export default Webinar;
