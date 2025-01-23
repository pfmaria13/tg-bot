const { generateUpcomingSundays } = require('../utils/dateUtils');
const { validatePhoneNumber, formatPhoneNumber } = require('../utils/validation');
const { saveToExcel, uploadToYandexDisk } = require('../utils/fileUtils');

module.exports.handleStep = async (chatId, text, session) => {
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
};

module.exports.sendPreviousStep = async (chatId, session) => {
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
};