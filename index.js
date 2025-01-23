require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const token = process.env.TOKEN;
const bot = new TelegramBot(token, { polling: true });

const { handleMessage } = require('./handlers/messageHandler');
const { handleCallbackQuery } = require('./handlers/callbackHandler');

bot.on('message', (msg) => handleMessage(bot, msg));
bot.on('callback_query', (query) => handleCallbackQuery(bot, query));

require('./utils/database').initDatabase();
require('./utils/scheduler').initScheduler(bot);

module.exports = { bot };