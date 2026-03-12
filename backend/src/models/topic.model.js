import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Topic = sequelize.define('Topic', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    batch_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'name',
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    order_index: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
}, {
    tableName: 'topics',
    underscored: true,
    timestamps: true,
});

Topic.associate = (models) => {
    Topic.belongsTo(models.Batch, { foreignKey: 'batch_id', as: 'batch' });
    Topic.hasMany(models.Video, { foreignKey: 'topic_id', as: 'videos' });
    Topic.hasMany(models.Document, { foreignKey: 'topic_id', as: 'documents' });
};

export default Topic;
