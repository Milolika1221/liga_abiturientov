require('dotenv').config();
const { db, encryptData, decryptData } = require('./db');

async function migrate() {
    const users = await db.query('SELECT user_id, phone_number FROM users');
    for (const user of users.rows) {
        if (user.phone_number) {
            let plainPhone;
            try {
                plainPhone = decryptData(user.phone_number);
            } catch (err) {
                plainPhone = user.phone_number;
            }
            const cleanPhone = plainPhone.replace(/\D/g, '');
            if (!cleanPhone || cleanPhone.length !== 11) {
                console.warn(`Неверный телефон для пользователя ${user.user_id}: "${plainPhone}"`);
                continue;
            }
            const encrypted = encryptData(cleanPhone);
            await db.query('UPDATE users SET phone_number = $1 WHERE user_id = $2', [encrypted, user.user_id]);
            console.log(`Обновлённый пользователь ${user.user_id}`);
        }
    }

    // Обновляем родителей
    const parents = await db.query('SELECT parent_id, phone_number FROM parents');
    for (const parent of parents.rows) {
        if (parent.phone_number) {
            let plainPhone;
            try {
                plainPhone = decryptData(parent.phone_number);
            } catch (err) {
                plainPhone = parent.phone_number;
            }
            const cleanPhone = plainPhone.replace(/\D/g, '');
            if (!cleanPhone || cleanPhone.length !== 11) {
                console.warn(`Неверный телефон для пользователя ${parent.parent_id}: "${plainPhone}"`);
                continue;
            }
            const encrypted = encryptData(cleanPhone);
            await db.query('UPDATE parents SET phone_number = $1 WHERE parent_id = $2', [encrypted, parent.parent_id]);
            console.log(`Обновлённый родитель ${parent.parent_id}`);
        }
    }
    console.log('Миграция завершена');
    process.exit(0);
}

migrate().catch(console.error);