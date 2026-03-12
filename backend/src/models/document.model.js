import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Document = sequelize.define('Document', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    uploaded_by: {
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false, // reference to User
    },
    title: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    file_path: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    file_type: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    language: {
        type: DataTypes.STRING(10),
        allowNull: true,
    },
    topic_id: {
        type: DataTypes.UUID,
        allowNull: true,
    },
    visibility: {
        type: DataTypes.ENUM('public', 'batch', 'private'),
        defaultValue: 'batch',
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
    },
}, {
    tableName: 'documents',
    underscored: true,
    timestamps: true,
});

Document.associate = (models) => {
    Document.belongsTo(models.User, { foreignKey: 'uploaded_by', as: 'uploader' });
    Document.belongsTo(models.Topic, { foreignKey: 'topic_id', as: 'topic' });
    Document.belongsToMany(models.Batch, {
        through: models.BatchDocument,
        foreignKey: 'document_id',
        otherKey: 'batch_id',
        as: 'batches'
    });
};

export default Document;
