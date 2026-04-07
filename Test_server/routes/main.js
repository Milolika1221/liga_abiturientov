const express = require('express');
const router = express.Router();
const { db, generateToken, hashPassword, verifyPassword } = require('../db');
const { sendPasswordResetEmail, verifyConnection } = require('../config/smtp');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp');

// Настройка multer для загрузки файлов
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Статические файлы для uploads
router.use('/uploads', express.static(uploadsDir));

// Папка для миниатюр
const thumbnailsDir = path.join(__dirname, '..', 'thumbnails');
if (!fs.existsSync(thumbnailsDir)) {
    fs.mkdirSync(thumbnailsDir, { recursive: true });
}

// Статические файлы для миниатюр
router.use('/thumbnails', express.static(thumbnailsDir));

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, 'document-' + uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Поддерживаемые форматы: JPEG, JPG, PNG, PDF'));
        }
    }
});

// Регистрация
router.post('/registration', async (req, res) => {
    const {
        lastName, firstName, middleName,
        phoneNumber, email, birthDate, graduationYear, courseClass,
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

        // Логин-заглушка, но если пользователь пришел из ВК, используем VK ID
        let tempLogin;
        if (req.body.vk_user_id) {
            tempLogin = `vk_${req.body.vk_user_id}`;
        } else {
            tempLogin = `id_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        }

        const { salt, hash } = hashPassword(password);
        const dbPassword = `${salt}:${hash}`;
        const token = generateToken();

        await db.query('BEGIN');

        // Ищем существующего пользователя по телефону
        let userId = null;
        let isExistingUser = false;

        if (phoneNumber && phoneNumber.trim()) {
            const cleanPhone = phoneNumber.replace(/\D/g, '');
            const existingUserResult = await db.query(
                `SELECT user_id, full_name, login, password, email, birth_date, 
                        graduation_year, class_course, created_by_admin
                 FROM users 
                 WHERE REGEXP_REPLACE(phone_number, '\\D', '', 'g') = $1`,
                [cleanPhone]
            );

            if (existingUserResult.rows.length > 0) {
                const existingUser = existingUserResult.rows[0];

                // Если у пользователя уже есть личный кабинет
                if (existingUser.login && existingUser.password) {
                    await db.query('ROLLBACK');
                    return res.status(409).json({
                        status: "bad",
                        message: "Пользователь с таким номером телефона уже зарегистрирован. Используйте вход в систему."
                    });
                }

                // Пользователя создал админ или модер. Обновляем его данные, добавляя личный кабинет
                isExistingUser = true;
                userId = existingUser.user_id;

                // Обновляем существующего пользователя
                await db.query(
                    `UPDATE users 
                     SET login = $1, 
                         password = $2, 
                         full_name = COALESCE($3, full_name),
                         email = COALESCE($4, email),
                         birth_date = COALESCE($5, birth_date),
                         graduation_year = COALESCE($6, graduation_year),
                         class_course = COALESCE($7, class_course),
                         token = $8,
                         last_session_time = NOW(),
                         created_by_admin = false
                     WHERE user_id = $9`,
                    [
                        tempLogin,
                        dbPassword,
                        fullName,
                        email || existingUser.email,
                        isoBirthDate || existingUser.birth_date,
                        graduationYear ? parseInt(graduationYear) : existingUser.graduation_year,
                        courseClass ? parseInt(courseClass) : existingUser.class_course,
                        token,
                        userId
                    ]
                );
            }
        }

        // Если пользователь не найден по телефону - создаем нового
        if (!isExistingUser) {
            const userQuery = `
                INSERT INTO users (
                    login, password, full_name, phone_number, email, birth_date, 
                    graduation_year, class_course, token, last_session_time
                ) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW()) 
                RETURNING user_id, token
            `;
            const userValues = [
                tempLogin,
                dbPassword,
                fullName,
                phoneNumber || null,
                email || null,
                isoBirthDate,
                graduationYear ? parseInt(graduationYear) : null,
                courseClass ? parseInt(courseClass) : null,
                token
            ];

            const newUser = await db.query(userQuery, userValues);
            userId = newUser.rows[0].user_id;
        }

        // Если несовершеннолетний — записываем данные родителя
        if (age < 18 && !isExistingUser) {
            if (!parentLastName || !parentFirstName || !parentMiddleName || !parentPhone) {
                await db.query('ROLLBACK');
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

        // Обновляем таблицу лидеров для всех подключенных клиентов (новый пользователь)
        if (global.broadcastLeaderboardUpdate) {
            global.broadcastLeaderboardUpdate();
        }

        res.status(201).json({
            status: "yea",
            userId: userId,
            token: token,
            tempLogin: tempLogin,
            is_existing_user: isExistingUser,
            message: isExistingUser
                ? "Личный кабинет успешно создан и связан с существующей записью"
                : "Регистрация успешно завершена"
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
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ 
            status: "bad", 
            message: "Email/телефон и пароль обязательны" 
        });
    }
    
    try {
        // Определяем, что введено: email или номер телефона
        const isEmail = /\S+@\S+\.\S+/.test(email);
        const isPhone = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]*$/.test(email);
        
        let userResult;
        
        if (isEmail) {
            // Поиск по email
            userResult = await db.query(
                'SELECT user_id, full_name, password, is_admin, is_moderator, email, login FROM users WHERE email = $1',
                [email]
            );
        } else if (isPhone) {
            // Поиск по номеру телефона, нормализуем номер перед поиском
            const cleanPhone = email.replace(/\D/g, '');
            userResult = await db.query(
                `SELECT user_id, full_name, password, is_admin, is_moderator, email, login 
                 FROM users 
                 WHERE REGEXP_REPLACE(phone_number, '\\D', '', 'g') = $1`,
                [cleanPhone]
            );
        } else {
            return res.status(400).json({ 
                status: "bad", 
                field: "email", 
                message: "Введите корректный email или номер телефона" 
            });
        }

        if (userResult.rows.length === 0) {
            return res.status(401).json({ 
                status: "bad", 
                field: "email", 
                message: "Пользователь не найден" 
            });
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
            // Обновляем время последней сессии
            await db.query('UPDATE users SET last_session_time = NOW() WHERE user_id = $1', [user.user_id]);
            delete user.password;
            res.json({ status: "yea", user: user, sessionTime: new Date().toISOString() });
        } else {
            res.status(401).json({ status: "bad", field: "password", message: "Неверный пароль" });
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

// Отправка данных о новом документе с файлом
router.post('/documents/upload', upload.single('file'), async (req, res) => {
    const requestUserId = req.headers['x-user-id'];
    const { document_name, category_id, received_date } = req.body;

    if (!requestUserId) return res.status(401).json({ status: "bad", message: "Не авторизован" });
    if (!received_date) return res.status(400).json({ status: "bad", message: "Необходимо указать дату выдачи документа (received_date)" });
    if (!req.file) return res.status(400).json({ status: "bad", message: "Необходимо загрузить файл" });

    try {
        const file_path = `/uploads/${req.file.filename}`;
        // Преобразуем строку "null" или пустую строку в SQL NULL
        const catId = (category_id === 'null' || category_id === '' || category_id === undefined) 
            ? null 
            : parseInt(category_id);
        
        const newDoc = await db.query(
            'INSERT INTO documents (document_name, status, category_id, file_path, user_id, received_date) VALUES ($1, $2, $3, $4, $5, $6) RETURNING document_id',
            [document_name, 'На рассмотрении', catId, file_path, requestUserId, received_date]
        );
        
        // Обновляем таблицу лидеров для всех подключенных клиентов
        if (global.broadcastLeaderboardUpdate) {
            global.broadcastLeaderboardUpdate();
        }
        
        res.status(201).json({ 
            status: "yea", 
            documentId: newDoc.rows[0].document_id, 
            file_path: file_path
        });
    } catch (err) {
        // Удаляем загруженный файл если ошибка в БД
        if (req.file) {
            fs.unlink(req.file.path, (unlinkErr) => {
                if (unlinkErr) console.error('Ошибка удаления файла:', unlinkErr);
            });
        }
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
        
        // Обновляем таблицу лидеров для всех подключенных клиентов
        if (global.broadcastLeaderboardUpdate) {
            global.broadcastLeaderboardUpdate();
        }
        
        res.json({ status: "yea", message: "Документ удалён" });
    } catch (err) {
        res.status(500).json({ status: "bad", message: err.message });
    }
});

// Показывает рейтинг таблица по сумме баллов
router.get('/leaderboard', async (req, res) => {
    try {
        const leaderboard = await db.query(`
            SELECT u.user_id, u.full_name, u.class_course, u.school,
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
            GROUP BY u.user_id, u.full_name, u.class_course, u.school
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
    const requestUserId = req.headers['x-user-id'];
    const targetUserId = req.params.id;

    if (!requestUserId) {
        return res.status(401).json({ error: "Не авторизован: отсутствует ID пользователя" });
    }

    try {
        if (String(targetUserId) !== String(requestUserId)) {
            const requesterCheck = await db.query(
                'SELECT is_admin, is_moderator FROM users WHERE user_id = $1',
                [requestUserId]
            );
            if (requesterCheck.rows.length === 0 || (!requesterCheck.rows[0].is_admin && !requesterCheck.rows[0].is_moderator)) {
                return res.status(403).json({ error: "Доступ запрещен" });
            }
        }

        const user = await db.query(
            'SELECT full_name, phone_number, birth_date, class_course, graduation_year, registration_date, token, is_verified FROM users WHERE user_id = $1',
            [targetUserId]
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
    const requestUserId = req.headers['x-user-id'];

    if (!requestUserId) {
        return res.status(401).json({ error: "Не авторизован: отсутствует ID пользователя" });
    }

    try {
        const userQuery = await db.query(
            'SELECT full_name, email, phone_number, birth_date, class_course, school, graduation_year, registration_date, token, is_verified, user_id, login FROM users WHERE login = $1',
            [req.params.login]
        );

        if (userQuery.rows.length === 0) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }

        const requestedUser = userQuery.rows[0];

        if (String(requestedUser.user_id) !== String(requestUserId)) {
            const requesterCheck = await db.query(
                'SELECT is_admin, is_moderator FROM users WHERE user_id = $1',
                [requestUserId]
            );

            if (requesterCheck.rows.length === 0 || (!requesterCheck.rows[0].is_admin && !requesterCheck.rows[0].is_moderator)) {
                return res.status(403).json({ error: "Доступ запрещен: нельзя просматривать чужой профиль" });
            }
        }

        res.json(requestedUser);
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

    const { full_name, phone_number, birth_date, class_course, school, email } = req.body;

    try {
        const result = await db.query(
            `UPDATE users
             SET full_name = COALESCE($1, full_name),
                 phone_number = COALESCE($2, phone_number),
                 birth_date = COALESCE($3, birth_date),
                 class_course = COALESCE($4, class_course),
                 school = COALESCE($5, school),
                 email = COALESCE($6, email)
             WHERE user_id = $7 AND is_admin = false AND is_moderator = false
             RETURNING user_id, full_name, phone_number, birth_date, class_course, school, email`,
            [full_name, phone_number, birth_date, class_course, school, email, userId]
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

// Получение документов пользователя
router.get('/user-documents/:userId', async (req, res) => {
    const requestUserId = req.headers['x-user-id'];
    const targetUserId = req.params.userId;

    if (!requestUserId) {
        return res.status(401).json({ error: "Не авторизован" });
    }

    try {
        // Защита: может смотреть либо владелец, либо админ/модератор
        if (String(targetUserId) !== String(requestUserId)) {
            const requesterCheck = await db.query(
                'SELECT is_admin, is_moderator FROM users WHERE user_id = $1',
                [requestUserId]
            );
            if (requesterCheck.rows.length === 0 || (!requesterCheck.rows[0].is_admin && !requesterCheck.rows[0].is_moderator)) {
                return res.status(403).json({ error: "Доступ к чужим документам запрещен" });
            }
        }

        const docs = await db.query(
            `SELECT document_id, document_name, status, points, comment, category_id, file_path
             FROM documents
             WHERE user_id = $1`,
            [targetUserId]
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
            'UPDATE users SET token = NULL, is_verified = true WHERE token = $1 RETURNING user_id, full_name, login, email',
            [token]
        );

        // Отправляем WebSocket уведомление о верификации
        if (global.broadcastUserVerified) {
            global.broadcastUserVerified(updateResult.rows[0].user_id);
        }

        res.json({
            status: "yea",
            message: "Токен действителен",
            user_id: updateResult.rows[0].user_id,
            full_name: updateResult.rows[0].full_name,
            login: updateResult.rows[0].login,
            email: updateResult.rows[0].email
        });

    } catch (err) {
        console.error('Ошибка при проверке токена:', err);
        res.status(500).json({
            status: "bad",
            message: "Ошибка сервера при проверке токена"
        });
    }
});

// Обновление логина пользователя через VK ID
router.post('/update-login-by-vk', async (req, res) => {
    try {
        const { vk_user_id, email } = req.body;

        if (!vk_user_id || !email) {
            return res.status(400).json({
                status: "bad",
                message: "VK User ID и email обязательны"
            });
        }

        // Ищем пользователя по email
        const userResult = await db.query(
            'SELECT user_id, login FROM users WHERE email = $1',
            [email]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                status: "bad",
                message: "Пользователь с таким email не найден"
            });
        }

        const user = userResult.rows[0];
        const newLogin = `vk_${vk_user_id}`;

        // Проверяем, не занят ли уже такой логин другим пользователем
        const existingLoginCheck = await db.query(
            'SELECT user_id FROM users WHERE login = $1 AND user_id != $2',
            [newLogin, user.user_id]
        );

        if (existingLoginCheck.rows.length > 0) {
            // Логин уже занят - возвращаем успех без обновления
            console.log(`Login ${newLogin} already exists for different user, skipping update`);
            return res.json({
                status: "yea",
                message: "Логин уже связан с этим VK аккаунтом",
                newLogin: newLogin,
                skipped: true
            });
        }

        // Обновляем логин
        await db.query(
            'UPDATE users SET login = $1 WHERE user_id = $2',
            [newLogin, user.user_id]
        );

        console.log(`Updated login for user ${user.user_id} from ${user.login} to ${newLogin}`);

        res.json({
            status: "yea",
            message: "Логин успешно обновлен",
            newLogin: newLogin
        });

    } catch (err) {
        console.error('Ошибка при обновлении логина через VK:', err);
        res.status(500).json({
            status: "bad",
            message: "Ошибка сервера при обновлении логина"
        });
    }
});

// Генерация токена верификации для существующего пользователя
router.post('/generate-verification-token', async (req, res) => {
    const requestUserId = req.headers['x-user-id'];
    
    if (!requestUserId) {
        return res.status(401).json({
            status: "bad",
            message: "Не авторизован"
        });
    }
    
    try {
        // Проверяем, существует ли пользователь
        const userResult = await db.query(
            'SELECT user_id, is_verified, email FROM users WHERE user_id = $1',
            [requestUserId]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({
                status: "bad",
                message: "Пользователь не найден"
            });
        }
        
        const user = userResult.rows[0];
        
        // Проверяем, не верифицирован ли уже пользователь
        if (user.is_verified) {
            return res.status(400).json({
                status: "bad",
                message: "Аккаунт уже подтвержден"
            });
        }
        
        // Генерируем новый токен
        const token = generateToken();
        
        // Сохраняем токен и обновляем время сессии
        await db.query(
            'UPDATE users SET token = $1, last_session_time = NOW() WHERE user_id = $2',
            [token, requestUserId]
        );
        
        res.json({
            status: "yea",
            token: token,
            message: "Токен верификации успешно сгенерирован"
        });
        
    } catch (err) {
        console.error('Ошибка генерации токена верификации:', err);
        res.status(500).json({
            status: "bad",
            message: "Ошибка сервера при генерации токена"
        });
    }
});
router.get('/health', async (req, res) => {
    try {
        await db.query('SELECT 1');
        res.status(200).json({ status: 'ok', message: 'Сервер и БД доступны' });
    } catch (err) {
        console.error('Ошибка health check:', err.message);
        res.status(503).json({ status: 'error', message: 'Сервис временно недоступен' });
    }
});

// Запрос на сброс пароля через SMTP
router.post('/request-password-reset', async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ status: "bad", message: "Email обязателен" });
    }
    
    try {
        // Проверяем существование пользователя в нашей БД
        const userResult = await db.query(
            'SELECT user_id, email, full_name FROM users WHERE email = $1',
            [email]
        );
        
        if (userResult.rows.length === 0) {
            return res.status(404).json({ 
                status: "bad", 
                message: "Пользователь с таким email не найден. Проверьте правильность ввода или зарегистрируйтесь." 
            });
        }
        
        const user = userResult.rows[0];
        
        // Генерируем токен для сброса пароля
        const resetToken = generateToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // Токен действителен 1 час
        
        // Сохраняем токен в таблице users
        await db.query(
            'UPDATE users SET reset_token = $1, reset_token_expires_at = $2 WHERE user_id = $3',
            [resetToken, expiresAt, user.user_id]
        );
        
        // Отправляем email
        await sendPasswordResetEmail(email, resetToken, user.full_name);
        
        res.json({
            status: "yea",
            message: "Инструкции по восстановлению пароля отправлены на email"
        });
        
    } catch (err) {
        console.error('Ошибка запроса сброса пароля:', err);
        
        // Специфичные ошибки SMTP
        if (err.code === 'EAUTH') {
            return res.status(500).json({ 
                status: "bad", 
                message: "Ошибка аутентификации SMTP. Проверьте настройки почты." 
            });
        }
        if (err.code === 'ECONNREFUSED' || err.code === 'ETIMEDOUT') {
            return res.status(500).json({ 
                status: "bad", 
                message: "Не удалось подключиться к почтовому серверу." 
            });
        }
        
        res.status(500).json({ status: "bad", message: "Ошибка сервера при отправке письма" });
    }
});

// Подтверждение сброса пароля через токен
router.post('/confirm-password-reset', async (req, res) => {
    const { token, newPassword } = req.body;
    
    if (!token || !newPassword) {
        return res.status(400).json({ 
            status: "bad", 
            message: "Токен и новый пароль обязательны" 
        });
    }
    
    if (newPassword.length < 6) {
        return res.status(400).json({ 
            status: "bad", 
            message: "Пароль должен быть минимум 6 символов" 
        });
    }
    
    try {
        // Проверяем токен в таблице users
        const tokenResult = await db.query(
            'SELECT user_id, email, reset_token_expires_at FROM users WHERE reset_token = $1',
            [token]
        );
        
        if (tokenResult.rows.length === 0) {
            return res.status(400).json({ 
                status: "bad", 
                message: "Неверный или устаревший токен сброса пароля" 
            });
        }
        
        const { user_id, email, reset_token_expires_at } = tokenResult.rows[0];
        
        // Проверяем срок действия токена
        if (new Date() > new Date(reset_token_expires_at)) {
            // Удаляем просроченный токен
            await db.query('UPDATE users SET reset_token = NULL, reset_token_expires_at = NULL WHERE user_id = $1', [user_id]);
            return res.status(410).json({ 
                status: "bad", 
                message: "Срок действия ссылки для сброса пароля истек. Запросите новую." 
            });
        }
        
        // Хешируем новый пароль
        const { salt, hash } = hashPassword(newPassword);
        const dbPassword = `${salt}:${hash}`;
        
        // Обновляем пароль и удаляем токен
        await db.query(
            'UPDATE users SET password = $1, reset_token = NULL, reset_token_expires_at = NULL WHERE user_id = $2',
            [dbPassword, user_id]
        );
        
        console.log(`Password reset successful for ${email}`);
        
        res.json({
            status: "yea",
            message: "Пароль успешно изменен"
        });
        
    } catch (err) {
        console.error('Ошибка подтверждения сброса пароля:', err);
        res.status(500).json({ status: "bad", message: "Ошибка сервера" });
    }
});

// Запрос на сброс пароля через VK-бота
router.post('/request-password-reset-vk', async (req, res) => {
    console.log('VK Password Reset Request:', req.body);
    const { identifier } = req.body; // identifier может быть email или номер телефона
    
    if (!identifier) {
        console.log('VK Password Reset Error: No identifier provided');
        return res.status(400).json({ 
            status: "bad", 
            message: "Email или номер телефона обязателен" 
        });
    }
    
    console.log('VK Password Reset: Processing identifier:', identifier);
    
    try {
        // Определяем, что введено: email или номер телефона
        const isEmail = /\S+@\S+\.\S+/.test(identifier);
        const isPhone = /^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]*$/.test(identifier);
        
        console.log('VK Password Reset: Validation results - isEmail:', isEmail, 'isPhone:', isPhone);
        
        let userResult;
        
        if (isEmail) {
            // Поиск по email
            console.log('VK Password Reset: Searching user by email:', identifier);
            userResult = await db.query(
                'SELECT user_id, email, full_name FROM users WHERE email = $1',
                [identifier]
            );
        } else if (isPhone) {
            // Поиск по номеру телефона
            console.log('VK Password Reset: Searching user by phone:', identifier);
            userResult = await db.query(
                'SELECT user_id, email, full_name FROM users WHERE phone_number = $1',
                [identifier]
            );
        } else {
            console.log('VK Password Reset: Invalid identifier format');
            return res.status(400).json({ 
                status: "bad", 
                message: "Введите корректный email или номер телефона" 
            });
        }
        
        console.log('VK Password Reset: User search result count:', userResult.rows.length);
        
        if (userResult.rows.length === 0) {
            console.log('VK Password Reset: User not found');
            return res.status(404).json({ 
                status: "bad", 
                message: "Пользователь не найден" 
            });
        }
        
        const user = userResult.rows[0];
        console.log('VK Password Reset: User found:', user);
        
        // Генерируем токен для сброса пароля
        const resetToken = generateToken();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 1); // Токен действителен 1 час
        
        console.log('VK Password Reset: Generated token:', resetToken);
        
        // Сохраняем токен в таблице users
        console.log('VK Password Reset: Saving token to database...');
        await db.query(
            'UPDATE users SET reset_token = $1, reset_token_expires_at = $2 WHERE user_id = $3',
            [resetToken, expiresAt, user.user_id]
        );
        console.log('VK Password Reset: Token saved successfully');
        
        // Формируем ссылку для восстановления пароля
        const resetUrl = `https://stoically-noncaloric-rowan.ngrok-free.dev/reset-password?token=${resetToken}`;
        console.log('VK Password Reset: Generated reset URL:', resetUrl);
        
        const response = {
            status: "yea",
            message: "Ссылка для восстановления пароля сгенерирована",
            resetUrl: resetUrl,
            token: resetToken,
            userName: user.full_name
        };
        
        console.log('VK Password Reset: Sending response:', response);
        res.json(response);
        
    } catch (err) {
        console.error('Ошибка запроса сброса пароля через VK:', err);
        res.status(500).json({ status: "bad", message: "Ошибка сервера" });
    }
});

// Генерация миниатюры с использованием sharp
router.get('/thumbnail', async (req, res) => {
    const { file, width = 300, height = 300 } = req.query;

    if (!file) {
        return res.status(400).json({ status: "bad", message: "Не указан путь к файлу" });
    }

    try {
        const filePath = path.join(__dirname, '..', file);

        // Проверяем существование файла
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ status: "bad", message: "Файл не найден" });
        }

        // Только для изображений генерируем миниатюру
        const ext = path.extname(file).toLowerCase();
        if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
            return res.status(400).json({ status: "bad", message: "Формат не поддерживается для превью" });
        }

        // Создаем имя для миниатюры на основе хеша параметров
        const thumbName = `${path.basename(file, ext)}_${width}x${height}${ext}`;
        const thumbPath = path.join(thumbnailsDir, thumbName);

        // Если миниатюра уже существует, возвращаем её
        if (fs.existsSync(thumbPath)) {
            return res.sendFile(thumbPath);
        }

        // Генерируем миниатюру с помощью sharp
        await sharp(filePath)
            .resize(parseInt(width), parseInt(height), {
                fit: 'inside',
                withoutEnlargement: true
            })
            .toFile(thumbPath);

        res.sendFile(thumbPath);

    } catch (err) {
        console.error('Ошибка генерации миниатюры:', err);
        res.status(500).json({ status: "bad", message: "Ошибка генерации миниатюры" });
    }
});

// Middleware для проверки сессии
const checkSession = async (req, res, next) => {
    const userId = req.headers['x-user-id'];

    if (!userId) {
        return res.status(401).json({ status: "bad", message: "Не авторизован" });
    }

    try {
        const result = await db.query(
            'SELECT last_session_time FROM users WHERE user_id = $1',
            [userId]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ status: "bad", message: "Пользователь не найден" });
        }
        
        const lastSession = new Date(result.rows[0].last_session_time);
        const now = new Date();
        const diffMs = now - lastSession;
        const TIMEOUT_MINUTES = 240;
        const timeoutMs = TIMEOUT_MINUTES * 60 * 1000;
        
        if (diffMs > timeoutMs) {
            return res.status(401).json({ status: "bad", message: "Сессия истекла. Пожалуйста, авторизуйтесь снова." });
        }
        
        next();
    } catch (err) {
        console.error('Ошибка проверки сессии:', err);
        res.status(500).json({ status: "bad", message: "Ошибка сервера" });
    }
};

module.exports = { router, checkSession };