// Тест CRON: создает пользователей и запускает обновление классов
require('dotenv').config();

// Подключаемся к БД
const { Pool } = require('pg');
const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,  
    port: process.env.DB_PORT,
});

// Функция создания тестовых пользователей
async function createTestUsers() {
    console.log('📝 Создание тестовых пользователей...\n');
    
    try {
        // Удаляем старых
        await pool.query("DELETE FROM users WHERE full_name LIKE 'Тестовый%'")
            .catch(() => console.log('Нет старых тестовых пользователей'));
        
        const users = [
            { name: 'Тестовый 9 класс', phone: '+70000000009', birth: '2007-01-01', class: 9, year: 2027, login: 'test9class' },
            { name: 'Тестовый 11 класс', phone: '+70000000011', birth: '2005-01-01', class: 11, year: 2027, login: 'test11class' },
            { name: 'Тестовый СПО 1 курс', phone: '+70000000028', birth: '2006-01-01', class: 1, year: 2028, login: 'testspo1' },
            { name: 'Тестовый 10 класс', phone: '+70000000010', birth: '2006-01-01', class: 10, year: 2027, login: 'test10class' },
            { name: 'Тестовый СПО 3 курс', phone: '+70000000027', birth: '2004-01-01', class: 3, year: 2027, login: 'testspo3' }
        ];
        
        const created = [];
        for (const u of users) {
            const result = await pool.query(
                `INSERT INTO users (full_name, phone_number, birth_date, password, login, class_course, graduation_year, is_admin, is_moderator) 
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING user_id, class_course, graduation_year`,
                [u.name, u.phone, u.birth, 'password123', u.login, u.class, u.year, false, false]
            );
            created.push({ ...result.rows[0], name: u.name });
            console.log(`✅ Создан: ${u.name} (ID: ${result.rows[0].user_id}, класс ${u.class}, выпуск ${u.year})`);
        }
        
        console.log(`\nСоздано ${created.length} пользователей\n`);
        return created;
        
    } catch (e) {
        console.error('Ошибка создания:', e.message);
        throw e;
    }
}

// Функция обновления классов - функция из server.js
async function updateUsersClasses() {
    console.log('Запуск обновления классов...\n');
    
    const currentYear = new Date().getFullYear();
    console.log(`Текущий год: ${currentYear}`);
    
    const users = await pool.query(
        `SELECT user_id, class_course, graduation_year 
         FROM users 
         WHERE full_name LIKE 'Тестовый%'
         AND class_course IS NOT NULL 
         AND graduation_year IS NOT NULL`
    );
    
    console.log(`Найдено пользователей: ${users.rows.length}\n`);
    
    let updatedCount = 0;
    
    for (const user of users.rows) {
        const { user_id, class_course, graduation_year } = user;
        
        console.log('-------------------------');
        console.log(`Обработка пользователя ${user_id}: класс = ${class_course}, год выпуска = ${graduation_year}`);
        
        const yearsUntilGraduation = graduation_year - currentYear;
        console.log(`Лет до выпуска: ${yearsUntilGraduation}`);
        
        let newClassCourse;

        if (yearsUntilGraduation <= 0) { 
            newClassCourse = null; 
        } else if (class_course >= 1 && class_course <= 4 && graduation_year < currentYear) { 
            console.log(`→ На СПО, но год выпуска прошел`);
            newClassCourse = class_course;
        } else if (class_course >= 1 && class_course <= 10) {
            newClassCourse = class_course + 1; 
        } else if (class_course === 11) {
            console.log(`→ 11 класс, год выпуска не изменен`);
            newClassCourse = class_course;
        } else if (class_course >= 1 && class_course <= 3) {
            const expectedCourse = class_course + 1;
            const maxCourseForYear = 5 - yearsUntilGraduation; 
            newClassCourse = Math.min(expectedCourse, maxCourseForYear);
        } else if (class_course === 4) {
            newClassCourse = class_course;
        } else {
            newClassCourse = class_course;
        }
        
        console.log(`Новый класс: ${newClassCourse}`);
        
        if (newClassCourse !== null && newClassCourse !== class_course) {
            await pool.query('UPDATE users SET class_course = $1 WHERE user_id = $2', [newClassCourse, user_id]);
            updatedCount++;
            console.log(`✅ Обновлено: ${class_course} -> ${newClassCourse}`);
        } else {
            console.log(`Класс не изменился (${class_course})`);
        }
    }
    
    console.log(`\nОбновлено ${updatedCount} пользователей`);
}

// Проверка результатов
async function checkResults() {
    console.log('\n РЕЗУЛЬТАТЫ \n');
    
    const expected = [
        { name: 'Тестовый 9 класс', old: 9, new: 10 },
        { name: 'Тестовый 11 класс', old: 11, new: 11 },
        { name: 'Тестовый СПО 1 курс', old: 1, new: 2 },
        { name: 'Тестовый 10 класс', old: 10, new: 11 },
        { name: 'Тестовый СПО 3 курс', old: 3, new: 4 }
    ];
    
    const result = await pool.query(
        "SELECT user_id, full_name, class_course, graduation_year FROM users WHERE full_name LIKE 'Тестовый%' ORDER BY user_id"
    );
    
    let passed = 0;
    
    for (const user of result.rows) {
        const exp = expected.find(e => user.full_name.includes(e.name.replace('Тестовый ', '')));
        const success = exp && user.class_course === exp.new;
        
        console.log(`${success ? '✅' : '❌'} ${user.full_name}`);
        console.log(`   Класс: ${exp?.old || '?'} -> ${user.class_course} (ожидалось: ${exp?.new || '?'})`);
        console.log(`   Год выпуска: ${user.graduation_year}`);
        
        if (success) passed++;
    }
    
    console.log(`\n Результат: ${passed}/${expected.length} тестов пройдено`);
    console.log(passed === expected.length ? '\n🎉 CRON работает правильно!' : '\n Есть ошибки в логике');
}

async function runCronTest() {
    try {
        await createTestUsers();
        await updateUsersClasses();
        await checkResults();
    } catch (error) {
        console.error('Ошибка теста:', error.message);
    } finally {
        await pool.end();
        console.log('\nТест завершен');
    }
}

runCronTest();