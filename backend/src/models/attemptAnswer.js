import { DataTypes } from 'sequelize';
import { sequelize } from '../config/db.js';

const AttemptAnswer = sequelize.define('AttemptAnswer', {
    id: { type: DataTypes.BIGINT.UNSIGNED, primaryKey: true, autoIncrement: true },
    attempt_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },
    question_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: false },

    // For MCQ
    selected_option_id: { type: DataTypes.BIGINT.UNSIGNED, allowNull: true },

    // For Short Answer
    text_answer: { type: DataTypes.TEXT, allowNull: true },

    // For File Upload (JSON array of URLs for multiple files)
    file_url: { type: DataTypes.TEXT, allowNull: true },

    marks_awarded: { type: DataTypes.FLOAT, defaultValue: 0 },
    is_evaluated: { type: DataTypes.BOOLEAN, defaultValue: false },

    evaluator_comment: { type: DataTypes.TEXT, allowNull: true }
}, {
    tableName: 'attempt_answers',
    underscored: true,
    timestamps: true,
    indexes: [
        { fields: ['attempt_id'] },
        { fields: ['question_id'] }
    ]
});

AttemptAnswer.associate = (models) => {
    AttemptAnswer.belongsTo(models.Attempt, { foreignKey: 'attempt_id', as: 'attempt' });
    AttemptAnswer.belongsTo(models.Question, { foreignKey: 'question_id', as: 'question' });
    AttemptAnswer.belongsTo(models.Option, { foreignKey: 'selected_option_id', as: 'selectedOption' });
};

export default AttemptAnswer;
