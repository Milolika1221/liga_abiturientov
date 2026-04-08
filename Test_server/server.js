require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const WebSocket = require('ws');
const http = require('http');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { db } = require('./db');

// Импорт роутов
const { router: mainRoutes } = require('./routes/main');
const adminRoutes = require('./routes/admin');

const app = express();

// Создаем папку uploads если не существует
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Настройка multer для загрузки файлов
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
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

// Настройки CORS для работы с ngrok, localhost и любым IP в локальной сети
app.use(cors({
  origin: function (origin, callback) {
    // Разрешаем запросы без origin
    if (!origin) return callback(null, true);
    
    // Разрешаем localhost
    if (origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
      return callback(null, true);
    }
    
    // Разрешаем любой IP в локальной сети (192.168.x.x)
    if (origin.match(/^http:\/\/192\.168\.\d+\.\d+:\d+$/)) {
      return callback(null, true);
    }
    
    // Разрешаем ngrok
    if (origin.match(/\.ngrok-free\.app$/) || origin.match(/\.ngrok\.io$/)) {
      return callback(null, true);
    }
    
    // Все остальные тоже разрешаем
    callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-ID', '*']
}));

// Логирование всех запросов для отладки
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} - Origin: ${req.headers.origin || 'no origin'}`);
  next();
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Статические файлы для uploads
app.use('/uploads', express.static(uploadsDir));

// Подключение роутов
app.use('/', mainRoutes);
app.use('/', adminRoutes);

// Экспорт upload для использования в роутах
module.exports = { upload };

// Создание HTTP сервера для WebSocket
const server = http.createServer(app);

// WebSocket сервер для реального времени
const wss = new WebSocket.Server({ server });

// Хранилище подключенных клиентов для таблицы лидеров
const leaderboardClients = new Set();

// Хранилище клиентов для обновлений документов пользователей
const userDocumentClients = new Map();

wss.on('connection', (ws, req) => {
    console.log('New WebSocket connection established');
    
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            console.log('Received WebSocket message:', data.type);
            
            if (data.type === 'subscribe_leaderboard') {
                console.log('Client subscribed to leaderboard updates');
                leaderboardClients.add(ws);

                try {
                    // Отправляем текущие данные таблицы лидеров
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
                    
                    ws.send(JSON.stringify({
                        type: 'leaderboard_update',
                        leaders: leaderboard.rows
                    }));
                    console.log('Sent initial leaderboard data to client');
                } catch (dbError) {
                    console.error('Database error in WebSocket:', dbError);
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'Failed to load leaderboard data'
                    }));
                }
            } else if (data.type === 'subscribe_user_documents') {
                const userId = data.user_id;
                if (!userId) {
                    ws.send(JSON.stringify({
                        type: 'error',
                        message: 'user_id is required for subscribe_user_documents'
                    }));
                    return;
                }

                console.log(`Client subscribed to document updates for user_id: ${userId}`);

                // Добавляем клиента в мапу для конкретного пользователя
                if (!userDocumentClients.has(userId)) {
                    userDocumentClients.set(userId, new Set());
                }
                userDocumentClients.get(userId).add(ws);

                // Отправляем подтверждение подписки
                ws.send(JSON.stringify({
                    type: 'subscribed',
                    subscription: 'user_documents',
                    user_id: userId
                }));
            }
        } catch (error) {
            console.error('Error handling WebSocket message:', error);
        }
    });

    ws.on('close', () => {
        console.log('WebSocket connection closed');
        leaderboardClients.delete(ws);

        // Удаляем клиента из всех подписок на документы пользователей
        userDocumentClients.forEach((clients, userId) => {
            clients.delete(ws);
            if (clients.size === 0) {
                userDocumentClients.delete(userId);
            }
        });
    });

    ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        leaderboardClients.delete(ws);

        // Удаляем клиента из всех подписок на документы пользователей
        userDocumentClients.forEach((clients, userId) => {
            clients.delete(ws);
            if (clients.size === 0) {
                userDocumentClients.delete(userId);
            }
        });
    });
});

// Функция для рассылки обновлений таблицы лидеров
async function broadcastLeaderboardUpdate() {
    if (leaderboardClients.size === 0) return;
    
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
        
        const updateMessage = JSON.stringify({
            type: 'leaderboard_update',
            leaders: leaderboard.rows
        });
        
        // Рассылка всем подключенным клиентам
        leaderboardClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(updateMessage);
            } else {
                leaderboardClients.delete(client);
            }
        });
        
        console.log(`Broadcasted leaderboard update to ${leaderboardClients.size} clients`);
        console.log('Updated leaders:', leaderboard.rows.map(l => `${l.full_name}: ${l.total_points}pts`));
    } catch (error) {
        console.error('Error broadcasting leaderboard update:', error);
    }
}

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

// CRON-задача для удаления устаревших документов (старше 3 лет)
cron.schedule('0 1 * * *', async () => {
    try {
        console.log('CRON: Запуск удаления устаревших документов (старше 3 лет)...');

        const result = await db.query(`
            DELETE FROM documents 
            WHERE received_date < CURRENT_DATE - INTERVAL '3 years'
            RETURNING document_id
        `);

        console.log(`CRON: Очистка завершена. Удалено недействительных документов: ${result.rowCount}`);
    } catch (error) {
        console.error('CRON: Ошибка при удалении старых документов:', error.message);
    }
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`Сервер запущен на http://${HOST}:${PORT}`);
    console.log(`WebSocket сервер доступен на ws://${HOST}:${PORT}`);
});

// Автоматическое обновление таблицы лидеров при изменении документов
// Добавим триггер через роуты - будем вызывать broadcastLeaderboardUpdate при изменениях
global.broadcastLeaderboardUpdate = broadcastLeaderboardUpdate;

// Функция для отправки уведомления о верификации пользователя
function broadcastUserVerified(userId) {
    console.log(`Отправка WebSocket уведомления о верификации для user_id: ${userId}`);
    
    const message = JSON.stringify({
        type: 'user_verified',
        user_id: userId,
        timestamp: new Date().toISOString()
    });
    
    leaderboardClients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        } else {
            leaderboardClients.delete(client);
        }
    });
    
    console.log(`Отправлено уведомление о верификации ${leaderboardClients.size} клиентам`);
}

// Экспорт функции для использования в роутах
global.broadcastUserVerified = broadcastUserVerified;

// Функция для отправки обновлений документов конкретному пользователю
async function broadcastUserDocumentsUpdate(userId) {
    console.log(`Отправка WebSocket обновления документов для user_id: ${userId}`);

    const clients = userDocumentClients.get(userId);
    if (!clients || clients.size === 0) {
        console.log(`Нет подключенных клиентов для user_id: ${userId}`);
        return;
    }

    try {
        // Получаем актуальные данные документов пользователя
        const documents = await db.query(
            `SELECT d.document_id, d.document_name, d.status, d.points, d.received_date,
                    d.comment, d.file_path, d.category_id, ec.category_name
             FROM documents d
             LEFT JOIN event_categories ec ON d.category_id = ec.category_id
             WHERE d.user_id = $1
             ORDER BY d.upload_date DESC`,
            [userId]
        );

        const message = JSON.stringify({
            type: 'user_documents_update',
            user_id: userId,
            documents: documents.rows,
            timestamp: new Date().toISOString()
        });

        let sentCount = 0;
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
                sentCount++;
            } else {
                clients.delete(client);
            }
        });

        console.log(`Отправлено обновление документов ${sentCount} клиентам для user_id: ${userId}`);
    } catch (err) {
        console.error(`Ошибка при отправке обновления документов для user_id ${userId}:`, err);
    }
}

// Экспорт функции для использования в роутах
global.broadcastUserDocumentsUpdate = broadcastUserDocumentsUpdate;
