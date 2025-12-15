import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Option = sequelize.define('Option', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    question_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },

    content: { type: DataTypes.TEXT, allowNull: false },
    media_url: { type: DataTypes.STRING, allowNull: true }, // For Image MCQs
    is_correct: { type: DataTypes.BOOLEAN, defaultValue: false },

    order_index: { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
    tableName: 'options',
    underscored: true,
    timestamps: true,
    indexes: [
        { fields: ['question_id'] }
    ]
});

Option.associate = (models) => {
    Option.belongsTo(models.Question, { foreignKey: 'question_id', as: 'question' });
};

export default Option;
