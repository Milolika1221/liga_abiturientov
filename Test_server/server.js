require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const crypto = require('crypto');
const cron = require('node-cron');

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

const checkModeratorAccess = async (req, res, next) => {
    const requestUserId = req.headers['x-user-id'];

    if (!requestUserId) {
        return res.status(401).json({ status: "bad", message: "Отказано в доступе: не передан ID пользователя" });
    }

    try {
        // Проверяем в БД, является ли этот пользователь модератором
        const user = await db.query('SELECT is_moderator FROM users WHERE user_id = $1', [requestUserId]);

        if (user.rows.length === 0) {
            return res.status(404).json({ status: "bad", message: "Пользователь с таким ID не найден" });
        }

        if (user.rows[0].is_moderator === true) {
            next();
        } else {
            res.status(403).json({ status: "bad", message: "Доступ запрещен: требуются права модератора" });
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

// Функция проверки лимита баллов
async function checkPointsLimit(documentId, newPoints) {
    const checkQuery = await db.query(
        `SELECT c.max_points, c.category_name, d.user_id, d.category_id,
                (SELECT COALESCE(SUM(points), 0) FROM documents d2
                 WHERE d2.user_id = d.user_id AND d2.category_id = d.category_id
                   AND d2.status = 'Одобрено' AND d2.document_id != $1) as current_sum
         FROM documents d
                  JOIN event_categories c ON d.category_id = c.category_id
         WHERE d.document_id = $1`,
        [documentId]
    );

    if (checkQuery.rows.length === 0) {
        throw new Error("Документ или категория не найдены");
    }

    const { max_points, current_sum, category_name } = checkQuery.rows[0];
    const totalAfterUpdate = parseInt(current_sum) + parseInt(newPoints);

    if (totalAfterUpdate > max_points) {
        return {
            allowed: false,
            message: `Превышен лимит в категории "${category_name}". Максимум: ${max_points}, уже начислено: ${current_sum}. Вы пытаетесь добавить еще ${newPoints}.`
        };
    }

    return { allowed: true };
}

// Регистрация
app.post('/registration', async (req, res) => {
    const { username, password, full_name, phone } = req.body;
    try {
        const token = generateToken();

        const { salt, hash } = hashPassword(password);
        const dbPassword = `${salt}:${hash}`;

        const newUser = await db.query(
            'INSERT INTO users (login, password, full_name, phone_number, token, last_session_time) VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING user_id, token',
            [username, dbPassword, full_name, phone, token]
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
        const userResult = await db.query(
            'SELECT user_id, full_name, password, is_admin, is_moderator FROM users WHERE login = $1',
            [username]
        );

        if (userResult.rows.length === 0) {
            return res.status(401).json({ status: "bad", message: "Пользователь не найден" });
        }

        const user = userResult.rows[0];
        let isPasswordValid = false;

        if (user.password.includes(':')) {
            const [salt, hash] = user.password.split(':');
            isPasswordValid = verifyPassword(password, salt, hash);
        } else {
            isPasswordValid = (password === user.password);
        }

        if (isPasswordValid) {
            delete user.password;
            res.json({ status: "yea", user: user });
        } else {
            res.status(401).json({ status: "bad", message: "Неверный пароль" });
        }
    } catch (err) {
        console.error(err.message);
        res.status(500).send("Ошибка сервера при авторизации");
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
    const requestUserId = req.headers['x-user-id'];
    const { document_name, category_id, file_path } = req.body;

    if (!requestUserId) return res.status(401).json({ status: "bad", message: "Не авторизован" });

    try {
        const newDoc = await db.query(
            'INSERT INTO documents (document_name, status, category_id, file_path, user_id) VALUES ($1, $2, $3, $4, $5) RETURNING document_id',
            [document_name, 'На рассмотрении', category_id, file_path, requestUserId]
        );
        res.status(201).json({ status: "yea", documentId: newDoc.rows[0].document_id });
    } catch (err) {
        res.status(500).json({ status: "bad", message: err.message });
    }
});

// Редактирование документа (только владелец, статус "На рассмотрении")
app.patch('/documents/:id', async (req, res) => {
    const documentId = req.params.id;
    const requestUserId = req.headers['x-user-id'];
    const { document_name, category_id, file_path } = req.body;

    if (!requestUserId) {
        return res.status(401).json({ status: "bad", message: "Не авторизован" });
    }

    try {
        const docCheck = await db.query(
            'SELECT user_id, status FROM documents WHERE document_id = $1',
            [documentId]
        );
        if (docCheck.rows.length === 0) {
            return res.status(404).json({ status: "bad", message: "Документ не найден" });
        }
        const doc = docCheck.rows[0];
        if (doc.user_id != requestUserId) {
            return res.status(403).json({ status: "bad", message: "Нет прав на редактирование этого документа" });
        }
        if (doc.status !== 'На рассмотрении') {
            return res.status(400).json({ status: "bad", message: "Можно редактировать только документы со статусом 'На рассмотрении'" });
        }

        const updatedDoc = await db.query(
            `UPDATE documents
             SET document_name = COALESCE($1, document_name),
                 category_id = COALESCE($2, category_id),
                 file_path = COALESCE($3, file_path)
             WHERE document_id = $4
             RETURNING document_id, document_name, category_id, file_path, status`,
            [document_name, category_id, file_path, documentId]
        );

        res.json({ status: "yea", document: updatedDoc.rows[0] });
    } catch (err) {
        res.status(500).json({ status: "bad", message: err.message });
    }
});

// Удаление документа (владелец, если статус "На рассмотрении", или админ)
app.delete('/documents/:id', async (req, res) => {
    const documentId = req.params.id;
    const requestUserId = req.headers['x-user-id'];

    if (!requestUserId) {
        return res.status(401).json({ status: "bad", message: "Не авторизован" });
    }

    try {
        const docCheck = await db.query(
            `SELECT d.user_id, d.status, u.is_admin
             FROM documents d
             JOIN users u ON u.user_id = d.user_id
             WHERE d.document_id = $1`,
            [documentId]
        );
        if (docCheck.rows.length === 0) {
            return res.status(404).json({ status: "bad", message: "Документ не найден" });
        }
        const { user_id, status, is_admin } = docCheck.rows[0];

        // Проверяем права
        const isOwner = (user_id == requestUserId);
        const isAdmin = await db.query('SELECT is_admin FROM users WHERE user_id = $1', [requestUserId])
            .then(res => res.rows[0]?.is_admin || false);

        if (!isOwner && !isAdmin) {
            return res.status(403).json({ status: "bad", message: "Нет прав на удаление этого документа" });
        }
        if (isOwner && status !== 'На рассмотрении' && !isAdmin) {
            return res.status(400).json({ status: "bad", message: "Владелец может удалять только документы со статусом 'На рассмотрении'" });
        }

        await db.query('DELETE FROM documents WHERE document_id = $1', [documentId]);
        res.json({ status: "yea", message: "Документ удалён" });
    } catch (err) {
        res.status(500).json({ status: "bad", message: err.message });
    }
});

// Показывает рейтинг таблица по сумме баллов
app.get('/leaderboard', async (req, res) => {
    try {
        const leaderboard = await db.query(
            `SELECT u.user_id, u.full_name, u.class_course,
                    COALESCE(SUM(d.points), 0) as total_points
             FROM users u
                      LEFT JOIN documents d ON u.user_id = d.user_id AND d.status = 'Одобрено'
             WHERE u.is_admin = false AND u.is_moderator = false
             GROUP BY u.user_id, u.full_name, u.class_course
             ORDER BY total_points DESC`
        );
        res.json(leaderboard.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ status: "bad", message: "Ошибка при формировании рейтинга" });
    }
});

// Получение профиля
app.get('/profile/:id', async (req, res) => {
    try {
        const user = await db.query(
            'SELECT full_name, phone_number, birth_date, class_course, graduation_year, registration_date, token, is_verified FROM users WHERE user_id = $1',
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

// Редактирование профиля пользователя
app.patch('/profile/:id', async (req, res) => {
    const userId = req.params.id;
    const requestUserId = req.headers['x-user-id']; // Получаем ID того, кто делает запрос

    // ЗАЩИТА: Проверяем, что ID совпадают
    if (!requestUserId || requestUserId !== userId) {
        return res.status(403).json({
            status: "bad",
            message: "Доступ запрещен: нельзя редактировать чужой профиль"
        });
    }

    const { full_name, phone_number, birth_date, class_course } = req.body;

    try {
        const result = await db.query(
            `UPDATE users 
             SET full_name = COALESCE($1, full_name),
                 phone_number = COALESCE($2, phone_number),
                 birth_date = COALESCE($3, birth_date),
                 class_course = COALESCE($4, class_course)
             WHERE user_id = $5 AND is_admin = false AND is_moderator = false
             RETURNING user_id, full_name, phone_number, birth_date, class_course`,
            [full_name, phone_number, birth_date, class_course, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ status: "bad", message: "Пользователь не найден" });
        }

        res.json({
            status: "yea",
            message: "Профиль успешно обновлен",
            user: result.rows[0]
        });
    } catch (err) {
        res.status(500).json({ status: "bad", message: err.message });
    }
});

// Сумма подтверждённых баллов пользователя (публично)
app.get('/profile/:id/total-points', async (req, res) => {
    const userId = req.params.id;
    try {
        const result = await db.query(`
            SELECT COALESCE(SUM(points), 0) as total_points
            FROM documents
            WHERE user_id = $1 AND status = 'Одобрено'
        `, [userId]);
        res.json({ user_id: parseInt(userId), total_points: result.rows[0].total_points });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Получение списка документов конкретного пользователя
app.get('/user-documents/:userId', async (req, res) => {
    try {
        const docs = await db.query(
            `SELECT document_id, document_name, status, points, comment
             FROM documents
             WHERE user_id = $1`,
            [req.params.userId]
        );
        res.json(docs.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Получение списка всех модераторов
app.get('/admin/moderators', checkAdminAccess, async (req, res) => {
    try {
        const moderators = await db.query(
            `SELECT u.user_id, u.full_name, u.email, u.login, u.position_id, p.position_name, u.registration_date 
             FROM users u
             LEFT JOIN positions p ON u.position_id = p.position_id
             WHERE u.is_moderator = true
             ORDER BY u.registration_date DESC`
        );
        res.json(moderators.rows);
    } catch (err) {
        res.status(500).json({ error: "Ошибка при получении списка модераторов" });
    }
});

// Добавление нового модератора
app.post('/admin/moderators', checkAdminAccess, async (req, res) => {
    const { login, full_name, email, position_id } = req.body;

    try {
        const rawPassword = generatePassword();
        const { salt, hash } = hashPassword(rawPassword);
        const dbPassword = `${salt}:${hash}`; // Склеиваем для сохранения в одну колонку

        const newMod = await db.query(
            `INSERT INTO users (login, password, full_name, email, position_id, is_moderator) 
             VALUES ($1, $2, $3, $4, $5, true) 
             RETURNING user_id, login, full_name, email`,
            [login, dbPassword, full_name, email, position_id]
        );

        res.status(201).json({
            status: "yea",
            message: "Модератор успешно создан",
            user: newMod.rows[0],
            generated_password: rawPassword
        });
    } catch (err) {
        console.error(err.message);
        if (err.code === '23505') { // Код ошибки уникальности в Postgres
            return res.status(400).json({ status: "bad", message: "Пользователь с таким login или email уже существует" });
        }
        res.status(500).json({ status: "bad", message: "Ошибка при создании модератора" });
    }
});

// Редактирование информации о модераторе
app.patch('/admin/moderators/:id', checkAdminAccess, async (req, res) => {
    const modId = req.params.id;
    const { full_name, email, position_id } = req.body;

    try {
        const updatedMod = await db.query(
            `UPDATE users
             SET full_name = COALESCE($1, full_name),
                 email = COALESCE($2, email),
                 position_id = COALESCE($3, position_id)
             WHERE user_id = $4 AND is_moderator = true
             RETURNING user_id, full_name, email, position_id`,
            [full_name, email, position_id, modId]
        );

        if (updatedMod.rows.length === 0) {
            return res.status(404).json({ status: "bad", message: "Модератор не найден" });
        }
        res.json({ status: "yea", message: "Данные модератора обновлены", user: updatedMod.rows[0] });
    } catch (err) {
        res.status(500).json({ status: "bad", message: "Ошибка при обновлении модератора" });
    }
});

// Удаление модератора
app.delete('/admin/moderators/:id', checkAdminAccess, async (req, res) => {
    const modId = req.params.id;
    try {
        const deletedMod = await db.query(
            'DELETE FROM users WHERE user_id = $1 AND is_moderator = true RETURNING user_id',
            [modId]
        );
        if (deletedMod.rows.length === 0) {
            return res.status(404).json({ status: "bad", message: "Модератор не найден" });
        }
        res.json({ status: "yea", message: "Модератор успешно удален" });
    } catch (err) {
        res.status(500).json({ status: "bad", message: "Ошибка при удалении модератора" });
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

// Админ подтверждает аккаунт пользователя
app.patch('/admin/users/:id/verify', checkAdminAccess, async (req, res) => {
    const userId = req.params.id;
    const { is_verified } = req.body; // true или false

    try {
        const result = await db.query(
            'UPDATE users SET is_verified = $1 WHERE user_id = $2 RETURNING user_id, full_name, is_verified',
            [is_verified, userId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ status: "bad", message: "Пользователь не найден" });
        }

        res.json({
            status: "yea",
            message: is_verified ? "Аккаунт подтвержден" : "Подтверждение отозвано",
            user: result.rows[0]
        });
    } catch (err) {
        res.status(500).json({ status: "bad", message: err.message });
    }
});

// Изменение статуса документа и начисление баллов
app.patch('/admin/documents/:id', checkAdminAccess, async (req, res) => {
    const documentId = req.params.id;
    const { status, points, comment } = req.body;

    try {
        if (status === 'Одобрено' && points > 0) {
            const limitCheck = await checkPointsLimit(documentId, points);
            if (!limitCheck.allowed) {
                return res.status(400).json({ status: "bad", message: limitCheck.message });
            }
        }

        const updatedDoc = await db.query(
            `UPDATE documents
             SET status = COALESCE($1, status),
                 points = COALESCE($2, points),
                 comment = COALESCE($3, comment)
             WHERE document_id = $4
             RETURNING document_id, document_name, status, points, comment`,
            [status, points, comment, documentId]
        );

        res.json({ status: "yea", message: "Документ обработан администратором", document: updatedDoc.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ status: "bad", message: err.message });
    }
});

// Добавление новой категории наград
app.post('/admin/categories', checkAdminAccess, async (req, res) => {
    const { category_name, max_points } = req.body;
    try {
        const newCategory = await db.query(
            'INSERT INTO event_categories (category_name, max_points) VALUES ($1, $2) RETURNING *',
            [category_name, max_points]
        );
        res.status(201).json({ status: "yea", message: "Категория добавлена", category: newCategory.rows[0] });
    } catch (err) {
        res.status(500).json({ status: "bad", message: err.message });
    }
});

// Редактирование существующей категории
app.patch('/admin/categories/:id', checkAdminAccess, async (req, res) => {
    const { id } = req.params;
    const { category_name, max_points } = req.body;
    try {
        const updated = await db.query(
            `UPDATE event_categories 
             SET category_name = COALESCE($1, category_name), 
                 max_points = COALESCE($2, max_points) 
             WHERE category_id = $3 RETURNING *`,
            [category_name, max_points, id]
        );
        if (updated.rows.length === 0) return res.status(404).json({ status: "bad", message: "Категория не найдена" });
        res.json({ status: "yea", message: "Категория обновлена", category: updated.rows[0] });
    } catch (err) {
        res.status(500).json({ status: "bad", message: err.message });
    }
});

// Удаление категории
app.delete('/admin/categories/:id', checkAdminAccess, async (req, res) => {
    try {
        await db.query('DELETE FROM event_categories WHERE category_id = $1', [req.params.id]);
        res.json({ status: "yea", message: "Категория удалена" });
    } catch (err) {
        res.status(500).json({ status: "bad", message: "Нельзя удалить категорию, если она используется в документах" });
    }
});

// Админ добавляет награду напрямую с комментарием
app.post('/admin/documents/manual', checkAdminAccess, async (req, res) => {
    const { user_id, document_name, category_id, points, comment } = req.body;

    try {
        const checkQuery = await db.query(
            `SELECT c.max_points, c.category_name,
                    (SELECT COALESCE(SUM(d.points), 0) FROM documents d
                     WHERE d.user_id = $1 AND d.category_id = $2
                       AND d.status = 'Одобрено') as current_sum
             FROM event_categories c
             WHERE c.category_id = $2`,
            [user_id, category_id]
        );
        if (checkQuery.rows.length === 0) {
            return res.status(400).json({
                status: "bad",
                message: "Указанная категория не существует"
            });
        }

        if (checkQuery.rows.length > 0) {
            const { max_points, current_sum, category_name } = checkQuery.rows[0];
            const totalAfterUpdate = parseInt(current_sum) + parseInt(points);

            if (totalAfterUpdate > max_points) {
                return res.status(400).json({
                    status: "bad",
                    message: `Превышен лимит в категории "${category_name}". Максимум: ${max_points}, уже начислено: ${current_sum}. Вы пытаетесь добавить еще ${points}.`
                });
            }
        }


        const newDoc = await db.query(
            'INSERT INTO documents (document_name, status, category_id, points, comment, user_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING document_id',
            [document_name, 'Одобрено', category_id, points, comment || null, user_id]
        );

        res.status(201).json({
            status: "yea",
            message: "Документ успешно добавлен",
            documentId: newDoc.rows[0].document_id
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ status: "bad", message: err.message });
    }
});

// Получение всех документов, ожидающих проверки
app.get('/moderator/documents/pending', checkModeratorAccess, async (req, res) => {
    try {
        const docs = await db.query(
            `SELECT d.document_id, d.document_name, d.status, d.category_id,
                    d.user_id, u.full_name as student_name, d.upload_date
             FROM documents d
                      JOIN users u ON d.user_id = u.user_id
             WHERE d.status = 'На рассмотрении'
             ORDER BY d.upload_date ASC`
        );
        res.json(docs.rows);
    } catch (err) {
        res.status(500).json({ error: "Ошибка при получении документов на проверку" });
    }
});

// Одобрение/Отклонение документа и начисление баллов
app.patch('/moderator/documents/:id', checkModeratorAccess, async (req, res) => {
    const documentId = req.params.id;
    const { status, points, comment } = req.body;

    const allowedStatuses = ['На рассмотрении', 'Одобрено', 'Отклонено'];
    if (status && !allowedStatuses.includes(status)) {
        return res.status(400).json({ status: "bad", message: "Недопустимый статус" });
    }

    try {
        if (status === 'Одобрено' && points > 0) {
            const limitCheck = await checkPointsLimit(documentId, points);
            if (!limitCheck.allowed) {
                return res.status(400).json({ status: "bad", message: limitCheck.message });
            }
        }

        const updatedDoc = await db.query(
            `UPDATE documents
             SET status = COALESCE($1, status),
                 points = COALESCE($2, points),
                 comment = COALESCE($3, comment)
             WHERE document_id = $4
             RETURNING document_id, document_name, status, points, comment`,
            [status, points, comment, documentId]
        );

        if (updatedDoc.rows.length === 0) {
            return res.status(404).json({ status: "bad", message: "Документ не найден" });
        }

        res.json({ status: "yea", message: "Документ обработан модератором", document: updatedDoc.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ status: "bad", message: err.message });
    }
});

// Проверка токена верификации аккаунта
app.post('/verify-token', async (req, res) => {
    const { token } = req.body;

    if (!token) {
        return res.status(400).json({
            status: "bad",
            message: "Токен не предоставлен"
        });
    }

    try {
        // Проверяем время действия токена
        const result = await db.query(
            'SELECT user_id, full_name, last_session_time FROM users WHERE token = $1',
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                status: "bad",
                message: "Неверный или уже использованный токен"
            });
        }

        // Проверяем, не истекло ли время действия токена (1 час)
        const tokenIssuedAt = new Date(result.rows[0].last_session_time);
        const now = new Date();
        const timeDiff = now - tokenIssuedAt;
        const MINUTES = 60;
        const SECONDS_IN_MINUTE = 60;
        const MILLISECONDS_IN_SECOND = 1000;
        const time = MINUTES * SECONDS_IN_MINUTE * MILLISECONDS_IN_SECOND;

        if (timeDiff > time) {
            await db.query('UPDATE users SET token = NULL WHERE token = $1', [token]);
            return res.status(410).json({
                status: "bad",
                message: "Время действия токена истекло"
            });
        }

        const updateResult = await db.query(
            'UPDATE users SET token = NULL, is_verified = true WHERE token = $1 RETURNING user_id, full_name',
            [token]
        );

        res.json({
            status: "yea",
            message: "Токен действителен",
            user_id: updateResult.rows[0].user_id,
            full_name: updateResult.rows[0].full_name
        });

    } catch (err) {
        console.error('Ошибка при проверке токена:', err);
        res.status(500).json({
            status: "bad",
            message: "Ошибка сервера при проверке токена"
        });
    }
});

// Функция автоматического обновления классов/курсов пользователей
async function updateUsersClasses() {
    try {
        console.log('Запуск обновления классов/курсов пользователей...');
        
        const currentYear = new Date().getFullYear();
        console.log(`Текущий год: ${currentYear}`);
        
        // Получаем всех пользователей с классами и годами выпуска
        const users = await db.query(
            `SELECT user_id, class_course, graduation_year 
             FROM users 
             WHERE class_course IS NOT NULL 
             AND graduation_year IS NOT NULL
             AND is_admin = false 
             AND is_moderator = false`
        );
        
        console.log(`Найдено пользователей для обновления: ${users.rows.length}`);
        
        if (users.rows.length > 0) {
            console.log('Пользователи:', users.rows);
        }
        
        let updatedCount = 0;
        
        for (const user of users.rows) {
            const { user_id, class_course, graduation_year } = user;
            
            console.log(`Обработка пользователя ${user_id}: класс = ${class_course}, год выпуска = ${graduation_year}`);
            
            const yearsUntilGraduation = graduation_year - currentYear;      
            console.log(`Лет до выпуска: ${yearsUntilGraduation}`);
            
            let newClassCourse;
            
            if (yearsUntilGraduation <= 0) { 
                newClassCourse = null; 
            } else if (class_course >= 1 && class_course <= 4 && graduation_year < currentYear) { 
                console.log(`Пользователь ${user_id}: на СПО, но год выпуска прошел, класс не меняется`);
                newClassCourse = class_course;
            } else if (class_course >= 1 && class_course <= 10) {
                // Школа (1-10 классы)
                newClassCourse = class_course + 1; 
            } else if (class_course === 11) {
                console.log(`Пользователь ${user_id}: 11 класс, год выпуска не был изменен`);
                newClassCourse = class_course;
            } else if (class_course >= 1 && class_course <= 3) {
                // СПО (1-3 курсы)
                const expectedCourse = class_course + 1;
                const maxCourseForYear = 5 - yearsUntilGraduation; 
                newClassCourse = Math.min(expectedCourse, maxCourseForYear);
            } else if (class_course === 4) {
                // Если 4 курс СПО - не повышаем
                newClassCourse = class_course;
            } else {
                // Для всех остальных случаев - не меняем
                newClassCourse = class_course;
            }
            
            console.log(`Новый класс: ${newClassCourse}`);
            
            // Обновляем класс, если он изменился
            if (newClassCourse !== null && newClassCourse !== class_course) {
                await db.query(
                    'UPDATE users SET class_course = $1 WHERE user_id = $2',
                    [newClassCourse, user_id]
                );
                updatedCount++;
                console.log(`Пользователь ${user_id}: класс ${class_course} -> ${newClassCourse} (год выпуска: ${graduation_year})`);
            } else {
                console.log(`Пользователь ${user_id}: класс не изменился (${class_course})`);
            }
        }
        
        console.log(`Обновление завершено. Обновлено ${updatedCount} пользователей`);
        
    } catch (error) {
        console.error('Ошибка при обновлении классов пользователей:', error);
    }
}

// CRON-задача для обновления классов (ежегодно 1 сентября в 00:00)
cron.schedule('0 0 1 9 *', () => { 
    //1 параметр - часы, 2 параметр - минуты, 3 параметр - дата (число)
    // 4 параметр - число месяца, 5 параметр - день недели (* - любой)
    console.log('CRON: Ежегодное обновление классов 1 сентября');
    updateUsersClasses();
});

// Тестовый CRON-задача для обновления классов (каждую минуту)
cron.schedule('* * * * *', () => {
    console.log('CRON: Запуск планового обновления классов');
    updateUsersClasses();
});

// Тестовый эндпоинт для принудительного обновления классов
app.post('/admin/update-classes', checkAdminAccess, async (req, res) => {
    try {
        await updateUsersClasses();
        res.json({ 
            status: "yea", 
            message: "Обновление классов завершено" 
        });
    } catch (error) {
        console.error('Ошибка при принудительном обновлении классов:', error);
        res.status(500).json({ 
            status: "bad", 
            message: "Ошибка при обновлении классов" 
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Сервер запущен на http://localhost:${PORT}`);
});