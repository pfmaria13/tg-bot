const { bot } = require('../index');

module.exports.sendMainMenu = async (bot, chatId, withMessage) => {
    const options = {
        reply_markup: {
            keyboard: [
                [{ text: "Записаться в клуб" }, { text: "Мои записи" }],
                [{ text: "Cвязаться с нами" }, { text: "Подробнее о сообществе" }, { text: "Вопросы" }],
                [{ text: "Записаться на консультацию к психологу" }]
            ],
            resize_keyboard: true
        }
    };

    if (withMessage) {
        await bot.sendMessage(chatId, "Привет! <b>На связи</b> сообщество для подростков и родителей. Командой психологов мы создаем пространство доверия, поддержки, где каждый может познакомиться с собой и окружающими, проживать свои чувства, личностно развиваться и находить опору в себе.", {
            ...options,
            parse_mode: "HTML"
        });
    } else {
        await bot.sendMessage(chatId, "Чем помочь?", options);
    }
};