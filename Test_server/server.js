require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { db } = require('./db');

// Импорт роутов
const mainRoutes = require('./routes/main');
const adminRoutes = require('./routes/admin');

const app = express();

// Настройки CORS для работы с ngrok и localhost
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://192.168.0.100:5173',  // Network версия
    'https://stoically-noncaloric-rowan.ngrok-free.dev',
    /\.ngrok-free\.app$/,
    /\.ngrok\.io$/
  ],
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

// Подключение роутов
app.use('/', mainRoutes);
app.use('/', adminRoutes);

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

app.listen(PORT, HOST, () => {
    console.log(`Сервер запущен на http://${HOST}:${PORT}`);
});