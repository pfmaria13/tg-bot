const TelegramBot = require('node-telegram-bot-api');

const token = '7683360802:AAEnz8xS-9FcG3PAK1IhDnr9o4McLo7WQYc';

const bot = new TelegramBot(token, {polling: true});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === '/start') {
        await bot.sendMessage(chatId, "Привет! <b>На связи</b> сообщество для подростков и родителей. Командой психологов мы создаем пространство доверия, поддержки, где каждый может познакомиться с собой и окружающими, проживать свои чувства, личностно развиваться и находить опору в себе. )", {
            parse_mode: "HTML",
            reply_markup: {
                keyboard: [
                    [{text: "Записаться в клуб"}, {text: "Вопросы"}],
                    [{text: "Записаться на консультацию к психологу"}, {text: "Cвязаться с нами"}],
                    [{text: "Подробнее о сообществе"}]
                ]
            }
        });
    } else if (text === "Вопросы") {
        await bot.sendMessage(chatId, "Выберите вопрос, чтобы узнать подробнее:", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Сколько длится занятие в клубе?", callback_data: "duration" }],
                    [{ text: "Стоимость клуба", callback_data: "cost" }],
                    [{ text: "Кому нужен клуб?", callback_data: "who_needs" }]
                ]
            }
        });
    }  else if (text === 'Подробнее о сообществе') {
        await bot.sendMessage(chatId, "Мы психологи Уральского клуба нового образования. Вместе ездим проводить тренинговые программы для подростков в разные города Урала, выезжаем на проектные смены ТехноЛидер, ведем подростковый клуб, проводим тренинги, консультируем подростков и родителей. \n" +
            "Психологическое направление в УКНО имеет большую историю и опыт (более 20 лет) по работе с подростками и молодежью. Мы поддерживаем эти знания, передавая опыт в процессе обучения, и адаптируем их под запросы и сложности современного мира. \n" +
            "Миссия сообщества \"На связи\" — это создание безопасного, принимающего пространства, где каждый может познакомиться с собой и окружающими, проживать свои чувства, личностно развиваться и находить опору в себе. \n" +
            "• клуб для подростков \n" +
            "• тренинги/интенсивны для подростков и родителей \n" +
            "• выездные программы \n" +
            "• обучение специалистов \n" +
            "• работа с организациями \n" +
            "\n");
    }
});

// Обработка нажатий на инлайн-кнопки
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data === "duration") {
        await bot.sendMessage(chatId, "3 часа! В течении этого времени");
    } else if (data === "cost") {
        await bot.sendMessage(chatId, "Разовое посещение – 1800 руб\n" +
            "Абонемент на 4 занятия – 6000 руб");
    } else if (data === "who_needs") {
        await bot.sendMessage(chatId, "...");
    }

    // Удаляем отметку "typing..." у сообщения с инлайн-кнопками
    await bot.answerCallbackQuery(query.id);
});
