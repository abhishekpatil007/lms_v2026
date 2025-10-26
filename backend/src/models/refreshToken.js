import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';
import User from './user.js';

const RefreshToken = sequelize.define('RefreshToken', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    user_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    token_hash: { type: DataTypes.STRING, allowNull: false },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    revoked: { type: DataTypes.BOOLEAN, defaultValue: false }
}, { tableName: 'refresh_tokens', underscored: true, timestamps: true });

RefreshToken.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
export default RefreshToken;
