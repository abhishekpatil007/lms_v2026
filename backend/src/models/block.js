import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Block = sequelize.define('Block', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    test_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: false }, // e.g., "Physics - Section A"
    order_index: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },

    duration_minutes: { type: DataTypes.INTEGER, allowNull: false }, // Time limit for this block

    total_questions: { type: DataTypes.INTEGER, defaultValue: 0 },
    total_marks: { type: DataTypes.INTEGER, defaultValue: 0 },

    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
    tableName: 'blocks',
    underscored: true,
    timestamps: true,
    indexes: [
        { fields: ['test_id'] }
    ]
});

Block.associate = (models) => {
    Block.belongsTo(models.Test, { foreignKey: 'test_id', as: 'test' });
    Block.hasMany(models.Question, { foreignKey: 'block_id', as: 'questions', onDelete: 'CASCADE' });
    Block.hasMany(models.AttemptBlock, { foreignKey: 'block_id', as: 'attemptBlocks' });
};

export default Block;
