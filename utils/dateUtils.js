const moment = require('moment');
const { blockedDates } = require('../config');

module.exports.generateUpcomingSundays = (count) => {
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
};