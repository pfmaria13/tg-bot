require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const moment = require('moment');
const momentTz = require('moment-timezone');
const token = process.env.TOKEN;
const yandexToken = process.env.YANDEX_TOKEN;
const superAdminId = process.env.SUPERADMIN_ID;
const adminPassword = process.env.ADMIN_PASSWORD;
const adminsFilePath = 'admins.json';
const questionsFilePath = 'questions.json';
const bot = new TelegramBot(token, {polling: true});
const fs = require('fs');
let formData = [];
const filePath = 'formData.xlsx';
const remotePath = '/Заявки.xlsx';
const schedule = require('node-schedule');
const adminSessions = {};
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./users.db');
const blockedDates = [];
const blockedDatesFile = 'blockedDates.json';
const saveQueue = [];

const userSessions = {};

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === '/start') {
        addUserToDatabase(chatId);
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
                await sendMainMenu(chatId);
            } else {
                session.step = Math.max(1, session.step - 1);
                await sendPreviousStep(chatId, session);
            }
        } else {
            await handleStep(chatId, text, session);
        }
    } else if (text === '/admin') {
        let admins = [];

        if (fs.existsSync(adminsFilePath)) {
            admins = JSON.parse(fs.readFileSync(adminsFilePath, 'utf8'));
        }

        if (admins.includes(chatId.toString())) {
            await sendAdminPanel(chatId);
        } else {
            await bot.sendMessage(chatId, 'У вас нет доступа к админ-панели.');
        }
    } else if (text === "Прошедшие записи") {
        await showPastRecords(chatId);
    } else if (text === "Активные записи") {
        await showActiveRecords(chatId);
    } else if (text === "Назад") {
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

            session.formData.age = text;
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
            if (session.awaitingOtherInput) {
                session.formData.requests.push(text);
                session.awaitingOtherInput = false;
                await bot.sendMessage(chatId, `Вы выбрали: ${session.formData.requests.join(", ")}`);
                return;
            }

            if (text === "Назад") {
                session.step = 6;
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
            break;
        case 8:
            if (validatePhoneNumber(text)) {
                session.formData.phone = formatPhoneNumber(text);
                session.step++;
                const pdfPath = './policy.pdf';
                await bot.sendDocument(chatId, pdfPath, {
                    caption: "Согласие на обработку персональных данных. Ознакомьтесь с политикой, а затем подтвердите, нажав ✅:",
                    reply_markup: {
                        inline_keyboard: [
                            [{ text: "✅", callback_data: "agree" }]
                        ]
                    }
                });
            } else {
                await bot.sendMessage(chatId, "Номер телефона введен неправильно. Введите номер телефона повторно.");
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
            await bot.sendMessage(chatId, "Оставьте Ваш номер телефона, чтобы мы могли с Вами связаться:", {
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

bot.on('callback_query', async (query) => {
    const chatId = query.message.chat.id;
    const data = query.data;
    const session = userSessions[chatId];

    if (data === "club") {
        await bot.sendMessage(chatId, "Как проходит клуб?\n\nКлуб проходит в формате групповых встреч с профессиональным психологом. Каждое занятие включает обсуждение, практические задания и обратную связь.");
    } else if (data === "cost") {
        await bot.sendMessage(chatId, "Какова стоимость занятий?\n\nСтоимость разового посещения – 1800 руб, абонемент на 4 занятия – 6000 руб.");
    } else if (data === "where_and_when") {
        await bot.sendMessage(chatId, "Где и когда проходят встречи?\n\nМероприятия проводятся по адресу пр. Космонавтов, 52А (Уралмаш). Расписание доступно [ссылка на расписание].");
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

        enqueueSaveOperation(formData, filePath, chatId);

        formData = [];

        await uploadToYandexDisk(filePath, yandexToken, remotePath);

        await bot.sendMessage(chatId, "Спасибо, что записались к нам! В ближайшее время с Вами свяжутся для подтверждения записи.");
        delete userSessions[chatId];
        await sendMainMenu(chatId);
    } else if (data === 'view_requests') {
        await bot.sendMessage(chatId, "Выберите тип заявок:", {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Прошедшие заявки", callback_data: "past_requests"}],
                    [{ text: "Будущие заявки", callback_data: "future_requests"}],
                    [{ text: "Закрыть ❎", callback_data: 'delete_action' }]
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
    } else if (data === 'digest_settings') {
        await bot.sendMessage(chatId, "Настройки дайджеста. Выберите действие:", {
            reply_markup: {
                inline_keyboard: [
                    [{text: 'Изменить день и время отправки', callback_data: 'change_digest_time'}],
                    [{text: 'Обновить содержание дайджеста', callback_data: 'update_digest_content'}],
                    [{text: 'Просмотреть текущий дайджест', callback_data: 'view_digest'}],
                    [{text: 'Закрыть ❎', callback_data: 'delete_action'}]
                ]
            }
        });
    } else if (data === 'update_digest_content') {
        adminSessions[chatId] = { action: 'update_digest_content' };
        await bot.sendMessage(chatId, "Введите новое содержание дайджеста:", {
            reply_markup: {
                inline_keyboard: [[{ text: "Закрыть ❎", callback_data: 'delete_action' }]]
            }
        });

        bot.once('message', async (msg) => {
            if (adminSessions[chatId]?.action === 'update_digest_content') {
                digestContent = msg.text;
                await bot.sendMessage(chatId, "Содержание дайджеста обновлено.");
                delete adminSessions[chatId];
            }
        });
    } else if (data === 'send_post') {
        adminSessions[chatId] = { action: 'send_post' };
        await bot.sendMessage(chatId, 'Введите текст поста:', {
            reply_markup: {
                inline_keyboard: [
                    [{ text: "Закрыть ❎", callback_data: 'delete_action' }]
                ]
            }
        });
        bot.once('message', async (msg) => {
            if (adminSessions[chatId]?.action === 'send_post') {
                db.all("SELECT chatId FROM users", [], async (err, rows) => {
                    if (err) {
                        console.error("Ошибка чтения пользователей из базы данных:", err.message);
                        return;
                    }
                    for (const row of rows) {
                        try {
                            await bot.sendMessage(row.chatId, msg.text);
                        } catch (err) {
                            console.error(`Ошибка отправки сообщения пользователю ${row.chatId}:`, err.message);
                        }
                    }
                });
            }
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
    } else if (data === "edit_questions") {
        await showQuestionsEditor(chatId);
    } else if (data === "add_question") {
        adminSessions[chatId] = {action: 'add_question'};
        await bot.sendMessage(chatId, "Введите новый вопрос и ответ в формате: Вопрос? Ответ.");
        await getMessage(chatId);
    } else if (data.startsWith("edit_question_")) {
        const index = parseInt(data.split("_")[2]);
        adminSessions[chatId] = {action: 'edit_question', index};
        const question = loadQuestions()[index];
        await bot.sendMessage(chatId, `Редактирование вопроса:\n\n${question.question}\n\nВведите новый текст в формате: Вопрос? Ответ.`);
        await getMessage(chatId);
    } else if (data.startsWith("delete_question_")) {
        const index = parseInt(data.split("_")[2]);
        const questions = loadQuestions();
        questions.splice(index, 1);
        saveQuestions(questions);
        await bot.sendMessage(chatId, "Вопрос удален.");
        await showQuestionsEditor(chatId);
    } else if (data.startsWith("show_answer_")) {
        const index = parseInt(data.split("_")[2]);
        const question = loadQuestions()[index];
        await bot.sendMessage(chatId, `${question.question}\n\n${question.answer}`);
    } else if (data === "manage_admins") {
        await sendSuperAdminPanel(chatId);
    } else if (data === "view_admins") {
        await showAdmins(chatId);
    } else if (data === "add_admin") {
        await addAdmin(chatId);
    } else if (data === "remove_admin") {
        await removeAdmin(chatId);
    } else if (data === 'change_digest_time') {
        adminSessions[chatId] = { action: 'change_digest_time' };
        await bot.sendMessage(chatId, "Введите новый день и время отправки дайджеста в формате: `DD HH:MM` (например, `5 14:30`):", {
            parse_mode: 'Markdown',
            reply_markup: {
                inline_keyboard: [[{ text: "Закрыть ❎", callback_data: 'delete_action' }]]
            }
        });

        bot.once('message', (msg) => {
            if (adminSessions[chatId]?.action === 'change_digest_time') {
                const input = msg.text.trim();
                const regex = /^(\d{1,2})\s+(\d{2}):(\d{2})$/;
                const match = regex.exec(input);

                delete adminSessions[chatId];

                if (match) {
                    const day = parseInt(match[1], 10);
                    const hour = parseInt(match[2], 10);
                    const minute = parseInt(match[3], 10);

                    if (day >= 1 && day <= 31 && hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59) {
                        updateDigestTime(day, `${hour}:${minute}`);
                        bot.sendMessage(chatId, `День и время отправки дайджеста обновлены: ${day}-е число, ${hour}:${minute}.`);
                        restartDigestJob();
                        delete adminSessions[chatId];
                    } else {
                        bot.sendMessage(chatId, "Неверный формат времени. Убедитесь, что день и время находятся в допустимых пределах.");
                    }
                } else {
                    bot.sendMessage(chatId, "Неверный формат. Введите данные в формате: `DD HH:MM`.");
                }
            }
        });
    } else if (data === 'view_digest') {
        await getSetting('digest_time', async (digestTime) => {
            const timeInfo = digestTime ? `Дайджест отправляется ${digestTime}` : "Дайджест не настроен.";
            await bot.sendMessage(chatId, `${timeInfo}\n\nСодержимое дайджеста:\n${digestContent}`)
        });
    } else if (data === "delete_action") {
        delete adminSessions[chatId];
        try {
            await bot.deleteMessage(chatId, query.message.message_id);
            await bot.sendMessage(chatId, "Действие отменено.");
            await sendAdminPanel(chatId);
        } catch (error) {
            console.error('Ошибка при удалении сообщения:', error);
        }
    } else if (data === 'delete_date') {
        const availableDates = generateUpcomingSundays(5);

        if (availableDates.length === 0) {
            await bot.sendMessage(chatId, "Нет доступных дат для удаления.");
            return;
        }

        const buttons = availableDates.map(date => [{ text: date, callback_data: `remove_date_${date}` }]);
        buttons.push(
            [{ text: 'Закрыть ❎', callback_data: 'delete_action' }]
        )
        await bot.sendMessage(chatId, "Выберите дату для удаления:", {
            reply_markup: { inline_keyboard: buttons }
        });
    } else if (data.startsWith('remove_date_')) {
        const dateToRemove = data.replace('remove_date_', '');
        await deleteDateAndNotify(dateToRemove, chatId);
    } else if (!session || session.step !== 7) {
        await bot.answerCallbackQuery(query.id);
        return;
    }

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
                const selectedRequests = session.formData.requests.join(", ");
                await bot.sendMessage(chatId, `Вы выбрали: ${selectedRequests}`);

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
            session.formData.requests = [];
            await bot.answerCallbackQuery(query.id, { text: "Выбор очищен" });
            break;
        default:
            await bot.answerCallbackQuery(query.id);
    }
});

function generateUpcomingSundays(count) {
    const sundays = [];
    let currentDate = moment().startOf('minute');

    if (currentDate.day() !== 0) {
        currentDate = currentDate.add(7 - currentDate.day(), 'days');
    }

    for (let i = 0; i < count; i++) {
        const sunday = currentDate.clone().add(i * 7, 'days');
        const sundayStart = sunday.clone().set({ hour: 12, minute: 0 });
        const sundayEnd = sunday.clone().set({ hour: 15, minute: 0 });

        if (sundayEnd.isAfter(moment()) && !blockedDates.includes(sundayStart.format('DD.MM.YYYY, вс, 12:00-15:00'))) {
            sundays.push(sundayStart.format('DD.MM.YYYY, вс, 12:00-15:00'));
        }
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
        Запрос: entry.requests.join(', '),
        Телефон: entry.phone
    }))];

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(updatedData);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Заявки");

    XLSX.writeFile(workbook, filePath);
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
    if (!fs.existsSync(filePath)) {
        console.log("Файл с данными не найден.");
        return;
    }

    schedule.scheduleJob('*/30 * * * *', async () => {
        const workbook = XLSX.readFile(filePath);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(worksheet);

        const now = moment();

        for (const entry of data) {
            if (!entry["Дата"] || entry["Отменена"] === true) continue;

            const rawDate = entry["Дата"].split(',')[0].trim();
            const rawTimeRange = entry["Дата"].split(',')[2]?.trim();
            const rawTime = rawTimeRange.split('-')[0]?.trim();

            const [hour, minute] = rawTime.split(':').map(Number);
            const sessionDate = moment(rawDate, 'DD.MM.YYYY').set({ hour, minute });

            if (!sessionDate.isValid()) {
                console.error(`Ошибка: некорректная дата "${rawDate}" или время "${rawTime}"`);
                continue;
            }

            const timeDiffMinutes = sessionDate.diff(now, 'minutes');

            if (timeDiffMinutes === 1440) {
                try {
                    await bot.sendMessage(entry["chatId"],
                        `Напоминалка! ${entry["Имя ребенка"]} записан завтра в клуб. Ждем вас на встрече! ${entry["Дата"]} по адресу: ${entry["Адрес"]}`);
                    console.log(`Напоминание отправлено пользователю ${entry["chatId"]}`);
                } catch (err) {
                    console.error(`Ошибка при отправке напоминания пользователю ${entry["chatId"]}:`, err.message);
                }
            }
        }
    });
}


sendReminders();

let digestContent = "Доброго дня! В нашем телеграм-канале мы постоянно публикуем полезные посты. Вот наша подборка статей и материалов за месяц:";
let digestJob = null;

function sendMonthlyDigest() {
    schedule.scheduleJob('0 12 1 * *', async () => {

    });
}

async function sendAdminPanel(chatId) {
    const buttons = [
        [{ text: 'Посмотреть заявки', callback_data: 'view_requests' }],
        [{ text: 'Настроить дайджест', callback_data: 'digest_settings' }],
        [{ text: 'Отправить пост', callback_data: 'send_post' }],
        [{ text: 'Редактировать вопросы', callback_data: 'edit_questions' }],
        [{ text: 'Удалить дату из расписания', callback_data: 'delete_date' }]
    ]

    if (chatId.toString() === superAdminId) {
        buttons.push([{text: "Управление администраторами", callback_data: "manage_admins"}]);
    }

    await bot.sendMessage(chatId, "Добро пожаловать в админ-панель. Выберите действие:", {
        reply_markup: { inline_keyboard: buttons }
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
    buttons.push(
        [{ text: 'Закрыть ❎', callback_data: 'delete_action' }]
    )

    await bot.sendMessage(chatId, `Выберите дату для просмотра ${type === "past" ? "прошедших" : "будущих"} заявок.`, {
        reply_markup: { inline_keyboard: buttons }
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
        `${index + 1}. Имя ребенка: ${entry["Имя ребенка"]}, Имя родителя: ${entry["Имя родителя"]}, Запрос: ${entry["Запрос"]}, Телефон: ${entry["Телефон"]}`
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
        `${index + 1}. ${entry["Дата"]} - Имя ребенка: ${entry["Имя ребенка"]}, Запрос: ${entry["Запрос"]}`
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

    const records = data.filter(entry =>
        entry["Дата"] === date && entry["chatId"] === chatId && entry["Отменена"] !== true
    );

    if (records.length === 0) {
        await bot.sendMessage(chatId, "Активные записи на выбранную дату отсутствуют.");
        return;
    }

    const messageText = records.map((entry, index) =>
        `${index + 1}. Имя ребенка: ${entry["Имя ребенка"]}, Запрос: ${entry["Запрос"]}`
    ).join("\n");

    const buttons = [];

    if (records.length > 1) {
        buttons.push([{ text: "Отменить все записи", callback_data: `cancel_all_${date}` }]);
    }

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

    const updatedData = data.map(entry => {
        if (entry["ID"] === recordId) {
            entry["Отменена"] = true;
        }
        return entry;
    });

    const newWorksheet = XLSX.utils.json_to_sheet(updatedData);
    workbook.Sheets["Заявки"] = newWorksheet;
    XLSX.writeFile(workbook, filePath);

    await uploadToYandexDisk(filePath, yandexToken, remotePath);
    await bot.sendMessage(chatId, "Запись успешно отменена.");
    await showActiveRecords(chatId);
}

async function cancelAllRecords(chatId, date) {
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    const updatedData = data.map(entry => {
        if (entry["Дата"] === date && entry["chatId"] === chatId) {
            entry["Отменена"] = true;
        }
        return entry;
    });

    const newWorksheet = XLSX.utils.json_to_sheet(updatedData);
    workbook.Sheets["Заявки"] = newWorksheet;
    XLSX.writeFile(workbook, filePath);

    await uploadToYandexDisk(filePath, yandexToken, remotePath);
    await bot.sendMessage(chatId, "Все записи на выбранную дату успешно отменены.");
    await showActiveRecords(chatId);
}

async function sendSuperAdminPanel(chatId) {
    const options = {
        reply_markup: {
            inline_keyboard: [
                [{ text: 'Посмотреть администраторов', callback_data: 'view_admins' }],
                [{ text: 'Добавить администратора', callback_data: 'add_admin' }],
                [{ text: 'Удалить администратора', callback_data: 'remove_admin' }],
                [{ text: "Закрыть ❎", callback_data: 'delete_action' }]
            ]
        }
    };
    await bot.sendMessage(chatId, 'Выберите действие для управления администраторами:', options);
}

async function showAdmins(chatId) {
    let admins = [];

    if (fs.existsSync(adminsFilePath)) {
         admins = JSON.parse(fs.readFileSync(adminsFilePath, 'utf8'));
    }

    const adminList = admins.length > 0 ? admins.join('\n') : 'Администраторы не найдены.';

    await bot.sendMessage(chatId, `ID администраторов:\n${adminList}`);
}

async function addAdmin(chatId) {
    adminSessions[chatId] = { action: 'add_admin' };
    await bot.sendMessage(chatId, "Введите ID нового администратора:", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "Закрыть ❎", callback_data: 'delete_action' }]
            ]
        }
    });
    bot.once('message', (msg) => {
        if (adminSessions[chatId]?.action === 'add_admin') {
            const newAdminId = msg.text;
            let admins = [];

            if (fs.existsSync(adminsFilePath)) {
                admins = JSON.parse(fs.readFileSync(adminsFilePath, 'utf8'));
            }

            delete adminSessions[chatId];
            if (!admins.includes(newAdminId)) {
                admins.push(newAdminId);
                fs.writeFileSync(adminsFilePath, JSON.stringify(admins));
                bot.sendMessage(chatId, `Администратор с ID ${newAdminId} успешно добавлен.`);
            } else {
                bot.sendMessage(chatId, "Администратор c таким ID уже существует.");
            }
        }
    });
}

async function removeAdmin(chatId) {
    adminSessions[chatId] = { action: 'remove_admin' };
    await bot.sendMessage(chatId, "Введите ID администратора для удаления:", {
        reply_markup: {
            inline_keyboard: [
                [{ text: "Закрыть ❎", callback_data: 'delete_action' }]
            ]
        }
    });
    bot.once('message', (msg) => {
        if (adminSessions[chatId]?.action === 'remove_admin') {
            const adminId = msg.text;
            let admins = [];

            if (fs.existsSync(adminsFilePath)) {
                admins = JSON.parse(fs.readFileSync(adminsFilePath, 'utf8'));
            }

            delete adminSessions[chatId];

            if (admins.includes(adminId)) {
                admins = admins.filter(id => id !== adminId);
                fs.writeFileSync(adminsFilePath, JSON.stringify(admins));
                bot.sendMessage(chatId, `Администратор с ID ${adminId} успешно удален.`);
            } else {
                bot.sendMessage(chatId, "Администратор с таким ID не найден.");
            }
        }
    });
}

function loadQuestions() {
    if (fs.existsSync(questionsFilePath)) {
        return JSON.parse(fs.readFileSync(questionsFilePath, 'utf8'));
    }
    return [];
}

function saveQuestions(questions) {
    fs.writeFileSync(questionsFilePath, JSON.stringify(questions, null, 2));
}

async function showQuestionsEditor(chatId) {
    const questions = loadQuestions();

    const buttons = questions.map((q, index) =>
        [{ text: `Редактировать: ${index + 1}. ${q.question}`, callback_data: `edit_question_${index}` },
            {text: `Удалить: ${index + 1}`, callback_data: `delete_question_${index}`}]
    );

    buttons.push(
        [{ text: "Добавить новый вопрос", callback_data: "add_question" }],
        [{ text: "Закрыть ❎", callback_data: "delete_action" }]
    );

    await bot.sendMessage(chatId, "Редактор вопросов. Выберите действие:", {
        reply_markup: { inline_keyboard: buttons }
    });
}

async function getMessage(chatId) {
    bot.once('message', async (msg) => {
        const session = adminSessions[chatId];
        const questions = loadQuestions();

        if (session?.action === 'add_question') {
            const delimiterIndex = msg.text.indexOf('?');
            if (delimiterIndex !== -1) {
                const question = msg.text.slice(0, delimiterIndex + 1).trim();
                const answer = msg.text.slice(delimiterIndex + 1).trim();
                questions.push({ question, answer });
            } else {
                await bot.sendMessage(chatId, "Ошибка: Вопрос должен содержать знак '?'. Попробуйте снова.");
                return;
            }
        } else if (session?.action === 'edit_question') {
            const delimiterIndex = msg.text.indexOf('?');
            if (delimiterIndex !== -1) {
                const question = msg.text.slice(0, delimiterIndex + 1).trim();
                const answer = msg.text.slice(delimiterIndex + 1).trim();
                questions[session.index] = { question, answer };
            } else {
                await bot.sendMessage(chatId, "Ошибка: Вопрос должен содержать знак '?'. Попробуйте снова.");
                return;
            }
        }

        await saveQuestions(questions);
        delete adminSessions[chatId];
        await bot.sendMessage(chatId, "Изменения сохранены.");
        await showQuestionsEditor(chatId);
    });
}

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS users (chatId TEXT UNIQUE)");
});

function addUserToDatabase(chatId) {
    const formattedChatId = chatId.toString();
    db.run("INSERT OR IGNORE INTO users (chatId) VALUES (?)", [formattedChatId], (err) => {
        if (err) {
            console.error("Ошибка добавления пользователя в базу данных:", err.message);
        }
    });
}

db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)");
    updateSetting('digest_time', '1 12:00');
});

function updateDigestTime(day, time) {
    const value = `${day} ${time}`;
    updateSetting('digest_time', value);
}

function updateSetting(key, value) {
    db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, value], (err) => {
        if (err) {
            console.error("Ошибка обновления настройки:", err.message);
        }
    });
}

function getSetting(key, callback) {
    db.get("SELECT value FROM settings WHERE key = ?", [key], (err, row) => {
        if (err) {
            console.error("Ошибка получения настройки:", err.message);
        } else {
            callback(row ? row.value : null);
        }
    });
}

function sendDigestToAllUsers(digestContent) {
    db.all("SELECT chatId FROM users", [], async (err, rows) => {
        if (err) {
            console.error("Ошибка чтения пользователей из базы данных:", err.message);
            return;
        }
        for (const row of rows) {
            try {
                await bot.sendMessage(row.chatId, digestContent);
            } catch (err) {
                console.error(`Ошибка отправки сообщения пользователю ${row.chatId}:`, err.message);
            }
        }
    });
}

getSetting('digest_time', (digestTime) => {
    if (!digestTime) {
        console.error("Время для дайджеста не настроено.");
        return;
    }

    const [day, time] = digestTime.split(' ');
    const [hour, minute] = time.split(':').map(Number);
    const timezone = 'Asia/Yekaterinburg';

    const serverTime = moment.tz(
        { year: moment().year(), month: moment().month(), day: parseInt(day), hour, minute },
        timezone
    ).toDate();

    schedule.scheduleJob(serverTime, () => {
        sendDigestToAllUsers(digestContent);
    });
});

function restartDigestJob() {
    if (digestJob) {
        digestJob.cancel();
    }

    getSetting('digest_time', (digestTime) => {
        if (!digestTime) {
            console.error("Время для дайджеста не настроено.");
            return;
        }

        const [day, time] = digestTime.split(' ');
        const [hour, minute] = time.split(':').map(Number);
        const timezone = 'Asia/Yekaterinburg';

        const nextDigestTime = moment.tz(
            { year: moment().year(), month: moment().month(), day: parseInt(day), hour, minute },
            timezone
        );

        if (nextDigestTime.isBefore(moment())) {
            nextDigestTime.add(1, 'month');
        }

        digestJob = schedule.scheduleJob(nextDigestTime.toDate(), () => {
            sendDigestToAllUsers(digestContent);
            restartDigestJob();
        });
    });
}

restartDigestJob();

async function deleteDateAndNotify(date, adminChatId) {
    blockedDates.push(date);
    saveBlockedDates();

    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet);

    console.log('Удаляемая дата:', date);
    console.log('Все данные из Excel:', data);

    const affectedUsers = data.filter(entry => entry["Дата"] === date && !entry["Отменена"]);
    console.log('affectedUsers:', affectedUsers);

    const updatedData = data.map(entry => {
        if (entry["Дата"] === date) {
            entry["Отменена"] = true;
        }
        return entry;
    });

    workbook.Sheets[workbook.SheetNames[0]] = XLSX.utils.json_to_sheet(updatedData);
    XLSX.writeFile(workbook, filePath);

    for (const user of affectedUsers) {
        try {
            console.log('Отправка уведомления пользователю:', user);
            await bot.sendMessage(user["chatId"], `Ваше занятие на ${date} было отменено организаторами. Извините за неудобства.`);
        } catch (err) {
            console.error(`Ошибка отправки уведомления пользователю ${user["chatId"]}:`, err.message);
        }
    }

    await bot.sendMessage(adminChatId, `Дата ${date} успешно удалена, пользователи уведомлены.`);
}

if (fs.existsSync(blockedDatesFile)) {
    blockedDates.push(...JSON.parse(fs.readFileSync(blockedDatesFile, 'utf8')));
}

function saveBlockedDates() {
    fs.writeFileSync(blockedDatesFile, JSON.stringify(blockedDates, null, 2));
}

function enqueueSaveOperation(data, filePath, chatId) {
    saveQueue.push({ data, filePath });

    if (saveQueue.length === 1) {
        processSaveQueue(chatId);
    }
}

function processSaveQueue(chatId) {
    if (saveQueue.length === 0) return;

    const { data, filePath } = saveQueue[0];

    try {
        saveToExcel(data, filePath, chatId);
        console.log(`Файл успешно сохранён: ${filePath}`);
        saveQueue.shift();
        processSaveQueue();
    } catch (err) {
        if (err.code === 'EBUSY') {
            console.warn(`Файл ${filePath} занят, повторная попытка через 5 секунд...`);
            setTimeout(processSaveQueue, 5000);
        } else {
            console.error(`Ошибка при сохранении файла: ${err.message}`);
            saveQueue.shift();
            processSaveQueue();
        }
    }
}