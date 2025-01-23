const fs = require('fs');
const XLSX = require('xlsx');
const moment = require('moment');
const { filePath } = require('../config');
const { bot } = require('../index');

module.exports.showActiveRecords = async (chatId) => {
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
};

module.exports.showPastRecords = async (bot, chatId) => {
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
};

module.exports.sendDateSelection = async (bot, chatId, type) => {
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
    );

    await bot.sendMessage(chatId, `Выберите дату для просмотра ${type === "past" ? "прошедших" : "будущих"} заявок.`, {
        reply_markup: { inline_keyboard: buttons }
    });
};