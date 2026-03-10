require('dotenv').config();
const express = require('express');
const cors = require('cors');
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

// Иницилизация фреймворка Express
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Подключение к БД
db.connect((err, client, release) => {
    if (err) {
        return console.error('Ошибка подключения к БД:', err.stack);
    }
    console.log('Успешное подключение к БД');
    release();
});

const checkAdminAccess = async (req, res, next) => {
    // Ищем ID пользователя, который пытается сделать запрос
    const requestUserId = req.headers['x-user-id'];

    if (!requestUserId) {
        return res.status(401).json({ status: "bad", message: "Отказано в доступе: не передан ID пользователя" });
    }

    try {
        // Проверяем в БД, является ли этот пользователь админом
        const user = await db.query('SELECT is_admin FROM users WHERE user_id = $1', [requestUserId]);

        if (user.rows.length === 0) {
            return res.status(404).json({ status: "bad", message: "Пользователь с таким ID не найден" });
        }

        if (user.rows[0].is_admin === true) {
            next();
        } else {
            res.status(403).json({ status: "bad", message: "Доступ запрещен: требуются права администратора" });
        }
    } catch (err) {
        console.error("Ошибка при проверке прав:", err.message);
        res.status(500).json({ status: "bad", message: "Внутренняя ошибка сервера при проверке прав" });
    }
};

// Функция генерации токена для подтверждения аккаунта в VK
const generateToken = () => {
    return crypto.randomBytes(32).toString('hex');
};

// Регистрация
app.post('/registration', async (req, res) => {
    const { username, password, full_name, phone } = req.body;
    try {
        const token = generateToken();
        const newUser = await db.query(
            'INSERT INTO users (login, password, full_name, phone_number, token) VALUES ($1, $2, $3, $4, $5) RETURNING user_id, token',
            [username, password, full_name, phone, token]
        );
        res.status(201).json({ 
            status: "yea", 
            userId: newUser.rows[0].user_id,
            token: newUser.rows[0].token
        });
    } catch (err) {
        console.error(err.message);
        res.status(400).json({ status: "bad", message: "Ошибка при записи в БД" });
    }
});

// Авторизация
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const user = await db.query(
            'SELECT user_id, full_name, is_admin FROM users WHERE login = $1 AND password = $2',
            [username, password]
        );

        if (user.rows.length > 0) {
            res.json({ status: "yea", user: user.rows[0] });
        } else {
            res.status(401).json({ status: "bad", message: "Пользователь не найден" });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Ошибка сервера при получении данных");
    }
});

// Получение списка категорий мероприятий
app.get('/categories', async (req, res) => {
    try {
        const categories = await db.query('SELECT * FROM event_categories');
        res.json(categories.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Отправка данных о новом документе
app.post('/documents', async (req, res) => {
    const { user_id, document_name, category_id } = req.body; // Используем category_id вместо description
    try {
        const newDoc = await db.query(
            'INSERT INTO documents (document_name, status, category_id) VALUES ($1, $2, $3) RETURNING document_id',
            [document_name, 'На рассмотрении', category_id || null] // Статус по умолчанию из вашей концепции [cite: 11, 12]
        );

        const docId = newDoc.rows[0].document_id;

        await db.query(
            'INSERT INTO user_documents (user_id, document_id) VALUES ($1, $2)',
            [user_id, docId]
        );

        res.status(201).json({ status: "yea", documentId: docId });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ status: "bad", message: err.message });
    }
});

// Получение профиля
app.get('/profile/:id', async (req, res) => {
    try {
        const user = await db.query(
            'SELECT full_name, phone_number, birth_date, class_course, registration_date, token FROM users WHERE user_id = $1',
            [req.params.id]
        );
        if (user.rows.length > 0) {
            res.json(user.rows[0]);
        } else {
            res.status(404).json({ error: "Пользователь не найден" });
        }
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Получение списка документов конкретного пользователя
app.get('/user-documents/:userId', async (req, res) => {
    try {
        const docs = await db.query(
            `SELECT d.document_id, d.document_name, d.status, d.points
             FROM documents d
                      JOIN user_documents ud ON d.document_id = ud.document_id
             WHERE ud.user_id = $1`,
            [req.params.userId]
        );
        res.json(docs.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// Получение списка всех абитуриентов
app.get('/admin/users', checkAdminAccess, async (req, res) => {
    try {
        const users = await db.query(
            `SELECT user_id, full_name, phone_number, birth_date, class_course, login, registration_date
             FROM users
             WHERE is_admin = false
             ORDER BY registration_date DESC`
        );
        res.json(users.rows);
    } catch (err) {
        res.status(500).json({ error: "Ошибка при получении списка пользователей" });
    }
});

// Изменение статуса документа и начисление баллов
app.patch('/admin/documents/:id', checkAdminAccess, async (req, res) => {
    const documentId = req.params.id;
    const { status, points } = req.body;

    const allowedStatuses = ['На рассмотрении', 'Одобрено', 'Отклонено'];
    if (status && !allowedStatuses.includes(status)) {
        return res.status(400).json({
            status: "bad",
            message: "Недопустимый статус. Используйте: 'На рассмотрении', 'Одобрено', 'Отклонено'"
        });
    }

    try {
        const updatedDoc = await db.query(
            `UPDATE documents
             SET status = COALESCE($1, status),
                 points = COALESCE($2, points)
             WHERE document_id = $3
             RETURNING document_id, document_name, status, points`,
            [status, points, documentId]
        );

        if (updatedDoc.rows.length === 0) {
            return res.status(404).json({ status: "bad", message: "Документ не найден" });
        }

        res.json({ status: "yea", message: "Документ обновлен", document: updatedDoc.rows[0] });
    } catch (err) {
        res.status(500).json({ status: "bad", message: "Ошибка при обновлении документа" });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});