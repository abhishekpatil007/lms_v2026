import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const Question = sequelize.define('Question', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    block_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },

    content: { type: DataTypes.TEXT, allowNull: false }, // HTML or Markdown supported
    type: {
        type: DataTypes.ENUM('MCQ', 'SHORT_ANSWER', 'FILE_UPLOAD'),
        allowNull: false
    },

    marks: { type: DataTypes.INTEGER, defaultValue: 1 },
    negative_marks: { type: DataTypes.FLOAT, defaultValue: 0 },

    reference_media_url: { type: DataTypes.STRING, allowNull: true }, // Optional image/pdf for the question

    // For Short Answer / File Upload, we might store model answer or rubrics here if needed
    model_answer: { type: DataTypes.TEXT, allowNull: true },

    order_index: { type: DataTypes.INTEGER, defaultValue: 0 },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true }
}, {
    tableName: 'questions',
    underscored: true,
    timestamps: true,
    indexes: [
        { fields: ['block_id'] }
    ]
});

Question.associate = (models) => {
    Question.belongsTo(models.Block, { foreignKey: 'block_id', as: 'block' });
    Question.hasMany(models.Option, { foreignKey: 'question_id', as: 'options', onDelete: 'CASCADE' });
    Question.hasMany(models.AttemptAnswer, { foreignKey: 'question_id', as: 'answers' });
};

export default Question;
