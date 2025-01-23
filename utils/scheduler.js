const schedule = require('node-schedule');
const moment = require('moment');
const { bot } = require('../index');
const { filePath } = require('../config');
const { getAllUsers } = require('./database');

module.exports.initScheduler = () => {
    // Напоминания
    schedule.scheduleJob('*/30 * * * *', async () => {
        if (!fs.existsSync(filePath)) {
            console.log("Файл с данными не найден.");
            return;
        }

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

    // Дайджест
    schedule.scheduleJob('0 12 1 * *', async () => {
        const digestContent = "Доброго дня! В нашем телеграм-канале мы постоянно публикуем полезные посты. Вот наша подборка статей и материалов за месяц:";
        getAllUsers((rows) => {
            for (const row of rows) {
                try {
                    bot.sendMessage(row.chatId, digestContent);
                } catch (err) {
                    console.error(`Ошибка отправки сообщения пользователю ${row.chatId}:`, err.message);
                }
            }
        });
    });
};