// Тест CRON: Проверка удаления старых документов и подсчета баллов с лимитами
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

// Глобальные переменные для хранения ID созданных сущностей
let testUserId;
let testCategoryId;

// 1. Подготовка тестовых данных
async function setupTestEnvironment() {
    console.log('=== ЭТАП 1: ПОДГОТОВКА СРЕДЫ ===');
    try {
        // Создаем тестового пользователя
        const userRes = await pool.query(`
            INSERT INTO users (full_name, phone_number, birth_date, password, login) 
            VALUES ('CRON Тестер', '+70001112233', '2005-01-01', 'password123', 'cron_tester')
            ON CONFLICT (login) DO UPDATE SET full_name = EXCLUDED.full_name
            RETURNING user_id
        `);
        testUserId = userRes.rows[0].user_id;
        console.log(`✅ Создан тестовый пользователь (ID: ${testUserId})`);

        // Создаем тестовую категорию с лимитом 100
        const catRes = await pool.query(`
            INSERT INTO event_categories (category_name, max_points) 
            VALUES ('CRON Тестовая категория', 100)
            ON CONFLICT (category_name) DO UPDATE SET max_points = EXCLUDED.max_points
            RETURNING category_id, max_points
        `);
        testCategoryId = catRes.rows[0].category_id;
        console.log(`✅ Создана тестовая категория (ID: ${testCategoryId}, Лимит: ${catRes.rows[0].max_points} баллов)`);

        // Очищаем старые документы этого пользователя, если остались от прошлых тестов
        await pool.query('DELETE FROM documents WHERE user_id = $1', [testUserId]);

        // Добавляем документы
        console.log('\nДобавление документов...');
        const docs = [
            // Свежий документ 1 (60 баллов)
            { name: 'Свежая грамота 1', points: 60, date: new Date().toISOString().split('T')[0] },
            // Свежий документ 2 (60 баллов) - Сумма будет 120, но лимит обрежет до 100
            { name: 'Свежая грамота 2', points: 60, date: new Date(Date.now() - 86400000).toISOString().split('T')[0] },
            // Очень старый документ (50 баллов) - Ему 4 года
            { name: 'Древняя грамота', points: 50, date: new Date(Date.now() - 4 * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0] }
        ];

        for (const doc of docs) {
            await pool.query(`
                INSERT INTO documents (document_name, status, category_id, points, user_id, received_date)
                VALUES ($1, 'Одобрено', $2, $3, $4, $5)
            `, [doc.name, testCategoryId, doc.points, testUserId, doc.date]);
            console.log(`  + Создан документ: "${doc.name}" | Баллы: ${doc.points} | Дата: ${doc.date}`);
        }

    } catch (e) {
        console.error('❌ Ошибка при подготовке среды:', e.message);
        throw e;
    }
}

// 2. Функция подсчета баллов (копия логики из server.js GET /profile/:id/total-points)
async function calculateTotalPoints() {
    try {
        const result = await pool.query(`
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
        `, [testUserId]);

        return parseInt(result.rows[0].total_points);
    } catch (e) {
        console.error('❌ Ошибка при подсчете баллов:', e.message);
        throw e;
    }
}

// 3. Сама функция CRON, которую мы тестируем
async function runCronCleanup() {
    console.log('\n=== ЭТАП 3: ЗАПУСК CRON ОЧИСТКИ ===');
    try {
        console.log('Ищем документы старше 3 лет...');

        const result = await pool.query(`
            DELETE FROM documents 
            WHERE received_date < CURRENT_DATE - INTERVAL '3 years'
            RETURNING document_id, document_name, received_date
        `);

        console.log(`✅ CRON отработал. Удалено документов: ${result.rowCount}`);
        if (result.rowCount > 0) {
            result.rows.forEach(row => {
                const date = new Date(row.received_date).toISOString().split('T')[0];
                console.log(`  - Удален: "${row.document_name}" (Дата выдачи: ${date})`);
            });
        }
    } catch (error) {
        console.error('❌ CRON Ошибка:', error.message);
        throw error;
    }
}

// 4. Главная функция-оркестратор
async function executeTest() {
    try {
        await setupTestEnvironment();

        console.log('\n=== ЭТАП 2: ПРОВЕРКА БАЛЛОВ ДО CRON ===');
        const pointsBefore = await calculateTotalPoints();
        console.log(`Итоговые баллы: ${pointsBefore}`);
        if (pointsBefore === 100) {
            console.log('✅ Успех: Общая сумма (60+60=120) корректно обрезана до лимита категории (100). Старый документ проигнорирован.');
        } else {
            console.log('❌ Ошибка: Подсчет баллов работает неверно!');
        }

        await runCronCleanup();

        console.log('\n=== ЭТАП 4: ПРОВЕРКА ПОСЛЕ CRON ===');

        // Проверяем, остались ли старые документы в базе физически
        const remainingDocs = await pool.query('SELECT COUNT(*) FROM documents WHERE user_id = $1', [testUserId]);
        console.log(`Осталось документов в БД: ${remainingDocs.rows[0].count} (Ожидается: 2)`);

        if (parseInt(remainingDocs.rows[0].count) === 2) {
            console.log('✅ Успех: Старый документ успешно удален из базы.');
        } else {
            console.log('❌ Ошибка: Документы не удалились!');
        }

        const pointsAfter = await calculateTotalPoints();
        console.log(`Итоговые баллы после очистки: ${pointsAfter}`);
        if (pointsAfter === 100) {
            console.log('✅ Успех: Баллы не изменились (как и задумывалось).');
        } else {
            console.log('❌ Ошибка: Баллы изменились после удаления старого документа!');
        }

    } catch (e) {
        console.log('\n💥 Тест прерван из-за ошибки.');
    } finally {
        console.log('\n=== ЭТАП 5: УБОРКА МУСОРА ===');
        if (testUserId) await pool.query('DELETE FROM users WHERE user_id = $1', [testUserId]);
        if (testCategoryId) await pool.query('DELETE FROM event_categories WHERE category_id = $1', [testCategoryId]);
        console.log('✅ Тестовые данные удалены.');
        await pool.end();
    }
}

executeTest();