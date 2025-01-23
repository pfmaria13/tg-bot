const { handleCallbackQuery } = require('../handlers/CallbackHandler');
const { userSessions } = require('../utils/sessionManager');
const { loadQuestions } = require('../utils/questions');
const { sendDateSelection } = require('../utils/records');
const { adminSessions } = require('../utils/sessionManager');


module.exports.handleCallbackQuery = async (bot, query) => {
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
        await sendDateSelection(bot, chatId, "past");
    } else if (data === 'future_requests') {
        await sendDateSelection(bot, chatId, "future");
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
};