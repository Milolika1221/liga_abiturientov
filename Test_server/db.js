require('dotenv').config();
const { Pool } = require('pg');
const crypto = require('crypto');

// Подключение БД
const db = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Проверка подключения
db.connect((err, client, release) => {
    if (err) {
        return console.error('Ошибка подключения к БД:', err.stack);
    }
    console.log('Успешное подключение к БД');
    release();
});

// Функция генерации токена для подтверждения аккаунта в VK
const generateToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Функция генерации пароля
const generatePassword = () => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
        const randomIndex = crypto.randomInt(0, charset.length);
        password += charset[randomIndex];
    }
    console.log('Сгенерированный пароль:', password);
    return password;
};

// Функция безопасного хеширования пароля
const hashPassword = (password) => {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return { salt, hash };
};

// Функция проверки пароля
const verifyPassword = (password, salt, hash) => {
    const hashVerify = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return hash === hashVerify;
};

module.exports = {
    db,
    generateToken,
    generatePassword,
    hashPassword,
    verifyPassword
};