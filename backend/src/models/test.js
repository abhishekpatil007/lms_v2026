import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Test = sequelize.define('Test', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    batch_id: { type: DataTypes.UUID, allowNull: false }, // References Batch
    created_by: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false }, // References User (Instructor/Admin)

    // Configuration
    start_time: { type: DataTypes.DATE, allowNull: false },
    end_time: { type: DataTypes.DATE, allowNull: false },
    duration_minutes: { type: DataTypes.INTEGER, allowNull: true }, // Optional global duration, though blocks have their own

    // Rules
    max_attempts: { type: DataTypes.INTEGER, defaultValue: 1 },
    shuffle_questions: { type: DataTypes.BOOLEAN, defaultValue: false },
    show_results_immediately: { type: DataTypes.BOOLEAN, defaultValue: false },
    block_navigation_allowed: { type: DataTypes.BOOLEAN, defaultValue: false }, // Can move between blocks? Usually no for block-based

    status: {
        type: DataTypes.ENUM('draft', 'published', 'archived'),
        defaultValue: 'draft'
    },

    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
    tableName: 'tests',
    underscored: true,
    timestamps: true,
    indexes: [
        { fields: ['batch_id'] },
        { fields: ['created_by'] }
    ]
});

Test.associate = (models) => {
    Test.belongsTo(models.Batch, { foreignKey: 'batch_id', as: 'batch' });
    Test.belongsTo(models.User, { foreignKey: 'created_by', as: 'creator' });
    Test.hasMany(models.Block, { foreignKey: 'test_id', as: 'blocks', onDelete: 'CASCADE' });
    Test.hasMany(models.Attempt, { foreignKey: 'test_id', as: 'attempts' });
};

export default Test;
