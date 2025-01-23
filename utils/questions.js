const fs = require('fs');
const { questionsFilePath } = require('../config');

module.exports.loadQuestions = () => {
    if (fs.existsSync(questionsFilePath)) {
        return JSON.parse(fs.readFileSync(questionsFilePath, 'utf8'));
    }
    return [];
};

module.exports.saveQuestions = (questions) => {
    fs.writeFileSync(questionsFilePath, JSON.stringify(questions, null, 2));
};