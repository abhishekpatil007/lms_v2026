import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const BatchDocument = sequelize.define('BatchDocument', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
    },
    batch_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    document_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
}, {
    tableName: 'batch_documents',
    underscored: true,
    timestamps: true,
});

BatchDocument.associate = (models) => {
    // Associations set via belongsToMany in Batch and Document models
};

export default BatchDocument;
