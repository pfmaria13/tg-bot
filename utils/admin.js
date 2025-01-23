module.exports.sendAdminPanel = async (bot, chatId) => {
    const buttons = [
        [{ text: 'Посмотреть заявки', callback_data: 'view_requests' }],
        [{ text: 'Настроить дайджест', callback_data: 'digest_settings' }],
        [{ text: 'Отправить пост', callback_data: 'send_post' }],
        [{ text: 'Редактировать вопросы', callback_data: 'edit_questions' }],
        [{ text: 'Удалить дату из расписания', callback_data: 'delete_date' }]
    ];

    if (chatId.toString() === process.env.SUPERADMIN_ID) {
        buttons.push([{ text: "Управление администраторами", callback_data: "manage_admins" }]);
    }

    await bot.sendMessage(chatId, "Добро пожаловать в админ-панель. Выберите действие:", {
        reply_markup: { inline_keyboard: buttons }
    });
};