const TelegramBot = require('node-telegram-bot-api');
const moment = require('moment')
const token = '7683360802:AAEnz8xS-9FcG3PAK1IhDnr9o4McLo7WQYc';
const bot = new TelegramBot(token, {polling: true});
const fs = require('fs');
const formData = [];
const filePath = 'formData.xlsx';
const yandexToken = 'y0_AgAAAAAd6OM6AADLWwAAAAEbwtsLAABl-sQ_6M9EUoqN5Hd_l3y5h3gMzg';
const remotePath = '/Заявки.xlsx';
const schedule = require('node-schedule');
const ADMIN_ID = '5503846931';

const userSessions = {};
const registeredUsers = [];

bot.on('message', async (msg) => {
    const chatId = msg.chat.id;
    const text = msg.text;

    if (text === '/start') {
        await sendMainMenu(chatId, true);
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
        userSessions[chatId] = { step: 1, formData: {} };
        await bot.sendMessage(chatId, "Клуб сочетает в себе психологические тренинговые упражнения, которые направлены как на отработку и закрепление практических навыков, так и на знакомство с собой. С другой стороны здесь можно почувствовать созидательную атмосферу, где ребята могут пообщаться друг с другом и поиграть в настолки.\n\nКакой адрес?", {
            reply_markup: {
                keyboard: [
                    [{ text: "пр. Космонавтов, 52А (Уралмаш)" }],
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
    } else if (text === '/admin' && chatId.toString() === ADMIN_ID) {
        sendAdminPanel(chatId);
    } else if (text === '/admin') {
        bot.sendMessage(chatId, 'У вас нет доступа к админ-панели.');
    } else {
        await sendMainMenu(chatId);
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
                    [{ text: "Записаться в клуб"}]
                ]
            }
        });
    } else if (data === "agree" && userSessions[chatId]) {
        const session = userSessions[chatId];
        session.formData.consent = true;

        formData.push(session.formData);
        registeredUsers.push({
            chatId,
            childName: session.formData.childName,
            date: session.formData.date,
            address: session.formData.address
        })

        saveToExcel(formData, filePath);

        await uploadToYandexDisk(filePath, yandexToken, remotePath);

        await bot.sendMessage(chatId, "Спасибо, что записались к нам! В ближайшее время с Вами свяжутся для подтверждения записи.");
        delete userSessions[chatId];
        await sendMainMenu(chatId);
    } else if (data === 'view_requests') {
        const requests = formData.map((req, index) => `${index + 1}. ${req.childName}, ${req.date}, ${req.phone}`).join('\n');
        await bot.sendMessage(chatId, `Текущие заявки:\n\n${requests}`);
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
            const post = msg.text;
            for (const user of registeredUsers) {
                await bot.sendMessage(user.chatId, post);
            }
            await bot.sendMessage(chatId, 'Пост отправлен.');
        })
    }

    // Удаляем отметку "typing..." у сообщения с инлайн-кнопками
    await bot.answerCallbackQuery(query.id);
});

function saveToCRM(formData) {
    console.log("Сохраненные данные:", formData)
}

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

function saveToExcel(formData, filePath) {
    const data = formData.map((entry, index) => ({
        ID: index + 1,
        Адрес: entry.address,
        Дата: entry.date,
        "Имя родителя": entry.parentName,
        "Имя ребенка": entry.childName,
        Пол: entry.gender,
        Возраст: entry.age,
        Запрос: entry.request,
        Телефон: entry.phone
    }));

    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Заявки");

    XLSX.writeFile(workbook, filePath);

    console.log("Данные сохранены в Excel!");
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
        console.error("Ошибка при загрузке на Яндекс.Диск:", error.response?.data)
    }
}

function sendReminders() {
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