require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const moment = require('moment')
const token = process.env.TOKEN;
const yandexToken = process.env.YANDEX_TOKEN;
const adminId = process.env.ADMIN_ID;
const bot = new TelegramBot(token, {polling: true});
const fs = require('fs');
let formData = [];
const filePath = 'formData.xlsx';
const remotePath = '/Заявки.xlsx';
const schedule = require('node-schedule');

const userSessions = {};

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === '/start') {
        try {
            await sendMainMenu(chatId, true);
        } catch (err) {
            if (err.response?.body?.error_code === 403) {
                console.log(`Пользователь ${chatId} заблокировал бота.`);
            } else {
                console.log(`Ошибка при отправке сообщения пользователю ${chatId}:`, err);
            }
        }
    } else if (text === "Вопросы") {
        await bot.sendMessage(chatId, "Выберите вопрос, чтобы узнать подробнее:", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Как проходит клуб?", callback_data: "club" }],
                    [{ text: "Какова стоимость занятий?", callback_data: "cost" }],
                    [{ text: "Где и когда проходят встречи?", callback_data: "where_and_when" }],
                    [{ text: "Как записаться?", callback_data: "sign_up"}]
                ]
            }
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
                    [{ text: "Прошедшие записи" }, { text: "Активные записи" }],
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
    } else if (text === '/admin' && chatId.toString() === adminId) {
        await sendAdminPanel(chatId);
    } else if (text === '/admin') {
        await bot.sendMessage(chatId, 'У вас нет доступа к админ-панели.');
    } else if (text === "Прошедшие записи") {
        await showPastRecords(chatId);
    } else if (text === "Активные записи") {
        await showActiveRecords(chatId);
    } else {
        await sendMainMenu(chatId);
    }
});

async function sendMainMenu(chatId, withMessage) {
    const options = {
        reply_markup: {
            keyboard: [
                [{text: "Записаться в клуб"}, {text: "Мои записи"}],
                [{text: "Cвязаться с нами"}, {text: "Подробнее о сообществе"}, {text: "Вопросы"}],
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
            if (text !== "пр. Космонавтов, 52А (Уралмаш)") {
                await bot.sendMessage(chatId, "Вы ввели некорректный адрес. Пожалуйста, выберите из предложенных вариантов:", {
                    reply_markup: {
                        keyboard: [
                            [{ text: "пр. Космонавтов, 52А (Уралмаш)" }],
                            [{ text: "Назад" }]
                        ],
                        resize_keyboard: true
                    }
                });
                return;
            }

            session.formData.address = text;
            session.step++;
            const sundays = generateUpcomingSundays(5);
            await bot.sendMessage(chatId, "Расписание, выберите удобную дату:", {
                reply_markup: {
                    keyboard: [
                        ...sundays.map((date) => [{ text: date }]),
                        [{ text: "Назад" }]
                    ],
                    resize_keyboard: true
                }
            });
            break;
        case 2:
            const validDateFormat = /^\d{2}\.\d{2}\.\d{4}, вс, 12:00-15:00$/;
            if (!validDateFormat.test(text)) {
                await bot.sendMessage(chatId, "Некорректный формат даты. Выберите из предложенных вариантов:", {
                    reply_markup: {
                        keyboard: [
                            ...generateUpcomingSundays(5).map((date) => [{ text: date }]),
                            [{ text: "Назад" }]
                        ],
                        resize_keyboard: true
                    }
                });
                return;
            }

            session.formData.date = text;
            session.step++;
            await bot.sendMessage(chatId, "Как Вас зовут?", {
                reply_markup: {
                    keyboard: [
                        [{ text: "Назад" }]
                    ],
                    resize_keyboard: true
                }
            });
            break;
        case 3:
            session.formData.parentName = text;
            session.step++;
            await bot.sendMessage(chatId, "Как зовут ребенка, которого хотите записать на клуб?", {
                reply_markup: {
                    keyboard: [
                        [{ text: "Назад" }]
                    ],
                    resize_keyboard: true
                }
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
            if (text !== "Мужской" && text !== "Женский") {
                await bot.sendMessage(chatId, "Вы ввели некорректный пол. Пожалуйста, выберите один из вариантов:", {
                    reply_markup: {
                        keyboard: [
                            [{ text: "Мужской" }, { text: "Женский" }],
                            [{ text: "Назад" }]
                        ],
                        resize_keyboard: true
                    }
                });
                return;
            }

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
            if (!["12", "13", "14", "15", "16", "17"].includes(text)) {
                await bot.sendMessage(chatId, "Вы ввели некорректный возраст. Пожалуйста, выберите один из вариантов:", {
                    reply_markup: {
                        keyboard: [
                            [{ text: "12" }, { text: "13" }, { text: "14" }],
                            [{ text: "15" }, { text: "16" }, { text: "17" }],
                            [{ text: "Назад" }]
                        ],
                        resize_keyboard: true
                    }
                });
                return;
            }

            session.step++;
            session.formData.requests = [];

            await bot.sendMessage(chatId, "Возраст сохранен", {
                reply_markup: {
                    remove_keyboard: true
                }
            });

            await bot.sendMessage(chatId, "Какой запрос на клуб?", {
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "Низкая самооценка, неуверенность в себе", callback_data: "low_self_esteem" }],
                        [{ text: "Неприятие себя", callback_data: "self_rejection" }],
                        [{ text: "Трудности в общении, поиске друзей", callback_data: "communication_difficulties" }],
                        [{ text: "Тревожность", callback_data: "anxiety" }],
                        [{ text: "Поиск идентичности, профориентация", callback_data: "identity_search" }],
                        [{ text: "Трудности в учебной деятельности", callback_data: "study_difficulties" }],
                        [{ text: "Другое", callback_data: "other" }],
                        [{ text: "Очистить выбор", callback_data: "clear_selection" }],
                        [{ text: "Завершить выбор", callback_data: "finish_selection" }]
                    ]
                },
                remove_keyboard: true
            });
            break;
        case 7:
            // Если ожидается пользовательский ввод после выбора "Другое"
            if (session.awaitingOtherInput) {
                session.formData.requests.push(text); // Добавляем текст как новый запрос
                session.awaitingOtherInput = false; // Сбрасываем флаг ожидания ввода
                await bot.sendMessage(chatId, `Вы выбрали: ${session.formData.requests.join(", ")}`);
                return;
            }

            // Если пользователь нажимает "Назад", возвращаемся к предыдущему шагу
            if (text === "Назад") {
                session.step = 6; // Возвращаемся на шаг выбора возраста
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
                return;
            }

            // Никаких дополнительных сообщений, если пользователь выбрал "Другое"
            break;
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
                        [{ text: "пр. Космонавтов, 52А (Уралмаш)" }],
                        [{ text: "Назад" }]
                    ],
                    resize_keyboard: true
                }
            });
            break;
        case 2:
            const sundays = generateUpcomingSundays(5);

            await bot.sendMessage(chatId, "Расписание, выберите удобную дату:", {
                reply_markup: {
                    keyboard: [
                        ...sundays.map((date) => [{text: date}]),
                        [{text: "Назад"}]
                    ],
                    resize_keyboard: true
                }
            });
            break;
        case 3:
            await bot.sendMessage(chatId, "Как Вас зовут?", {
                reply_markup: {
                    keyboard: [[{ text: "Назад" }]],
                    resize_keyboard: true
                }
            });
            break;
        case 4:
            await bot.sendMessage(chatId, "Как зовут ребенка, которого хотите записать на клуб?", {
                reply_markup: {
                    keyboard: [[{ text: "Назад" }]],
                    resize_keyboard: true
                }
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
                reply_markup: {
                    inline_keyboard: [
                        [{ text: "Низкая самооценка, неуверенность в себе", callback_data: "low_self_esteem" }],
                        [{ text: "Неприятие себя", callback_data: "self_rejection" }],
                        [{ text: "Трудности в общении, поиске друзей", callback_data: "communication_difficulties" }],
                        [{ text: "Тревожность", callback_data: "anxiety" }],
                        [{ text: "Поиск идентичности, профориентация", callback_data: "identity_search" }],
                        [{ text: "Трудности в учебной деятельности", callback_data: "study_difficulties" }],
                        [{ text: "Другое", callback_data: "other" }],
                        [{ text: "Очистить выбор", callback_data: "clear_selection" }],
                        [{ text: "Завершить выбор", callback_data: "finish_selection" }]
                    ]
                }
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
    const session = userSessions[chatId];

    // await bot.answerCallbackQuery(query.id);

    if (data === "club") {
        await bot.sendMessage(chatId, "Как проходит клуб?\n\nКлуб проходит в формате групповых встреч с профессиональным психологом. Каждое занятие включает обсуждение, практические задания и обратную связь.");
    } else if (data === "cost") {
        await bot.sendMessage(chatId, "Какова стоимость занятий?\n\nСтоимость разового посещения – 1800 руб, абонемент на 4 занятия – 6000 руб.");
    } else if (data === "where_and_when") {
        await bot.sendMessage(chatId, "Где и когда проходят встречи?\n\nМероприятия проводятся по адресу [вставить адрес]. Расписание доступно [ссылка на расписание].");
    } else if (data === "sign_up") {
        await bot.sendMessage(chatId, "Как записаться?\n\nДля записи заполните форму ниже.", {
            reply_markup: {
                keyboard: [
                    [{ text: "Записаться в клуб"}],
                ],
                resize_keyboard: true
            }
        });
    } else if (data === "agree" && userSessions[chatId]) {
        const session = userSessions[chatId];
        session.formData.consent = true;
        session.formData.chatId = chatId;

        formData.push(session.formData);

        saveToExcel(formData, filePath, chatId);

        formData = [];

        await uploadToYandexDisk(filePath, yandexToken, remotePath);

        await bot.sendMessage(chatId, "Спасибо, что записались к нам! В ближайшее время с Вами свяжутся для подтверждения записи.");
        delete userSessions[chatId];
        await sendMainMenu(chatId);
    } else if (data === 'view_requests') {
        await bot.sendMessage(chatId, "Выберите тип заявок:", {
            reply_markup: {
                inline_keyboard: [
                    [{text: "Прошедшие заявки", callback_data: "past_requests"}],
                    [{text: "Будущие заявки", callback_data: "future_requests"}]
                ]
            }
        });
    } else if (data === 'past_requests') {
        await sendDateSelection(chatId, "past");
    } else if (data === 'future_requests') {
        await sendDateSelection(chatId, "future");
    } else if (data.startsWith("date_")) {
        const selectedDate = data.replace("date_", "");
        await viewRequestsByDate(chatId, selectedDate);
    } else if (data.startsWith("user_date_")) {
        const selectedDate = data.replace("user_date_", "");
        const workbook = XLSX.readFile(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const allData = XLSX.utils.sheet_to_json(worksheet);

        const filteredRequests = allData.filter(entry => entry["chatId"] === chatId && entry["Дата"] === selectedDate);

        if (filteredRequests.length === 0) {
            await bot.sendMessage(chatId, `На ${selectedDate} записи отсутствуют.`);
            return;
        }

        const formattedRequests = filteredRequests.map((entry, index) =>
            `${index + 1}. Имя ребенка: ${entry["Имя ребенка"]}, Запрос: ${entry["Запрос"]}`
        ).join("\n");

        await bot.sendMessage(chatId, `Ваши записи на ${selectedDate}:\n\n${formattedRequests}`);
    } else if (data === 'set_digest') {
        await bot.sendMessage(chatId, 'Отправьте ссылки на дайджест (по одной ссылке на строку):');
        bot.once('message', async (msg) => {
            const links = msg.text.split('\n');
            setDigestLinks(links);
            await bot.sendMessage(chatId, 'Дайджест обновлен.');
        });
    } else if (data === 'send_post') {
        await bot.sendMessage(chatId, 'Введите текст поста:');
        bot.once('message', async (msg) => {
            const workbook = XLSX.readFile(filePath);
            const worksheet = workbook.Sheets[workbook.SheetNames[0]];
            const data = XLSX.utils.sheet_to_json(worksheet);

            const post = msg.text;
            for (const user of registeredUsers) {
                await bot.sendMessage(user.chatId, post);
            }
            await bot.sendMessage(chatId, 'Пост отправлен.');
        });
    } else if (data.startsWith("active_")) {
        const selectedDate = data.replace("active_", "");
        await viewActiveRecord(chatId, selectedDate);
    } else if (data.startsWith("cancel_all_")) {
        const date = data.replace("cancel_all_", "");
        await cancelAllRecords(chatId, date);
    } else if (data.startsWith("cancel_")) {
        const recordId = parseInt(data.replace("cancel_", ""));
        await cancelRecordById(chatId, recordId);
    } else if (data === "back_to_active") {
        await showActiveRecords(chatId);
    } else if (!session || session.step !== 7) {
        await bot.answerCallbackQuery(query.id, { text: "Некорректное действие." });
        return;
    }

    if (!session.formData.requests) {
        session.formData.requests = [];
    }

    let req;
    const dict = {"low_self_esteem": "Низкая самооценка, неуверенность в себе", "self_rejection": "Неприятие себя", "communication_difficulties": "Трудности в общении, поиске друзей", "anxiety": "Тревожность", "identity_search": "Поиск идентичности, профориентация", "study_difficulties": "Трудности в учебной деятельности"}
    switch (data) {
        case "low_self_esteem":
        case "self_rejection":
        case "communication_difficulties":
        case "anxiety":
        case "identity_search":
        case "study_difficulties":
            for (const [key, value] of Object.entries(dict)) {
                if (key === data) {
                    if (!session.formData.requests.includes(value)) {
                        session.formData.requests.push(value);
                        await bot.answerCallbackQuery(query.id, { text: "Вы выбрали: " + session.formData.requests.join(", ") });
                    } else {
                        await bot.answerCallbackQuery(query.id, { text: "Этот пункт уже выбран." });
                    }
                }
            }
            break;
        case "other":
            await bot.answerCallbackQuery(query.id);
            await bot.sendMessage(chatId, "Введите свой вариант:");
            bot.once('message', async (msg) => {
                session.formData.requests.push(msg.text);
                await bot.sendMessage(chatId, `Вы выбрали: ${session.formData.requests.join(", ")}`);
            });
            break;
        case "finish_selection":
            if (session.formData.requests.length === 0) {
                await bot.answerCallbackQuery(query.id, { text: "Выберите хотя бы один запрос." });
            } else {
                // Отправляем сообщение с итоговым выбором
                const selectedRequests = session.formData.requests.join(", ");
                await bot.sendMessage(chatId, `Вы выбрали: ${selectedRequests}`);

                // Переход на следующий шаг
                session.step++;
                await bot.answerCallbackQuery(query.id, { text: "Выбор завершен." });
                await bot.sendMessage(chatId, "Оставьте Ваш номер телефона, чтобы мы могли с Вами связаться:", {
                    reply_markup: {
                        keyboard: [[{ text: "Назад" }]],
                        resize_keyboard: true
                    }
                });
            }
            break;
        case "clear_selection":
            session.formData.requests = []; // Очищаем выбор запросов
            await bot.answerCallbackQuery(query.id, { text: "Выбор очищен" }); // Сообщение-всплывашка
            break;
        default:
            await bot.answerCallbackQuery(query.id, { text: "Некорректное действие." });
    }
});

function generateUpcomingSundays(count) {
    const sundays = [];
    let currentDate = moment().startOf('day');

    if (currentDate.day() !== 0) {
        currentDate = currentDate.add(7 - currentDate.day(), 'days');
    }

    for (let i = 0; i < count; i++) {
        const sunday = currentDate.clone().add(i * 7, 'days');
        sundays.push(sunday.format('DD.MM.YYYY, вс, 12:00-15:00'));
    }

    return sundays;
}

const XLSX = require('xlsx');

function saveToExcel(formData, filePath, chatId) {
    let existingData = [];

    if (fs.existsSync(filePath)) {
        const workbook = XLSX.readFile(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        existingData = XLSX.utils.sheet_to_json(worksheet);
    }

    const updatedData = [...existingData, ...formData.map((entry, index) => ({
        ID: existingData.length + index + 1,
        chatId: chatId,
        Адрес: entry.address,
        Дата: entry.date,
        "Имя родителя": entry.parentName,
        "Имя ребенка": entry.childName,
        Пол: entry.gender,
        Возраст: entry.age,
        Запрос: entry.request.join(", "),
        Телефон: entry.phone
    }))];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(updatedData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Заявки");

    XLSX.writeFile(workbook, filePath);

    console.log("Данные сохранены в Excel!", updatedData);
}

const axios = require('axios');

async function uploadToYandexDisk(filePath, yandexToken, remotePath) {
    try {
        const getUploadUrl = `https://cloud-api.yandex.net/v1/disk/resources/upload?path=${remotePath}&overwrite=true`;
        const response = await axios.get(getUploadUrl, {
            headers: {
                Authorization: `OAuth ${yandexToken}`
            }
        });

        const uploadUrl = response.data.href;

        const fileStream = fs.createReadStream(filePath);
        await axios.put(uploadUrl, fileStream, {
            headers: {
                "Content-Type": 'application/octet-stream'
            }
        });

        console.log("Файл успешно загружен на Яндекс.Диск!");
    } catch (error) {
        console.error("Ошибка при загрузке на Яндекс.Диск:", error.response?.data || error.message);
    }
}

function sendReminders() {
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const saturdayEvening = schedule.scheduleJob('0 18 ** 6', async () => {
        for (const user of registeredUsers) {
            const sessionDate = moment(user.date, 'DD.MM.YYYY');
            if (sessionDate.isSame(moment().add(1, 'day'), 'day')) {
                await bot.sendMessage(user.chatId, `Напоминалка! ${user.childName} записан завтра в клуб. Ждем вас на встрече! ${user.date} по адресу: ${user.address}`);
            }
        }
    });
}

sendReminders();

const monthlyDigest = schedule.scheduleJob('0 12 1 * *', async () => {
    const digestLinks = getDigestLinks();
    const message = `Доброго дня! В нашем телеграм-канале мы постоянно публикуем полезные посты. Вот наша подборка статей и материалов за месяц:\n\n${digestLinks.join('\n')}`;

    for (const user of registeredUsers) {
        await bot.sendMessage(user.chatId, message);
    }
});

let digestLinks = [];
function setDigestLinks(newLinks) {
    digestLinks = newLinks;
}

function getDigestLinks() {
    return digestLinks;
}

async function sendAdminPanel(chatId) {
    await bot.sendMessage(chatId, 'Добро пожаловать в админ-панель. Выберите действие:', {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Посмотреть заявки', callback_data: 'view_requests' }],
                [{ text: 'Настроить дайджест', callback_data: 'set_digest' }],
                [{ text: 'Отправить пост', callback_data: 'send_post' }]
            ]
        }
    });
}

async function sendDateSelection(chatId, type) {
    if (!fs.existsSync(filePath)) {
        await bot.sendMessage(chatId, "Таблица с заявками пока пуста.");
        return;
    }

    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const today = moment().startOf('day');
    const filteredDates = [...new Set(data
        .filter(entry => entry["Отменена"] !== true)
        .map(entry => entry["Дата"])
        .filter(date => {
            const entryDate = moment(date, 'DD.MM.YYYY');
            return type === 'past' ? entryDate.isBefore(today) : entryDate.isSameOrAfter(today);
        })
    )];

    filteredDates.sort((a, b) => moment(a, 'DD.MM.YYYY') - moment(b, 'DD.MM.YYYY'));

    if (filteredDates.length === 0) {
        await bot.sendMessage(chatId, `Нет ${type === "past" ? "прошедших" : "будущих"} заявок.`);
        return;
    }

    const buttons = filteredDates.map(date => [{ text: date, callback_data: `date_${date}` }]);

    await bot.sendMessage(chatId, `Выберите дату для просмотра ${type === "past" ? "прошедших" : "будущих"} заявок.`, {
        reply_markup: { inline_keyboard: buttons }
    });
}

function sortRequestsByDate(requests) {
    return requests.sort((a, b) => {
        const dateA = moment(a["Дата"], 'DD.MM.YYYY');
        const dateB = moment(b["Дата"], 'DD.MM.YYYY');
        return dateA - dateB;
    });
}

async function viewRequestsByDate(chatId, date) {
    if (!fs.existsSync(filePath)) {
        await bot.sendMessage(chatId, "Таблица с заявками пока пуста.");
        return;
    }

    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const filteredRequests = data.filter(entry => entry["Дата"] === date && entry["Отменена"] !== true);

    if (filteredRequests.length === 0) {
        await bot.sendMessage(chatId, `Заявки на ${date} отсутствуют.`);
        return;
    }

    const formattedRequests = filteredRequests.map((entry, index) =>
        `${index + 1}. Имя ребенка: ${entry["Имя ребенка"]}, Имя родителя: ${entry["Имя родителя"]}, Телефон: ${entry["Телефон"]}`
    ).join("\n");

    await bot.sendMessage(chatId, `Заявки на ${date}:\n\n${formattedRequests}`);
}

async function showPastRecords(chatId) {
    if (!fs.existsSync(filePath)) {
        await bot.sendMessage(chatId, "Записи отсутствуют.");
        return;
    }

    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const today = moment().startOf('day');
    const pastRecords = data.filter(entry => {
        const entryDate = moment(entry["Дата"], 'DD.MM.YYYY');
        return entryDate.isBefore(today) && entry["Отменена"] !== true && entry["chatId"] === chatId;
    });

    pastRecords.sort((a, b) => moment(a["Дата"], 'DD.MM.YYYY') - moment(b["Дата"], 'DD.MM.YYYY'));

    if (pastRecords.length === 0) {
        await bot.sendMessage(chatId, "Прошедших записей нет.");
        return;
    }

    const formattedRecords = pastRecords.map((entry, index) =>
        `${index + 1}. ${entry["Дата"]} ${entry["Время"]} - Имя ребенка: ${entry["Имя ребенка"]}, Запрос: ${entry["Запрос"]}`
    ).join("\n");

    await bot.sendMessage(chatId, `Ваши прошедшие записи:\n\n${formattedRecords}`);
}

async function showActiveRecords(chatId) {
    if (!fs.existsSync(filePath)) {
        await bot.sendMessage(chatId, "Записи отсутствуют.");
        return;
    }

    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const today = moment().startOf('day');
    const activeRecords = data.filter(entry => {
        const entryDate = moment(entry["Дата"], 'DD.MM.YYYY');
        return entryDate.isSameOrAfter(today) && entry["Отменена"] !== true && entry["chatId"] === chatId;
    });

    activeRecords.sort((a, b) => moment(a["Дата"], 'DD.MM.YYYY') - moment(b["Дата"], 'DD.MM.YYYY'));

    if (activeRecords.length === 0) {
        await bot.sendMessage(chatId, "Активных записей нет.");
        return;
    }

    const uniqueDates = [...new Set(activeRecords.map(entry => entry["Дата"]))];

    const buttons = uniqueDates.map(date =>
        [{ text: `${date}`, callback_data: `active_${date}` }]
    );

    await bot.sendMessage(chatId, "Выберите дату для просмотра записи:", {
        reply_markup: { inline_keyboard: buttons }
    });
}

async function viewActiveRecord(chatId, date) {
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Фильтрация всех активных записей на выбранную дату для пользователя
    const records = data.filter(entry =>
        entry["Дата"] === date && entry["chatId"] === chatId && entry["Отменена"] !== true
    );

    if (records.length === 0) {
        await bot.sendMessage(chatId, "Активные записи на выбранную дату отсутствуют.");
        return;
    }

    // Формирование списка записей
    const messageText = records.map((entry, index) =>
        `${index + 1}. Имя ребенка: ${entry["Имя ребенка"]}, Запрос: ${entry["Запрос"]}`
    ).join("\n");

    const buttons = [];

    // Если больше одной записи — добавить кнопку "Отменить все записи"
    if (records.length > 1) {
        buttons.push([{ text: "Отменить все записи", callback_data: `cancel_all_${date}` }]);
    }

    // Добавление индивидуальных кнопок отмены для каждой записи
    records.forEach((entry, index) => {
        const buttonText = records.length === 1
            ? "Отменить запись"
            : `Отменить запись ${index + 1}`;
        buttons.push([{ text: buttonText, callback_data: `cancel_${entry["ID"]}` }]);
    });

    buttons.push([{ text: "Назад", callback_data: "back_to_active" }]);

    await bot.sendMessage(chatId, `Ваши записи на ${date}:\n\n${messageText}`, {
        reply_markup: { inline_keyboard: buttons }
    });
}


async function cancelRecordById(chatId, recordId) {
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Пометка записи как отмененной
    const updatedData = data.map(entry => {
        if (entry["ID"] === recordId) {
            entry["Отменена"] = true;
        }
        return entry;
    });

    const newWorksheet = XLSX.utils.json_to_sheet(updatedData);
    workbook.Sheets["Заявки"] = newWorksheet;
    XLSX.writeFile(workbook, filePath);

    await bot.sendMessage(chatId, "Запись успешно отменена.");
    await showActiveRecords(chatId);
}

async function cancelAllRecords(chatId, date) {
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    // Пометка всех записей на выбранную дату как отмененных
    const updatedData = data.map(entry => {
        if (entry["Дата"] === date && entry["chatId"] === chatId) {
            entry["Отменена"] = true;
        }
        return entry;
    });

    const newWorksheet = XLSX.utils.json_to_sheet(updatedData);
    workbook.Sheets["Заявки"] = newWorksheet;
    XLSX.writeFile(workbook, filePath);

    await bot.sendMessage(chatId, "Все записи на выбранную дату успешно отменены.");
    await showActiveRecords(chatId);
}