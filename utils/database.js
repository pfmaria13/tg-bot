const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./users.db');

module.exports.initDatabase = () => {
    db.serialize(() => {
        db.run("CREATE TABLE IF NOT EXISTS users (chatId TEXT UNIQUE)");
        db.run("CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT)");
    });
};

module.exports.addUserToDatabase = (chatId) => {
    const formattedChatId = chatId.toString();
    db.run("INSERT OR IGNORE INTO users (chatId) VALUES (?)", [formattedChatId], (err) => {
        if (err) {
            console.error("Ошибка добавления пользователя в базу данных:", err.message);
        }
    });
};

module.exports.updateSetting = (key, value) => {
    db.run("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)", [key, value], (err) => {
        if (err) {
            console.error("Ошибка обновления настройки:", err.message);
        }
    });
};

module.exports.getSetting = (key, callback) => {
    db.get("SELECT value FROM settings WHERE key = ?", [key], (err, row) => {
        if (err) {
            console.error("Ошибка получения настройки:", err.message);
        } else {
            callback(row ? row.value : null);
        }
    });
};

module.exports.getAllUsers = (callback) => {
    db.all("SELECT chatId FROM users", [], (err, rows) => {
        if (err) {
            console.error("Ошибка чтения пользователей из базы данных:", err.message);
        } else {
            callback(rows);
        }
    });
};