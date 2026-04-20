import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const SentInvoiceLog = sequelize.define('SentInvoiceLog', {
    id: {
        type: DataTypes.BIGINT.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    invoice_number: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    type: {
        type: DataTypes.ENUM('partially_paid', 'fully_paid'),
        allowNull: false,
    },
    amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: true,
    },
    sent_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'sent_invoice_logs',
    underscored: true,
    timestamps: false,
});

export default SentInvoiceLog;
