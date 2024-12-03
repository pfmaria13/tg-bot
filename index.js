const TelegramBot = require('node-telegram-bot-api');
const token = '7683360802:AAEnz8xS-9FcG3PAK1IhDnr9o4McLo7WQYc';
const bot = new TelegramBot(token, {polling: true});

const userSessions = {};


bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === '/start') {
        await sendMainMenu(chatId, true);
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
        await bot.sendMessage(chatId,  "Мы психологи <a href='https://www.ukno.ru/'>Уральского клуба нового образования.</a> Вместе ездим проводить тренинговые программы для подростков в разные города Урала, выезжаем на проектные смены <a href='https://ukno.ru/project/tehnolider_camp/'>ТехноЛидер,</a> ведем подростковый клуб, проводим тренинги, консультируем подростков и родителей. \n" +
            "Психологическое направление в УКНО имеет большую историю и опыт (более 20 лет) по работе с подростками и молодежью. Мы поддерживаем эти знания, передавая опыт в процессе обучения, и адаптируем их под запросы и сложности современного мира. \n" +
            "Миссия <a href='https://t.me/nasvyazi_ukno'>сообщества \"На связи\"</a> — это создание безопасного, принимающего пространства, где каждый может познакомиться с собой и окружающими, проживать свои чувства, личностно развиваться и находить опору в себе. \n" +
            "• клуб для подростков \n" +
            "• тренинги/интенсивны для подростков и родителей \n" +
            "• выездные программы \n" +
            "• обучение специалистов \n" +
            "• работа с организациями \n" +
            "\n", { parse_mode: 'HTML' });
    } else if (text === "Записаться в клуб") {
        userSessions[chatId] = { step: 1, formData: {} };
        await bot.sendMessage(chatId, "Клуб сочетает в себе психологические тренинговые упражнения, которые направлены как на отработку и закрепление практических навыков, так и на знакомство с собой. С другой стороны здесь можно почувствовать созидательную атмосферу, где ребята могут пообщаться друг с другом и поиграть в настолки.\n\nКакой адрес?", {
            reply_markup: {
                keyboard: [
                    [{ text: "пр. Космонавтов, 52А (Уралмаш)" }, { text: "ул. Лучистая, 8 (Солнечный)" }],
                    [{ text: "Назад" }]
                ],
                resize_keyboard: true
            }
        });
    } else if (userSessions[chatId]) {
        const session = userSessions[chatId];

        if (text === "Назад") {
            if (session.step === 1) {
                delete userSessions[chatId];
                await sendMainMenu(chatId);
            } else {
                session.step = Math.max(1, session.step - 1);
                await sendPreviousStep(chatId, session);
            }
        } else {
            await handleStep(chatId, text, session);
        }
    }
});

async function sendMainMenu(chatId, withMessage) {
    const options = {
        reply_markup: {
            keyboard: [
                [{text: "Записаться в клуб"}, {text: "Вопросы"}],
                [{text: "Cвязаться с нами"} ,{text: "Подробнее о сообществе"}],
                [{text: "Записаться на консультацию к психологу"}]
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
}

async function handleStep(chatId, text, session) {
    switch (session.step) {
        case 1:
            session.formData.address = text;
            session.step++;
            await bot.sendMessage(chatId, "Когда хотели бы прийти?", {
                reply_markup: {
                    keyboard: [
                        [{ text: "В ближайшее воскресенье" }, { text: "В другой раз, но хотели бы записаться" }],
                        [{ text: "Назад" }]
                    ],
                    resize_keyboard: true
                }
            });
            break;
        case 2:
            session.formData.date = text;
            session.step++;
            await bot.sendMessage(chatId, "Как Вас зовут?", {
                reply_markup: { remove_keyboard: true }
            });
            break;
        case 3:
            session.formData.parentName = text;
            session.step++;
            await bot.sendMessage(chatId, "Как зовут ребенка, которого хотите записать на клуб?", {
                reply_markup: { remove_keyboard: true }
            });
            break;
        case 4:
            session.formData.childName = text;
            session.step++;
            await bot.sendMessage(chatId, "Пол ребенка?", {
                reply_markup: {
                    keyboard: [
                        [{ text: "Мужской"}, { text: "Женский" }],
                        [{ text: "Назад" }]
                    ],
                    resize_keyboard: true
                }
            });
            break;
        case 5:
            session.formData.gender = text;
            session.step++;
            await bot.sendMessage(chatId, "Возраст ребенка?", {
                reply_markup: {
                    keyboard: [
                        [{ text: "12" }, { text: "13" }, { text: "14" }],
                        [{ text: "15" }, { text: "16" }, { text: "17" }],
                        [{ text: "Назад" }]
                    ],
                    resize_keyboard: true
                }
            });
            break;
        case 6:
            session.formData.age = text;
            session.step++;
            await bot.sendMessage(chatId, "Какой запрос на клуб?", {
                reply_markup: { remove_keyboard: true }
            });
            break;
        case 7:
            session.formData.request = text;
            session.step++;
            await bot.sendMessage(chatId, "Оставьте Ваш номер телефона , чтобы мы могли с Вами связаться:", {
                reply_markup: {
                    keyboard: [[{ text: "Назад" }]],
                    resize_keyboard: true
                }
            });
            break;
        case 8:
            if (validatePhoneNumber(text)) {
                session.formData.phone = formatPhoneNumber(text);
                session.step++;
                await bot.sendMessage(chatId, "Согласие на обработку персональных данных. Подтвердите, пожалуйста:", {
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "✅", callback_data: "agree" }]
                        ]
                    }
                });
            } else {
                await bot.sendMessage(chatId, "Номер телефона введен неправильно. Введите номер телефона повторно. ")
            }
            break;
        default:
            break;
    }
}

async function sendPreviousStep(chatId, session) {
    switch (session.step) {
        case 1:
            await bot.sendMessage(chatId, "Какой адрес?", {
                reply_markup: {
                    keyboard: [
                        [{ text: "пр. Космонавтов, 52А (Уралмаш)" }, { text: "ул. Лучистая, 8 (Солнечный)" }],
                        [{ text: "Назад" }]
                    ],
                    resize_keyboard: true
                }
            });
            break;
        case 2:
            await bot.sendMessage(chatId, "Когда хотели бы прийти?", {
                reply_markup: {
                    keyboard: [
                        [{ text: "В ближайшее воскресенье" }, { text: "В другой раз, но хотели бы записаться" }],
                        [{ text: "Назад" }]
                    ],
                    resize_keyboard: true
                }
            });
            break;
        case 3:
            await bot.sendMessage(chatId, "Как Вас зовут?", {
                reply_markup: { remove_keyboard: true }
            });
            break;
        case 4:
            await bot.sendMessage(chatId, "Как зовут ребенка, которого хотите записать на клуб?", {
                reply_markup: { remove_keyboard: true }
            });
            break;
        case 5:
            await bot.sendMessage(chatId, "Пол ребенка?", {
                reply_markup: {
                    keyboard: [
                        [{ text: "Мужской"}, { text: "Женский" }],
                        [{ text: "Назад" }]
                    ],
                    resize_keyboard: true
                }
            });
            break;
        case 6:
            await bot.sendMessage(chatId, "Возраст ребенка?", {
                reply_markup: {
                    keyboard: [
                        [{ text: "12" }, { text: "13" }, { text: "14" }],
                        [{ text: "15" }, { text: "16" }, { text: "17" }],
                        [{ text: "Назад" }]
                    ],
                    resize_keyboard: true
                }
            });
            break;
        case 7:
            await bot.sendMessage(chatId, "Какой запрос на клуб?", {
                reply_markup: { remove_keyboard: true }
            });
            break;
        case 8:
            await bot.sendMessage(chatId, "Оставьте Ваш номер телефона , чтобы мы могли с Вами связаться:", {
                reply_markup: {
                    keyboard: [[{ text: "Назад" }]],
                    resize_keyboard: true
                }
            });
            break;
        default:
            break;
    }
}

function validatePhoneNumber(phone) {
    return (/^\+7\d{10}$/).test(phone) || (/^8\d{10}$/).test(phone);
}

function formatPhoneNumber(phone) {
    if (phone.startsWith("8")) {
        return "+7" + phone.slice(1);
    }
    return phone;
}

// Обработка нажатий на инлайн-кнопки
bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;

    if (data === "duration") {
        await bot.sendMessage(chatId, "Сколько длится занятие в клубе?\n\n3 часа! В течении этого времени");
    } else if (data === "cost") {
        await bot.sendMessage(chatId, "Стоимость клуба:\n\nРазовое посещение – 1800 руб\n" +
            "Абонемент на 4 занятия – 6000 руб");
    } else if (data === "who_needs") {
        await bot.sendMessage(chatId, "Кому нужен клуб?\n\n...");
    } else if (data === "agree" && userSessions[chatId]) {
        const session = userSessions[chatId];
        session.formData.consent = true;

        saveToCRM(session.formData)

        await bot.sendMessage(chatId, "Спасибо, что записались к нам! В ближайшее время с Вами свяжутся для подтверждения записи.");
        delete userSessions[chatId];
        await sendMainMenu(chatId);
    }

    // Удаляем отметку "typing..." у сообщения с инлайн-кнопками
    await bot.answerCallbackQuery(query.id);
});

function saveToCRM(formData) {
    console.log("Сохраненные данные:", formData)
}