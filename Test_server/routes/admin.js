const express = require('express');
const router = express.Router();
const { db, generatePassword, hashPassword, encryptData, decryptData } = require('../db');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Функция форматирования номера телефона
const formatPhoneNumber = (phone) => {
    if (!phone) return phone;
    const digits = phone.replace(/\D/g, '');
    if (digits.length !== 11) return phone;
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
};

// Настройка multer для загрузки файлов
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

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
    limits: { fileSize: 15 * 1024 * 1024 }, 
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Поддерживаемые форматы: JPEG, JPG, PNG, PDF'));
        }
    }
});

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

// ==================== Администратор ====================

// Получение списка всех должностей
router.get('/admin/positions', checkAdminAccess, async (req, res) => {
    try {
        const positions = await db.query(
            `SELECT position_id, position_name FROM positions ORDER BY position_name ASC`
        );
        res.json(positions.rows);
    } catch (err) {
        console.error('Ошибка при получении списка должностей:', err);
        res.status(500).json({ error: "Ошибка при получении списка должностей" });
    }
});

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
        moderators.rows.forEach(mod => {
            if (mod.email) mod.email = decryptData(mod.email);
        });
        res.json(moderators.rows);
    } catch (err) {
        res.status(500).json({ error: "Ошибка при получении списка модераторов" });
    }
});

// Добавление нового модератора
router.post('/admin/moderators', checkAdminAccess, async (req, res) => {
    const { login, full_name, email, position_name, password } = req.body;

    if (!password || password.trim().length < 6) {
        return res.status(400).json({ status: "bad", message: "Пароль обязателен и должен содержать минимум 6 символов" });
    }

    try {
        let positionId = null;
        
        // Если указана должность - находим или создаем её
        if (position_name && position_name.trim()) {
            const trimmedName = position_name.trim();
            
            // Ищем существующую должность
            const existingPosition = await db.query(
                'SELECT position_id FROM positions WHERE position_name = $1',
                [trimmedName]
            );
            
            if (existingPosition.rows.length > 0) {
                positionId = existingPosition.rows[0].position_id;
            } else {
                // Создаем новую должность
                const newPosition = await db.query(
                    'INSERT INTO positions (position_name) VALUES ($1) RETURNING position_id',
                    [trimmedName]
                );
                positionId = newPosition.rows[0].position_id;
            }
        }

        const { salt, hash } = hashPassword(password);
        const dbPassword = `${salt}:${hash}`;

        const encryptedEmail = encryptData(email);
        const newMod = await db.query(
            `INSERT INTO users (login, password, full_name, email, position_id, is_moderator)
             VALUES ($1, $2, $3, $4, $5, true)
             RETURNING user_id, login, full_name, email`,
            [login, dbPassword, full_name, encryptedEmail, positionId]
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
    const { full_name, email, position_name } = req.body;

    try {
        let positionId = null;
        
        // Если указана должность - находим или создаем её
        if (position_name !== undefined) {
            if (position_name && position_name.trim()) {
                const trimmedName = position_name.trim();
                
                // Ищем существующую должность
                const existingPosition = await db.query(
                    'SELECT position_id FROM positions WHERE position_name = $1',
                    [trimmedName]
                );
                
                if (existingPosition.rows.length > 0) {
                    positionId = existingPosition.rows[0].position_id;
                } else {
                    // Создаем новую должность
                    const newPosition = await db.query(
                        'INSERT INTO positions (position_name) VALUES ($1) RETURNING position_id',
                        [trimmedName]
                    );
                    positionId = newPosition.rows[0].position_id;
                }
            }
            
            // Обновляем с position_id
            const encryptedEmail = email ? encryptData(email) : null;
            const updatedMod = await db.query(
                `UPDATE users
                 SET full_name = COALESCE($1, full_name),
                     email = COALESCE($2, email),
                     position_id = $3
                 WHERE user_id = $4 AND is_moderator = true
                 RETURNING user_id, full_name, email, position_id`,
                [full_name, encryptedEmail, positionId, modId]
            );

            if (updatedMod.rows.length === 0) {
                return res.status(404).json({ status: "bad", message: "Модератор не найден" });
            }
            res.json({ status: "yea", message: "Данные модератора обновлены", user: updatedMod.rows[0] });
        } else {
            // Обновляем только имя и email
            const updatedMod = await db.query(
                `UPDATE users
                 SET full_name = COALESCE($1, full_name),
                     email = COALESCE($2, email)
                 WHERE user_id = $3 AND is_moderator = true
                 RETURNING user_id, full_name, email, position_id`,
                [full_name, email, modId]
            );

            if (updatedMod.rows.length === 0) {
                return res.status(404).json({ status: "bad", message: "Модератор не найден" });
            }
            res.json({ status: "yea", message: "Данные модератора обновлены", user: updatedMod.rows[0] });
        }
    } catch (err) {
        console.error('Ошибка при обновлении модератора:', err);
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
router.get('/admin/users', checkAdminOrModeratorAccess, async (req, res) => {
    try {
        const users = await db.query(
            `SELECT user_id, full_name, phone_number, birth_date, class_course, login, registration_date, email, is_verified
             FROM users
             WHERE is_admin = false AND is_moderator = false
             ORDER BY full_name ASC`
        );
        users.rows.forEach(user => {
            if (user.phone_number) user.phone_number = formatPhoneNumber(decryptData(user.phone_number));
            if (user.email) user.email = decryptData(user.email);
        });
        res.json(users.rows);
    } catch (err) {
        res.status(500).json({ error: "Ошибка при получении списка пользователей" });
    }
});

// Поиск пользователей с автозаполнением для выпадающего списка
router.get('/admin/users/search', checkAdminOrModeratorAccess, async (req, res) => {
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
        return res.json({ status: "yea", users: [] });
    }

    try {
        const searchTerm = `%${query.trim()}%`;
        const cleanPhoneQuery = query.replace(/\D/g, '');
        const encryptedPhone = cleanPhoneQuery ? encryptData(cleanPhoneQuery) : null;

        const users = await db.query(
            `SELECT user_id, full_name, phone_number, email, created_by_admin
             FROM users
             WHERE (full_name ILIKE $1 OR phone_number = $2)
               AND is_admin = false 
               AND is_moderator = false
             ORDER BY full_name ASC
             LIMIT 10`,
            [searchTerm, encryptedPhone]
        );

        users.rows.forEach(user => {
            if (user.phone_number) user.phone_number = formatPhoneNumber(decryptData(user.phone_number));
            if (user.email) user.email = decryptData(user.email);
        });
        res.json({ status: "yea", users: users.rows });
    } catch (err) {
        console.error('Ошибка при поиске пользователей:', err);
        res.status(500).json({ status: "bad", message: "Ошибка при поиске пользователей" });
    }
});

// Поиск документов с автозаполнением
router.get('/admin/documents/search', checkAdminOrModeratorAccess, async (req, res) => {
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
        return res.json({ status: "yea", documents: [] });
    }

    try {
        const searchTerm = `%${query.trim()}%`;
        const docs = await db.query(
            `SELECT d.document_id, d.document_name, d.status, d.user_id, u.full_name as student_name
             FROM documents d
             LEFT JOIN users u ON d.user_id = u.user_id
             WHERE d.document_name ILIKE $1 OR u.full_name ILIKE $1
             ORDER BY d.upload_date DESC
             LIMIT 10`,
            [searchTerm]
        );
        res.json({ status: "yea", documents: docs.rows });
    } catch (err) {
        console.error('Ошибка при поиске документов:', err);
        res.status(500).json({ status: "bad", message: "Ошибка при поиске документов" });
    }
});

// Поиск мероприятий с автозаполнением
router.get('/admin/events/search', checkAdminOrModeratorAccess, async (req, res) => {
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
        return res.json({ status: "yea", events: [] });
    }

    try {
        const searchTerm = `%${query.trim()}%`;
        const events = await db.query(
            `SELECT event_id, event_name, event_date
             FROM events
             WHERE event_name ILIKE $1
             ORDER BY event_date DESC
             LIMIT 10`,
            [searchTerm]
        );
        res.json({ status: "yea", events: events.rows });
    } catch (err) {
        console.error('Ошибка при поиске мероприятий:', err);
        res.status(500).json({ status: "bad", message: "Ошибка при поиске мероприятий" });
    }
});

// Поиск модераторов с автозаполнением
router.get('/admin/moderators/search', checkAdminAccess, async (req, res) => {
    const { query } = req.query;

    if (!query || query.trim().length < 2) {
        return res.json({ status: "yea", moderators: [] });
    }

    try {
        const searchTerm = `%${query.trim()}%`;
        const moderators = await db.query(
            `SELECT u.user_id, u.full_name, u.email, u.login, p.position_name
             FROM users u
             LEFT JOIN positions p ON u.position_id = p.position_id
             WHERE u.is_moderator = true AND u.full_name ILIKE $1
             ORDER BY u.full_name ASC
             LIMIT 10`,
            [searchTerm]
        );
        moderators.rows.forEach(mod => {
            if (mod.email) mod.email = decryptData(mod.email);
        });
        res.json({ status: "yea", moderators: moderators.rows });
    } catch (err) {
        console.error('Ошибка при поиске модераторов:', err);
        res.status(500).json({ status: "bad", message: "Ошибка при поиске модераторов" });
    }
});

// Получение деталей пользователя (с данными родителей для несовершеннолетних)
router.get('/admin/users/:id', checkAdminOrModeratorAccess, async (req, res) => {
    const userId = req.params.id;
    try {
        const userResult = await db.query(
            `SELECT u.*,
                    CASE 
                        WHEN u.birth_date IS NULL THEN NULL
                        WHEN EXTRACT(YEAR FROM AGE(u.birth_date)) >= 18 THEN true
                        ELSE false
                    END as is_adult,
                    p.full_name as parent_name, p.phone_number as parent_phone
             FROM users u
             LEFT JOIN parents p ON u.user_id = p.user_id
             WHERE u.user_id = $1 AND u.is_admin = false AND u.is_moderator = false`,
            [userId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({ status: "bad", message: "Пользователь не найден" });
        }

        const userData = userResult.rows[0];
        if (userData.phone_number) userData.phone_number = formatPhoneNumber(decryptData(userData.phone_number));
        if (userData.email) userData.email = decryptData(userData.email);
        if (userData.parent_phone) userData.parent_phone = formatPhoneNumber(decryptData(userData.parent_phone));
        res.json({ status: "yea", user: userData });

    } catch (err) {
        res.status(500).json({ status: "bad", message: err.message });
    }
});

// Админ подтверждает аккаунт пользователя
router.patch('/admin/users/:id/verify', checkAdminOrModeratorAccess, async (req, res) => {
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
router.get('/admin/documents', checkAdminOrModeratorAccess, async (req, res) => {
    try {
        const docs = await db.query(
            `SELECT d.document_id, d.document_name, d.status, d.points, d.received_date,
                    d.comment, d.file_path, d.user_id, d.category_id, u.full_name as student_name,
                    ec.category_name
             FROM documents d
             LEFT JOIN users u ON d.user_id = u.user_id
             LEFT JOIN event_categories ec ON d.category_id = ec.category_id
             ORDER BY d.upload_date DESC`
        );
        res.json(docs.rows);
    } catch (err) {
        res.status(500).json({ error: "Ошибка при получении документов" });
    }
});

// Изменение статуса документа и начисление баллов
router.patch('/admin/documents/:id', checkAdminOrModeratorAccess, async (req, res) => {
    const documentId = req.params.id;
    const { status, points, comment, category_id, user_id } = req.body;

    try {
        // Получаем текущие данные документа
        const currentDocResult = await db.query(
            'SELECT user_id, status, points, category_id FROM documents WHERE document_id = $1',
            [documentId]
        );
        const currentDoc = currentDocResult.rows[0];
        const userId = currentDoc?.user_id;

        // Валидация: если документ одобряется с категорией и баллами - проверяем лимит
        if (status === 'Одобрено' && points !== undefined && points !== null && category_id) {
            // Получаем max_points для категории
            const categoryResult = await db.query(
                'SELECT max_points FROM event_categories WHERE category_id = $1',
                [category_id]
            );

            if (categoryResult.rows.length > 0) {
                const maxPoints = parseInt(categoryResult.rows[0].max_points);

                // Считаем текущую сумму одобренных баллов пользователя в этой категории
                // Исключаем текущий документ (если он уже был одобрен ранее)
                const currentPointsResult = await db.query(
                    `SELECT COALESCE(SUM(points), 0) as total_points
                     FROM documents
                     WHERE user_id = $1
                       AND category_id = $2
                       AND status = 'Одобрено'
                       AND document_id != $3
                       AND received_date >= CURRENT_DATE - INTERVAL '3 years'`,
                    [userId, category_id, documentId]
                );

                const currentCategoryPoints = parseInt(currentPointsResult.rows[0].total_points);
                const availablePoints = Math.max(0, maxPoints - currentCategoryPoints);

                // Валидация: баллы не могут превысить доступный лимит
                if (points > availablePoints) {
                    return res.status(400).json({
                        status: "bad",
                        message: `Превышен лимит баллов для категории. Доступно: ${availablePoints} из ${maxPoints} баллов. Текущая сумма: ${currentCategoryPoints} баллов.`,
                        validation_error: true,
                        available_points: availablePoints,
                        max_points: maxPoints,
                        current_points: currentCategoryPoints,
                        requested_points: points
                    });
                }
            }
        }

        const updatedDoc = await db.query(
            `UPDATE documents
             SET status = COALESCE($1, status),
                 points = COALESCE($2, points),
                 comment = $3,
                 category_id = COALESCE($4, category_id),
                 user_id = COALESCE($5, user_id)
             WHERE document_id = $6
             RETURNING document_id, document_name, status, points, comment, category_id, user_id`,
            [status, points, comment, category_id, user_id, documentId]
        );

        // Обновляем таблицу лидеров для всех подключенных клиентов
        if (global.broadcastLeaderboardUpdate) {
            global.broadcastLeaderboardUpdate();
        }

        // Отправляем обновление документов старому пользователю (если сменился владелец)
        if (userId && global.broadcastUserDocumentsUpdate) {
            global.broadcastUserDocumentsUpdate(userId);
        }
        
        // Отправляем обновление документов новому пользователю (если сменился владелец)
        if (user_id && user_id !== userId && global.broadcastUserDocumentsUpdate) {
            global.broadcastUserDocumentsUpdate(user_id);
        }

        res.json({
            status: "yea",
            message: "Документ обработан администратором",
            document: updatedDoc.rows[0]
        });
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

// Админ или модератор добавляет достижение напрямую с возможностью загрузки файла
router.post('/admin/documents/manual', checkAdminOrModeratorAccess, upload.single('file'), async (req, res) => {
    const { user_id, document_name, category_id, points, comment, received_date } = req.body;

    if (!received_date) {
        if (req.file) {
            fs.unlink(req.file.path, () => {});
        }
        return res.status(400).json({ status: "bad", message: "Необходимо указать дату выдачи документа (received_date)" });
    }

    try {
        const file_path = req.file ? `/uploads/${req.file.filename}` : null;
        
        const newDoc = await db.query(
            'INSERT INTO documents (document_name, status, category_id, points, comment, user_id, received_date, file_path, upload_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING document_id',
            [document_name, 'Одобрено', category_id, points, comment || null, user_id, received_date, file_path]
        );

        if (global.broadcastLeaderboardUpdate) {
            global.broadcastLeaderboardUpdate();
        }

        res.status(201).json({
            status: "yea",
            message: "Документ успешно добавлен",
            documentId: newDoc.rows[0].document_id,
            file_path: file_path
        });
    } catch (err) {
        if (req.file) {
            fs.unlink(req.file.path, () => {});
        }
        console.error(err.message);
        res.status(500).json({ status: "bad", message: err.message });
    }
});

// Получение статистики для админ-панели (количество пользователей)
router.get('/admin/stats', checkAdminOrModeratorAccess, async (req, res) => {
    try {
        const usersCount = await db.query('SELECT COUNT(*) FROM users WHERE is_admin = false AND is_moderator = false');

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

// Получение доступных баллов для категории 
router.get('/admin/users/:id/category/:categoryId/available-points', checkAdminOrModeratorAccess, async (req, res) => {
    const userId = req.params.id;
    const categoryId = req.params.categoryId;
    const currentDocumentId = req.query.exclude_document_id; // ID документа, который исключаем из подсчета (при редактировании)

    try {
        // Получаем max_points для категории
        const categoryResult = await db.query(
            'SELECT category_name, max_points FROM event_categories WHERE category_id = $1',
            [categoryId]
        );

        if (categoryResult.rows.length === 0) {
            return res.status(404).json({ error: "Категория не найдена" });
        }

        const { category_name, max_points } = categoryResult.rows[0];
        const maxPoints = parseInt(max_points);

        // Считаем текущую сумму одобренных баллов пользователя в этой категории
        let query = `
            SELECT COALESCE(SUM(points), 0) as total_points
            FROM documents
            WHERE user_id = $1
              AND category_id = $2
              AND status = 'Одобрено'
              AND received_date >= CURRENT_DATE - INTERVAL '3 years'
        `;
        const params = [userId, categoryId];

        // При редактировании исключаем текущий документ из подсчета
        if (currentDocumentId) {
            query += ` AND document_id != $3`;
            params.push(currentDocumentId);
        }

        const currentPointsResult = await db.query(query, params);
        const currentPoints = parseInt(currentPointsResult.rows[0].total_points);
        const availablePoints = Math.max(0, maxPoints - currentPoints);

        res.json({
            user_id: parseInt(userId),
            category_id: parseInt(categoryId),
            category_name,
            max_points: maxPoints,
            current_points: currentPoints,
            available_points: availablePoints,
            is_capped: currentPoints >= maxPoints
        });
    } catch (err) {
        console.error('Ошибка при получении доступных баллов:', err);
        res.status(500).json({ error: "Ошибка при получении доступных баллов" });
    }
});

// Получение списка мероприятий
router.get('/admin/events', checkAdminOrModeratorAccess, async (req, res) => {
    try {
        const events = await db.query('SELECT event_id, event_name, event_date FROM events ORDER BY event_name ASC');
        res.json(events.rows);
    } catch (err) {
        res.status(500).json({ error: "Ошибка при получении мероприятий" });
    }
});

// Создание нового мероприятия
router.post('/admin/events', checkAdminOrModeratorAccess, async (req, res) => {
    const { event_name, event_date, category_id } = req.body;

    if (!event_name || !event_date || !category_id) {
        return res.status(400).json({ status: "bad", message: "Необходимо указать название, дату и категорию мероприятия" });
    }

    try {
        const newEvent = await db.query(
            'INSERT INTO events (event_name, event_date, category_id) VALUES ($1, $2, $3) RETURNING event_id',
            [event_name, event_date, category_id]
        );
        res.status(201).json({ status: "yea", message: "Мероприятие создано", eventId: newEvent.rows[0].event_id });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ status: "bad", message: err.message });
    }
});

// Поиск пользователя по ФИО и номеру телефона
router.post('/admin/find-user', checkAdminOrModeratorAccess, async (req, res) => {
    const { full_name, phone_number } = req.body;

    if (!full_name || !phone_number) {
        return res.status(400).json({ status: "bad", message: "Необходимо указать ФИО и номер телефона" });
    }

    try {
        const cleanPhone = phone_number.replace(/\D/g, '');
        const encryptedPhone = encryptData(cleanPhone);
        const user = await db.query(
            `SELECT user_id, full_name, phone_number, email
             FROM users
             WHERE full_name ILIKE $1 AND phone_number = $2
             LIMIT 1`,
            [`%${full_name}%`, encryptedPhone]
        );

        if (user.rows.length === 0) {
            return res.status(404).json({ status: "bad", message: "Пользователь не найден. Проверьте ФИО и телефон." });
        }
        if (user.rows[0].phone_number) user.rows[0].phone_number = formatPhoneNumber(decryptData(user.rows[0].phone_number));
        if (user.rows[0].email) user.rows[0].email = decryptData(user.rows[0].email);

        res.json({ status: "yea", user: user.rows[0] });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: "bad", message: "Ошибка поиска пользователя" });
    }
});

// Получение документов, не прошедших модерацию (для админа/модератора)
router.get('/admin/documents/pending', checkAdminOrModeratorAccess, async (req, res) => {
    try {
        const docs = await db.query(
            `SELECT d.document_id, d.document_name, d.status, d.category_id,
                    d.comment, d.file_path, d.user_id, u.full_name as student_name, d.upload_date,
                    ec.category_name
             FROM documents d
                      JOIN users u ON d.user_id = u.user_id
                      LEFT JOIN event_categories ec ON d.category_id = ec.category_id
             WHERE d.status = 'На рассмотрении'
             ORDER BY d.upload_date ASC`
        );
        res.json(docs.rows);
    } catch (err) {
        console.error('Ошибка при получении документов на проверку:', err);
        res.status(500).json({ error: "Ошибка при получении документов на проверку" });
    }
});

// Получение количества одобренных достижений по каждой категории
router.get('/admin/categories/stats', checkAdminOrModeratorAccess, async (req, res) => {
    try {
        const stats = await db.query(`
            SELECT
                ec.category_id,
                ec.category_name,
                COUNT(d.document_id) AS achievement_count
            FROM event_categories ec
            LEFT JOIN documents d ON d.category_id = ec.category_id
                AND d.status = 'Одобрено'
                AND d.received_date >= CURRENT_DATE - INTERVAL '3 years'
            GROUP BY ec.category_id, ec.category_name
            ORDER BY achievement_count DESC, ec.category_name ASC
        `);
        res.json(stats.rows);
    } catch (err) {
        console.error('Ошибка получения статистики категорий:', err);
        res.status(500).json({ error: "Ошибка при получении статистики категорий" });
    }
});

router.delete('/admin/documents/:id', checkAdminOrModeratorAccess, async (req, res) => {
    const documentId = req.params.id;

    try {
        const docResult = await db.query(
            'SELECT file_path FROM documents WHERE document_id = $1',
            [documentId]
        );

        if (docResult.rows.length === 0) {
            return res.status(404).json({ status: "bad", message: "Документ не найден" });
        }

        const filePath = docResult.rows[0].file_path;

        await db.query('DELETE FROM documents WHERE document_id = $1', [documentId]);

        if (filePath) {
            const fullPath = path.join(uploadsDir, path.basename(filePath));
            fs.unlink(fullPath, (err) => {
                if (err && err.code !== 'ENOENT') {
                    console.error(`Ошибка удаления файла ${fullPath}:`, err);
                } else {
                    console.log(`Файл ${fullPath} успешно удалён`);
                }
            });
        }

        // Обновляем таблицу лидеров для всех подключенных клиентов
        if (global.broadcastLeaderboardUpdate) {
            global.broadcastLeaderboardUpdate();
        }

        res.json({ status: "yea", message: "Документ успешно удалён" });
    } catch (err) {
        console.error('Ошибка при удалении документа:', err);
        res.status(500).json({ status: "bad", message: "Ошибка сервера при удалении документа" });
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
        // Получаем текущие данные документа
        const currentDocResult = await db.query(
            'SELECT user_id, status, points, category_id FROM documents WHERE document_id = $1',
            [documentId]
        );
        const currentDoc = currentDocResult.rows[0];

        if (!currentDoc) {
            return res.status(404).json({ status: "bad", message: "Документ не найден" });
        }

        const userId = currentDoc.user_id;
        const categoryId = currentDoc.category_id;

        // Валидация: если документ одобряется с баллами и у него есть категория - проверяем лимит
        if (status === 'Одобрено' && points !== undefined && points !== null && categoryId) {
            // Получаем max_points для категории
            const categoryResult = await db.query(
                'SELECT max_points FROM event_categories WHERE category_id = $1',
                [categoryId]
            );

            if (categoryResult.rows.length > 0) {
                const maxPoints = parseInt(categoryResult.rows[0].max_points);

                // Считаем текущую сумму одобренных баллов пользователя в этой категории
                // Исключаем текущий документ (если он уже был одобрен ранее)
                const currentPointsResult = await db.query(
                    `SELECT COALESCE(SUM(points), 0) as total_points
                     FROM documents
                     WHERE user_id = $1
                       AND category_id = $2
                       AND status = 'Одобрено'
                       AND document_id != $3
                       AND received_date >= CURRENT_DATE - INTERVAL '3 years'`,
                    [userId, categoryId, documentId]
                );

                const currentCategoryPoints = parseInt(currentPointsResult.rows[0].total_points);
                const availablePoints = Math.max(0, maxPoints - currentCategoryPoints);

                // Валидация: баллы не могут превысить доступный лимит
                if (points > availablePoints) {
                    return res.status(400).json({
                        status: "bad",
                        message: `Превышен лимит баллов для категории. Доступно: ${availablePoints} из ${maxPoints} баллов. Текущая сумма: ${currentCategoryPoints} баллов.`,
                        validation_error: true,
                        available_points: availablePoints,
                        max_points: maxPoints,
                        current_points: currentCategoryPoints,
                        requested_points: points
                    });
                }
            }
        }

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

        if (global.broadcastLeaderboardUpdate) {
            global.broadcastLeaderboardUpdate();
        }

        res.json({
            status: "yea",
            message: "Документ обработан",
            document: updatedDoc.rows[0]
        });
    } catch (err) {
        console.error(err.message);
        res.status(500).json({ status: "bad", message: err.message });
    }
});

// Создание пользователя администратором или модератором (без личного кабинета)
router.post('/admin/users', checkAdminOrModeratorAccess, async (req, res) => {
    const { full_name, phone_number, email, birth_date, class_course, school, graduation_year } = req.body;

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
        // Проверка существования пользователя по зашифрованному телефону
        const encryptedPhone = encryptData(cleanPhone);
        const existingUser = await db.query(
            `SELECT user_id, full_name FROM users WHERE phone_number = $1`,
            [encryptedPhone]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                status: "bad",
                message: "Пользователь с таким номером телефона уже существует",
                existing_user: existingUser.rows[0]
            });
        }

        if (email && email.trim()) {
            const encryptedEmail = encryptData(email.trim());
            const existingEmail = await db.query(
                'SELECT user_id FROM users WHERE email = $1',
                [encryptedEmail]
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

        const encryptedEmail = email && email.trim() ? encryptData(email.trim()) : null;

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
                encryptedPhone,
                encryptedEmail,
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

// Получение документов пользователя (для админа и модератора)
router.get('/admin/users/:userId/documents', checkAdminOrModeratorAccess, async (req, res) => {
    const targetUserId = req.params.userId;

    try {
        const result = await db.query(
            `SELECT d.document_id, d.document_name, d.status, d.points, d.received_date,
                    d.comment, d.file_path, d.category_id, d.user_id, ec.category_name
             FROM documents d
             LEFT JOIN event_categories ec ON d.category_id = ec.category_id
             WHERE d.user_id = $1
             ORDER BY d.upload_date DESC`,
            [targetUserId]
        );

        res.json({
            status: "yea",
            documents: result.rows
        });
    } catch (err) {
        console.error('Ошибка получения документов пользователя:', err);
        res.status(500).json({ status: "bad", message: "Ошибка сервера" });
    }
});

router.get('/download/:documentId', async (req, res) => {
    const documentId = req.params.documentId;
    const userId = req.headers['x-user-id'];

    if (!userId) {
        return res.status(401).json({ status: "bad", message: "Не авторизован" });
    }

    try {
        const userResult = await db.query(
            `SELECT is_admin, is_moderator FROM users WHERE user_id = $1`,
            [userId]
        );
        const isAdminOrModerator = userResult.rows[0]?.is_admin === true || userResult.rows[0]?.is_moderator === true;

        if (!isAdminOrModerator) {
            return res.status(403).json({ status: "bad", message: "Нет прав на скачивание документа" });
        }

        const docResult = await db.query(
            `SELECT file_path FROM documents WHERE document_id = $1`,
            [documentId]
        );

        if (docResult.rows.length === 0) {
            return res.status(404).json({ status: "bad", message: "Документ не найден" });
        }

        const doc = docResult.rows[0];
        const filePath = path.join(uploadsDir, path.basename(doc.file_path));
        if (fs.existsSync(filePath)) {
            const originalName = path.basename(doc.file_path);
            res.download(filePath, originalName);
        } else {
            res.status(404).json({ status: "bad", message: "Файл не найден" });
        }
    } catch (err) {
        console.error('Ошибка скачивания:', err);
        res.status(500).json({ status: "bad", message: "Ошибка сервера" });
    }
});

module.exports = router;
