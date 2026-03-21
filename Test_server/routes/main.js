const express = require('express');
const router = express.Router();
const { db, generateToken, hashPassword, verifyPassword } = require('../db');

// Регистрация
router.post('/registration', async (req, res) => {
    const {
        lastName, firstName, middleName,
        email, birthDate, graduationYear, courseClass,
        password,
        // Поля родителя
        parentLastName, parentFirstName, parentMiddleName, parentPhone
    } = req.body;

    try {
        const fullName = `${lastName || ''} ${firstName || ''} ${middleName || ''}`.replace(/\s+/g, ' ').trim();

        // Преобразуем дату рождения из формата ДД.ММ.ГГГГ в YYYY-MM-DD для БД
        let isoBirthDate = birthDate;
        if (birthDate && birthDate.includes('.')) {
            const [day, month, year] = birthDate.split('.');
            isoBirthDate = `${year}-${month}-${day}`;
        }

        // Вычисляем возраст пользователя
        const birth = new Date(isoBirthDate);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
            age--;
        }

        // Логин-заглушка потом надо заменить его на ID из VK
        const tempLogin = `id_${Date.now()}_${Math.floor(Math.random() * 10000)}`;

        const { salt, hash } = hashPassword(password);
        const dbPassword = `${salt}:${hash}`;
        const token = generateToken();

        await db.query('BEGIN');

        const userQuery = `
            INSERT INTO users (
                login, password, full_name, email, birth_date, 
                graduation_year, class_course, token, last_session_time
            ) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) 
            RETURNING user_id, token
        `;
        const userValues = [
            tempLogin,
            dbPassword,
            fullName,
            email || null,
            isoBirthDate,
            graduationYear ? parseInt(graduationYear) : null,
            courseClass ? parseInt(courseClass) : null,
            token
        ];

        const newUser = await db.query(userQuery, userValues);
        const userId = newUser.rows[0].user_id;

        // Если несовершеннолетний — записываем данные родителя
        if (age < 18) {

            if (!parentLastName || !parentFirstName || !parentMiddleName || !parentPhone) {
                return res.status(400).json({ status: "bad", message: "Для несовершеннолетних необходимо заполнить данные родителя" });
            }
            const parentFullName = `${parentLastName || ''} ${parentFirstName || ''} ${parentMiddleName || ''}`.replace(/\s+/g, ' ').trim();

            const parentQuery = `
                INSERT INTO parents (user_id, full_name, phone_number) 
                VALUES ($1, $2, $3)
            `;
            await db.query(parentQuery, [userId, parentFullName, parentPhone]);
        }

        await db.query('COMMIT');

        res.status(201).json({
            status: "yea",
            userId: userId,
            token: newUser.rows[0].token,
            tempLogin: tempLogin
        });

    } catch (err) {
        // Если произошла любая ошибка, откатываем все изменения
        await db.query('ROLLBACK');
        console.error('Ошибка при регистрации:', err.message);

        // Обработка ошибки, если email уже есть в базе
        if (err.code === '23505' && err.constraint === 'users_email_key') {
            return res.status(400).json({ status: "bad", message: "Пользователь с таким email уже зарегистрирован" });
        }

        res.status(400).json({ status: "bad", message: "Ошибка при регистрации пользователя" });
    }
});

// Авторизация
router.post('/login', async (req, res) => {
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
router.get('/categories', async (req, res) => {
    try {
        const categories = await db.query('SELECT * FROM event_categories');
        res.json(categories.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Отправка данных о новом документе
router.post('/documents', async (req, res) => {
    const requestUserId = req.headers['x-user-id'];
    const { document_name, category_id, file_path, received_date } = req.body;

    if (!requestUserId) return res.status(401).json({ status: "bad", message: "Не авторизован" });
    if (!received_date) return res.status(400).json({ status: "bad", message: "Необходимо указать дату выдачи документа (received_date)" });

    try {
        const newDoc = await db.query(
            'INSERT INTO documents (document_name, status, category_id, file_path, user_id, received_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING document_id',
            [document_name, 'На рассмотрении', category_id, file_path, requestUserId, received_date]
        );
        res.status(201).json({ status: "yea", documentId: newDoc.rows[0].document_id });
    } catch (err) {
        res.status(500).json({ status: "bad", message: err.message });
    }
});

// Редактирование документа (только владелец, статус "На рассмотрении")
router.patch('/documents/:id', async (req, res) => {
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
router.delete('/documents/:id', async (req, res) => {
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
router.get('/leaderboard', async (req, res) => {
    try {
        const leaderboard = await db.query(`
            SELECT u.user_id, u.full_name, u.class_course,
                   COALESCE(SUM(user_cat_points.capped_points), 0) AS total_points
            FROM users u
                     LEFT JOIN (
                SELECT d.user_id,
                       LEAST(SUM(d.points), c.max_points) AS capped_points
                FROM documents d
                         JOIN event_categories c ON d.category_id = c.category_id
                WHERE d.status = 'Одобрено'
                  AND d.received_date >= CURRENT_DATE - INTERVAL '3 years'
                GROUP BY d.user_id, d.category_id, c.max_points
            ) AS user_cat_points ON u.user_id = user_cat_points.user_id
            WHERE u.is_admin = false AND u.is_moderator = false
            GROUP BY u.user_id, u.full_name, u.class_course
            ORDER BY total_points DESC
        `);
        res.json(leaderboard.rows);
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ status: "bad", message: "Ошибка при формировании рейтинга" });
    }
});

// Получение профиля
router.get('/profile/:id', async (req, res) => {
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

// Получение профиля по login
router.get('/profile-by-login/:login', async (req, res) => {
    try {
        const user = await db.query(
            'SELECT full_name, phone_number, birth_date, class_course, graduation_year, registration_date, token, is_verified, user_id, login FROM users WHERE login = $1',
            [req.params.login]
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
router.patch('/profile/:id', async (req, res) => {
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
router.get('/profile/:id/total-points', async (req, res) => {
    const userId = req.params.id;
    try {
        const result = await db.query(`
            SELECT COALESCE(SUM(capped_points), 0) AS total_points
            FROM (
                     SELECT LEAST(SUM(d.points), c.max_points) AS capped_points
                     FROM documents d
                              JOIN event_categories c ON d.category_id = c.category_id
                     WHERE d.user_id = $1
                       AND d.status = 'Одобрено'
                       AND d.received_date >= CURRENT_DATE - INTERVAL '3 years'
                     GROUP BY d.category_id, c.max_points
                 ) AS cat_points
        `, [userId]);
        res.json({ user_id: parseInt(userId), total_points: parseInt(result.rows[0].total_points) });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Получение списка документов конкретного пользователя
router.get('/user-documents/:userId', async (req, res) => {
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

// Проверка токена верификации аккаунта
router.post('/verify-token', async (req, res) => {
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
            'UPDATE users SET token = NULL, is_verified = true WHERE token = $1 RETURNING user_id, full_name, login',
            [token]
        );

        res.json({
            status: "yea",
            message: "Токен действителен",
            user_id: updateResult.rows[0].user_id,
            full_name: updateResult.rows[0].full_name,
            login: updateResult.rows[0].login 
        });

    } catch (err) {
        console.error('Ошибка при проверке токена:', err);
        res.status(500).json({
            status: "bad",
            message: "Ошибка сервера при проверке токена"
        });
    }
});

// Обновление login пользователя
router.post('/update-login/:user_id', async (req, res) => {
    try {
        const { user_id } = req.params;
        const { login } = req.body;

        if (!login) {
            return res.status(400).json({
                status: "bad",
                message: "Login не указан"
            });
        }

        const result = await db.query(
            'UPDATE users SET login = $1 WHERE user_id = $2 RETURNING user_id, login',
            [login, user_id]
        );

        if (result.rows.length > 0) {
            res.json({
                status: "yea",
                message: "Login обновлен успешно",
                user_id: result.rows[0].user_id,
                login: result.rows[0].login
            });
        } else {
            res.status(404).json({
                status: "bad",
                message: "Пользователь не найден"
            });
        }
    } catch (err) {
        console.error('Ошибка при обновлении login:', err);
        res.status(500).json({
            status: "bad",
            message: "Ошибка сервера при обновлении login"
        });
    }
});

module.exports = router;