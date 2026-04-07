const express = require('express');
const router = express.Router();
const { db, generatePassword, hashPassword } = require('../db');

// Middleware проверки прав администратора
const checkAdminAccess = async (req, res, next) => {
    const requestUserId = req.headers['x-user-id'];

    if (!requestUserId) {
        return res.status(401).json({ status: "bad", message: "Отказано в доступе: не передан ID пользователя" });
    }

    try {
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

// Middleware проверки прав модератора
const checkModeratorAccess = async (req, res, next) => {
    const requestUserId = req.headers['x-user-id'];

    if (!requestUserId) {
        return res.status(401).json({ status: "bad", message: "Отказано в доступе: не передан ID пользователя" });
    }

    try {
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

// ==================== Администратор ====================

// Получение списка всех модераторов
router.get('/admin/moderators', checkAdminAccess, async (req, res) => {
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
router.post('/admin/moderators', checkAdminAccess, async (req, res) => {
    const { login, full_name, email, position_id, password } = req.body;

    if (!password || password.trim().length < 6) {
        return res.status(400).json({ status: "bad", message: "Пароль обязателен и должен содержать минимум 6 символов" });
    }

    try {
        const { salt, hash } = hashPassword(password);
        const dbPassword = `${salt}:${hash}`;

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
            generated_password: password   // возвращаем тот же пароль для информации
        });
    } catch (err) {
        console.error(err.message);
        if (err.code === '23505') {
            return res.status(400).json({ status: "bad", message: "Пользователь с таким login или email уже существует" });
        }
        res.status(500).json({ status: "bad", message: "Ошибка при создании модератора" });
    }
});

// Редактирование информации о модераторе
router.patch('/admin/moderators/:id', checkAdminAccess, async (req, res) => {
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
router.delete('/admin/moderators/:id', checkAdminAccess, async (req, res) => {
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
router.get('/admin/users', checkAdminAccess, async (req, res) => {
    try {
        const users = await db.query(
            `SELECT user_id, full_name, phone_number, birth_date, class_course, login, registration_date, email
             FROM users
             WHERE is_admin = false AND is_moderator = false
             ORDER BY full_name ASC`
        );
        res.json(users.rows);
    } catch (err) {
        res.status(500).json({ error: "Ошибка при получении списка пользователей" });
    }
});

// Админ подтверждает аккаунт пользователя
router.patch('/admin/users/:id/verify', checkAdminAccess, async (req, res) => {
    const userId = req.params.id;
    const { is_verified } = req.body;

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

// Получение всех документов
router.get('/admin/documents', checkAdminAccess, async (req, res) => {
    try {
        const docs = await db.query(
            `SELECT document_id, document_name, status, points, received_date 
             FROM documents 
             ORDER BY upload_date DESC`
        );
        res.json(docs.rows);
    } catch (err) {
        res.status(500).json({ error: "Ошибка при получении документов" });
    }
});

// Изменение статуса документа и начисление баллов
router.patch('/admin/documents/:id', checkAdminAccess, async (req, res) => {
    const documentId = req.params.id;
    const { status, points, comment } = req.body;

    try {
        const updatedDoc = await db.query(
            `UPDATE documents
             SET status = COALESCE($1, status),
                 points = COALESCE($2, points),
                 comment = COALESCE($3, comment)
             WHERE document_id = $4
             RETURNING document_id, document_name, status, points, comment`,
            [status, points, comment, documentId]
        );

        // Обновляем таблицу лидеров для всех подключенных клиентов
        if (global.broadcastLeaderboardUpdate) {
            global.broadcastLeaderboardUpdate();
        }

        res.json({ status: "yea", message: "Документ обработан администратором", document: updatedDoc.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ status: "bad", message: err.message });
    }
});

// Добавление новой категории наград
router.post('/admin/categories', checkAdminAccess, async (req, res) => {
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
router.patch('/admin/categories/:id', checkAdminAccess, async (req, res) => {
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
router.delete('/admin/categories/:id', checkAdminAccess, async (req, res) => {
    try {
        await db.query('DELETE FROM event_categories WHERE category_id = $1', [req.params.id]);
        res.json({ status: "yea", message: "Категория удалена" });
    } catch (err) {
        res.status(500).json({ status: "bad", message: "Нельзя удалить категорию, если она используется в документах" });
    }
});

// Админ добавляет награду напрямую с комментарием
router.post('/admin/documents/manual', checkAdminAccess, async (req, res) => {
    const { user_id, document_name, category_id, points, comment, received_date } = req.body;

    if (!received_date) return res.status(400).json({ status: "bad", message: "Необходимо указать дату выдачи документа (received_date)" });

    try {
        const newDoc = await db.query(
            'INSERT INTO documents (document_name, status, category_id, points, comment, user_id, received_date) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING document_id',
            [document_name, 'Одобрено', category_id, points, comment || null, user_id, received_date]
        );

        res.status(201).json({
            status: "yea",
            message: "Документ успешно добавлен (без ограничений лимита)",
            documentId: newDoc.rows[0].document_id
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ status: "bad", message: err.message });
    }
});

// Получение статистики для админ-панели (количество пользователей)
router.get('/admin/stats', checkAdminAccess, async (req, res) => {
    try {
        const usersCount = await db.query('SELECT COUNT(*) FROM users WHERE is_admin = false AND is_moderator = false');

        // онлайн пользователей считаем тех, чья сессия обновлялась за последние 3 минуты
        const onlineCount = await db.query("SELECT COUNT(*) FROM users WHERE last_session_time > NOW() - INTERVAL '3 minutes' AND is_admin = false AND is_moderator = false");

        res.json({
            registeredUsers: parseInt(usersCount.rows[0].count),
            onlineUsers: parseInt(onlineCount.rows[0].count)
        });
    } catch (err) {
        console.error('Ошибка при получении статистики:', err);
        res.status(500).json({ error: "Ошибка при получении статистики" });
    }
});

// Получение списка мероприятий
router.get('/admin/events', checkAdminAccess, async (req, res) => {
    try {
        const events = await db.query('SELECT event_id, event_name, event_date, points FROM events ORDER BY event_name ASC');
        res.json(events.rows);
    } catch (err) {
        res.status(500).json({ error: "Ошибка при получении мероприятий" });
    }
});

// Создание нового мероприятия
router.post('/admin/events', checkAdminAccess, async (req, res) => {
    const { event_name, event_date, category_id, points } = req.body;

    if (!event_name || !event_date || !category_id) {
        return res.status(400).json({ status: "bad", message: "Необходимо указать название, дату и категорию мероприятия" });
    }

    try {
        const newEvent = await db.query(
            'INSERT INTO events (event_name, event_date, category_id, points) VALUES ($1, $2, $3, $4) RETURNING event_id',
            [event_name, event_date, category_id, points || 0]
        );
        res.status(201).json({ status: "yea", message: "Мероприятие создано", eventId: newEvent.rows[0].event_id });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ status: "bad", message: err.message });
    }
});

// Поиск пользователя по ФИО и номеру телефона
router.post('/admin/find-user', checkAdminAccess, async (req, res) => {
    const { full_name, phone_number } = req.body;

    if (!full_name || !phone_number) {
        return res.status(400).json({ status: "bad", message: "Необходимо указать ФИО и номер телефона" });
    }

    try {
        const cleanPhone = phone_number.replace(/\D/g, '');

        const user = await db.query(
            `SELECT user_id, full_name, phone_number, email 
             FROM users 
             WHERE full_name ILIKE $1 AND REPLACE(phone_number, '-', '') LIKE $2
             LIMIT 1`,
            [`%${full_name}%`, `%${cleanPhone}%`]
        );

        if (user.rows.length === 0) {
            return res.status(404).json({ status: "bad", message: "Пользователь не найден. Проверьте ФИО и телефон." });
        }

        res.json({ status: "yea", user: user.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: "bad", message: "Ошибка поиска пользователя" });
    }
});

// Получение документов, не прошедших модерацию (для админа)
router.get('/admin/documents/pending', checkAdminAccess, async (req, res) => {
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
        console.error('Ошибка при получении документов на проверку:', err);
        res.status(500).json({ error: "Ошибка при получении документов на проверку" });
    }
});

// ==================== Модератор ====================

// Получение всех документов, ожидающих проверки
router.get('/moderator/documents/pending', checkModeratorAccess, async (req, res) => {
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
router.patch('/moderator/documents/:id', checkModeratorAccess, async (req, res) => {
    const documentId = req.params.id;
    const { status, points, comment, received_date } = req.body;

    const allowedStatuses = ['На рассмотрении', 'Одобрено', 'Отклонено'];
    if (status && !allowedStatuses.includes(status)) {
        return res.status(400).json({ status: "bad", message: "Недопустимый статус" });
    }

    try {
        const updatedDoc = await db.query(
            `UPDATE documents
             SET status = COALESCE($1, status),
                 points = COALESCE($2, points),
                 comment = COALESCE($3, comment),
                 received_date = COALESCE($4, received_date)
             WHERE document_id = $5
             RETURNING document_id, document_name, status, points, comment, received_date`,
            [status, points, comment, received_date, documentId]
        );

        if (updatedDoc.rows.length === 0) {
            return res.status(404).json({ status: "bad", message: "Документ не найден" });
        }

        // Обновляем таблицу лидеров для всех подключенных клиентов
        if (global.broadcastLeaderboardUpdate) {
            global.broadcastLeaderboardUpdate();
        }

        res.json({ status: "yea", message: "Документ обработан", document: updatedDoc.rows[0] });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ status: "bad", message: err.message });
    }
});

// Middleware для проверки прав администратора или модератора
const checkAdminOrModeratorAccess = async (req, res, next) => {
    const requestUserId = req.headers['x-user-id'];

    if (!requestUserId) {
        return res.status(401).json({ status: "bad", message: "Отказано в доступе: не передан ID пользователя" });
    }

    try {
        const user = await db.query('SELECT is_admin, is_moderator FROM users WHERE user_id = $1', [requestUserId]);

        if (user.rows.length === 0) {
            return res.status(404).json({ status: "bad", message: "Пользователь с таким ID не найден" });
        }

        if (user.rows[0].is_admin === true || user.rows[0].is_moderator === true) {
            next();
        } else {
            res.status(403).json({ status: "bad", message: "Доступ запрещен: требуются права администратора или модератора" });
        }
    } catch (err) {
        console.error("Ошибка при проверке прав:", err.message);
        res.status(500).json({ status: "bad", message: "Внутренняя ошибка сервера при проверке прав" });
    }
};

// Создание пользователя администратором или модератором (без личного кабинета)
router.post('/admin/users', checkAdminOrModeratorAccess, async (req, res) => {
    const { full_name, phone_number, email, birth_date, class_course, school, graduation_year } = req.body;

    // Валидация обязательных полей
    if (!full_name || !full_name.trim()) {
        return res.status(400).json({ status: "bad", message: "ФИО обязательно для заполнения" });
    }

    if (!phone_number || !phone_number.trim()) {
        return res.status(400).json({ status: "bad", message: "Номер телефона обязателен для заполнения" });
    }

    const cleanPhone = phone_number.replace(/\D/g, '');
    if (cleanPhone.length !== 11) {
        return res.status(400).json({ status: "bad", message: "Номер телефона должен содержать 11 цифр" });
    }

    try {
        // Проверяем, существует ли пользователь с таким телефоном
        const existingUser = await db.query(
            `SELECT user_id, full_name FROM users 
             WHERE REGEXP_REPLACE(phone_number, '\\D', '', 'g') = $1`,
            [cleanPhone]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                status: "bad",
                message: "Пользователь с таким номером телефона уже существует",
                existing_user: existingUser.rows[0]
            });
        }

        // Проверяем email если указан
        if (email && email.trim()) {
            const existingEmail = await db.query(
                'SELECT user_id FROM users WHERE email = $1',
                [email.trim()]
            );
            if (existingEmail.rows.length > 0) {
                return res.status(409).json({
                    status: "bad",
                    message: "Пользователь с таким email уже существует"
                });
            }
        }

        let isoBirthDate = birth_date;
        if (birth_date && birth_date.includes('.')) {
            const [day, month, year] = birth_date.split('.');
            isoBirthDate = `${year}-${month}-${day}`;
        }

        // Создание пользователя без логина и пароля (без личного кабинета)
        const newUser = await db.query(
            `INSERT INTO users (
                full_name, phone_number, email, birth_date, 
                class_course, school, graduation_year, 
                created_by_admin, is_verified
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, true, true)
            RETURNING user_id, full_name, phone_number, email, birth_date, 
                      class_course, school, graduation_year, created_by_admin`,
            [
                full_name.trim(),
                phone_number.trim(),
                email && email.trim() ? email.trim() : null,
                isoBirthDate || null,
                class_course ? parseInt(class_course) : null,
                school && school.trim() ? school.trim() : null,
                graduation_year ? parseInt(graduation_year) : null
            ]
        );

        res.status(201).json({
            status: "yea",
            message: "Пользователь успешно создан",
            user: newUser.rows[0]
        });

    } catch (err) {
        console.error("Ошибка при создании пользователя:", err.message);
        res.status(500).json({ status: "bad", message: "Ошибка при создании пользователя: " + err.message });
    }
});

module.exports = router;