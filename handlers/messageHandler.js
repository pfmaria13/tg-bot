const { userSessions } = require('../utils/sessionManager');
const { sendMainMenu } = require('../utils/menu');
const { addUserToDatabase } = require('../utils/database');
const { handleStep, sendPreviousStep } = require('../handlers/formHandler');
const { showActiveRecords, showPastRecords } = require('../utils/records');
const { loadQuestions } = require('../utils/questions');
const fs = require('fs');
const { adminsFilePath } = require('../config');
const { sendAdminPanel } = require('../utils/admin');

module.exports.handleMessage = async (bot, msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === '/start') {
        addUserToDatabase(chatId);
        try {
            await sendMainMenu(bot, chatId, true);
        } catch (err) {
            if (err.response?.body?.error_code === 403) {
                console.log(`Пользователь ${chatId} заблокировал бота.`);
            } else {
                console.log(`Ошибка при отправке сообщения пользователю ${chatId}:`, err);
            }
        }
    } else if (text === "Вопросы") {
        const questions = loadQuestions();
        const buttons = questions.map((q, index) => [{ text: q.question, callback_data: `show_answer_${index}` }]);

        await bot.sendMessage(chatId, "Выберите вопрос, чтобы узнать подробнее:", {
            reply_markup: { inline_keyboard: buttons }
        });
    }  else if (text === 'Cвязаться с нами') {
        await bot.sendMessage(chatId,  "Связаться и узнать ответы на интересующие вопросы можно через Полину\n" +
            "тг: @polinakuzminyh\n" +
            "телефон: +79122571526");
    }  else if (text === 'Подробнее о сообществе') {
        await bot.sendMessage(chatId,  "Мы психологи <a href='https://www.ukno.ru/'>Уральского клуба нового образования.</a> Вместе ездим проводить тренинговые программы для подростков в разные города Урала, выезжаем на проектные смены <a href='https://ukno.ru/project/tehnolider_camp/'>ТехноЛидер,</a> ведем подростковый клуб, проводим тренинги, консультируем подростков и родителей. \n" +
            "Психологическое направление в УКНО имеет большую историю и опыт (более 20 лет) по работе с подростками и молодежью. Мы поддерживаем эти знания, передавая опыт в процессе обучения, и адаптируем их под запросы и сложности современного мира. \n" +
            "Миссия <a href='https://t.me/nasvyazi_ukno'>сообщества \"На связи\"</a> — это создание безопасного, принимающего пространства, где каждый может познакомиться с собой и окружающими, проживать свои чувства, личностно развиваться и находить опору в себе. \n" +
            "• клуб для подростков \n" +
            "• тренинги/интенсивны для подростков и родителей \n" +
            "• выездные программы \n" +
            "• обучение специалистов \n" +
            "• работа с организациями \n" +
            "\n", { parse_mode: 'HTML' } );
    } else if (text === "Записаться в клуб") {
        userSessions[chatId] = {step: 1, formData: {}};
        await bot.sendMessage(chatId, "Клуб сочетает в себе психологические тренинговые упражнения, которые направлены как на отработку и закрепление практических навыков, так и на знакомство с собой. С другой стороны здесь можно почувствовать созидательную атмосферу, где ребята могут пообщаться друг с другом и поиграть в настолки.\n\nКакой адрес?", {
            reply_markup: {
                keyboard: [
                    [{text: "пр. Космонавтов, 52А (Уралмаш)"}],
                    [{text: "Назад"}]
                ],
                resize_keyboard: true
            }
        });
    } else if (text === "Мои записи") {
        await bot.sendMessage(chatId, "Выберите категорию записей:", {
            reply_markup: {
                keyboard: [
                    [{text: "Прошедшие записи"}, {text: "Активные записи"}],
                    [{text: "Назад"}]
                ],
                resize_keyboard: true
            }
        });
    } else if (text === "Записаться на консультацию к психологу") {
        await bot.sendMessage(chatId, "Полина Кузьминых\nтг: @polinakuzminyh\nтелефон: +79122571526\n\nИрина Васеха\nтг: @irinalino");
    } else if (userSessions[chatId]) {
        const session = userSessions[chatId];

        if (text === "Назад") {
            if (session.step === 1) {
                delete userSessions[chatId];
                await sendMainMenu(bot, chatId);
            } else {
                session.step = Math.max(1, session.step - 1);
                await sendPreviousStep(bot, chatId, session);
            }
        } else {
            await handleStep(bot, chatId, text, session);
        }
    } else if (text === '/admin') {
        let admins = [];

        if (fs.existsSync(adminsFilePath)) {
            admins = JSON.parse(fs.readFileSync(adminsFilePath, 'utf8'));
        }

        if (admins.includes(chatId.toString())) {
            await sendAdminPanel(bot, chatId);
        } else {
            await bot.sendMessage(chatId, 'У вас нет доступа к админ-панели.');
        }
    } else if (text === "Прошедшие записи") {
        await showPastRecords(bot, chatId);
    } else if (text === "Активные записи") {
        await showActiveRecords(bot, chatId);
    } else if (text === "Назад") {
        await sendMainMenu(bot, chatId);
    }
};