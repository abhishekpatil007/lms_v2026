import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const DeviceBinding = sequelize.define('DeviceBinding', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },

    device_fingerprint: { type: DataTypes.STRING, allowNull: false },
    user_agent: { type: DataTypes.STRING, allowNull: true },

    last_login: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
    tableName: 'device_bindings',
    underscored: true,
    timestamps: true,
    indexes: [
        { fields: ['user_id'] },
        { fields: ['device_fingerprint'] }
    ]
});

DeviceBinding.associate = (models) => {
    DeviceBinding.belongsTo(models.User, { foreignKey: 'user_id', as: 'user' });
};

export default DeviceBinding;
