const fs = require('fs');
const XLSX = require('xlsx');
const axios = require('axios');
const { yandexToken, filePath, remotePath } = require('../config');

module.exports.saveToExcel = (formData, filePath, chatId) => {
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
};

module.exports.uploadToYandexDisk = async (filePath, yandexToken, remotePath) => {
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
};