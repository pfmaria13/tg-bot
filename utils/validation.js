module.exports.validatePhoneNumber = (phone) => {
    return (/^\+7\d{10}$/).test(phone) || (/^8\d{10}$/).test(phone);
};

module.exports.formatPhoneNumber = (phone) => {
    if (phone.startsWith("8")) {
        return "+7" + phone.slice(1);
    }
    return phone;
};