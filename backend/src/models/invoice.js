// src/models/invoice.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Invoice = sequelize.define('Invoice', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
    },
    invoice_number: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
    },
    user_id: {
        // student id
        type: DataTypes.BIGINT.UNSIGNED,
        allowNull: false,
    },
    batch_id: {
        type: DataTypes.UUID,
        allowNull: false,
    },
    amount: {
        // the amount input by admin (interpreted according to is_gst_inclusive)
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    gst_rate: {
        type: DataTypes.DECIMAL(5, 2),
        allowNull: false,
        defaultValue: 18.0,
    },
    is_gst_inclusive: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
    },
    gst_amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.0,
    },
    total: {
        // final total (amount if inclusive, or amount + gst if exclusive)
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
    },
    payment_method: {
        type: DataTypes.ENUM('online', 'offline'),
        allowNull: false,
        defaultValue: 'online',
    },
    status: {
        type: DataTypes.ENUM('pending', 'paid', 'cancelled'),
        allowNull: false,
        defaultValue: 'pending',
    },
    payment_id: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    issued_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
    paid_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    notes: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'invoices',
    underscored: true,
    timestamps: true,
});

Invoice.associate = (models) => {
    Invoice.belongsTo(models.User, { foreignKey: 'user_id', as: 'student' });
    Invoice.belongsTo(models.Batch, { foreignKey: 'batch_id', as: 'batch' });

    // keep symmetrical relations (helpful if models are required in different places)
    if (models.User && typeof models.User.hasMany === 'function') {
        models.User.hasMany(Invoice, { foreignKey: 'user_id', as: 'invoices' });
    }
    if (models.Batch && typeof models.Batch.hasMany === 'function') {
        models.Batch.hasMany(Invoice, { foreignKey: 'batch_id', as: 'batchInvoices' });
    }
};

export default Invoice;
