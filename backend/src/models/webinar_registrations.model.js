// src/models/webinar_registration.model.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const WebinarRegistration = sequelize.define('WebinarRegistration', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    webinar_id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, allowNull: false },
    user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false },
    is_joined: { type: DataTypes.BOOLEAN, defaultValue: false },
}, {
    tableName: 'webinar_registrations',
    underscored: true,
    timestamps: true,
});

WebinarRegistration.associate = (models) => {
    WebinarRegistration.belongsTo(models.Webinar, { foreignKey: 'webinar_id' });
    WebinarRegistration.belongsTo(models.User, { foreignKey: 'user_id' });
};

export default WebinarRegistration;