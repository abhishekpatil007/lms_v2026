import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const AttemptBlock = sequelize.define('AttemptBlock', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    attempt_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    block_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },

    start_time: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
    end_time: { type: DataTypes.DATE, allowNull: true }, // When block was submitted

    status: {
        type: DataTypes.ENUM('ongoing', 'completed'),
        defaultValue: 'ongoing'
    },

    // Snapshot of time remaining if we implement pause/resume within block (though rules say block timer is server-side continuous)
    // We'll use start_time + block.duration to calculate expiry.

}, {
    tableName: 'attempt_blocks',
    underscored: true,
    timestamps: true,
    indexes: [
        { fields: ['attempt_id'] },
        { fields: ['block_id'] }
    ]
});

AttemptBlock.associate = (models) => {
    AttemptBlock.belongsTo(models.Attempt, { foreignKey: 'attempt_id', as: 'attempt' });
    AttemptBlock.belongsTo(models.Block, { foreignKey: 'block_id', as: 'block' });
};

export default AttemptBlock;
