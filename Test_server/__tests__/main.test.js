const request = require('supertest');
const express = require('express');
const { router: mainRoutes } = require('../routes/main');
const { db } = require('../db');

// Создаём приложение только с mainRoutes для тестов
const app = express();
app.use(express.json());
app.use('/', mainRoutes);

describe('Main routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('POST /registration', () => {
        it('успешно зарегистрировать нового пользователя', async () => {
            db.query.mockImplementation((sql, params) => {
                if (sql.includes('SELECT')) return Promise.resolve({ rows: [] }); // нет существующего
                if (sql.includes('INSERT INTO users')) return Promise.resolve({ rows: [{ user_id: 123, token: 'mock-token' }] });
                return Promise.resolve({ rows: [] });
            });

            const res = await request(app)
                .post('/registration')
                .send({
                    lastName: 'Тест',
                    firstName: 'Тест',
                    middleName: 'Тестович',
                    phoneNumber: '+79261234567',
                    email: 'test@example.com',
                    birthDate: '15.03.2005',
                    graduationYear: '2027',
                    courseClass: '11',
                    password: 'TestPass123!'
                });

            expect(res.status).toBe(201);
            expect(res.body.status).toBe('yea');
            expect(res.body.userId).toBe(123);
        });

        it('должен вернуть 409, если телефон уже существует с логином', async () => {
            db.query.mockImplementation((sql) => {
                if (sql.includes('SELECT') && sql.includes('REGEXP_REPLACE')) {
                    return Promise.resolve({ rows: [{ user_id: 1, login: 'existing', password: 'hash' }] });
                }
                return Promise.resolve({ rows: [] });
            });

            const res = await request(app)
                .post('/registration')
                .send({
                    lastName: 'Тест',
                    firstName: 'Тест',
                    middleName: 'Тестович',
                    phoneNumber: '+79261234567',
                    email: 'test@example.com',
                    birthDate: '15.03.2005',
                    graduationYear: '2027',
                    courseClass: '11',
                    password: 'TestPass123!'
                });
            expect(res.status).toBe(409);
            expect(res.body.message).toMatch(/уже зарегистрирован/);
        });
    });

    describe('POST /login', () => {
        it('войти в систему с правильными учетными данными', async () => {
            db.query.mockResolvedValueOnce({
                rows: [{
                    user_id: 1,
                    full_name: 'Admin',
                    password: 'salt:hash', // формат хеша
                    is_admin: true,
                    is_moderator: false,
                    email: 'admin@example.com',
                    login: 'admin'
                }]
            });
            // verifyPassword должна вернуть true
            const { verifyPassword } = require('../db');
            verifyPassword.mockReturnValueOnce(true);

            const res = await request(app)
                .post('/login')
                .send({ email: 'admin@example.com', password: 'correct123' });

            expect(res.status).toBe(200);
            expect(res.body.status).toBe('yea');
            expect(res.body.user.user_id).toBe(1);
        });

        it('должен вернуть 401 из-за неправильного пароля', async () => {
            db.query.mockResolvedValueOnce({
                rows: [{ user_id: 1, password: 'salt:hash', email: 'admin@example.com' }]
            });
            const { verifyPassword } = require('../db');
            verifyPassword.mockReturnValueOnce(false);

            const res = await request(app)
                .post('/login')
                .send({ email: 'admin@example.com', password: 'wrong' });
            expect(res.status).toBe(401);
            expect(res.body.field).toBe('password');
        });
    });

    describe('GET /profile/:id', () => {
        it('должен вернуться профиль с расшифрованным телефоном/электронной почтой', async () => {
            db.query.mockResolvedValueOnce({
                rows: [{
                    full_name: 'Test User',
                    phone_number: 'enc_79261234567',
                    email: 'enc_test@example.com',
                    birth_date: '2000-01-01',
                    class_course: 11,
                    graduation_year: 2027,
                    registration_date: new Date(),
                    token: null,
                    is_verified: true
                }]
            });

            const res = await request(app)
                .get('/profile/123')
                .set('x-user-id', '123');
            expect(res.status).toBe(200);
            expect(res.body.phone_number).toBe('79261234567');
            expect(res.body.email).toBe('test@example.com');
        });
    });

    describe('PATCH /profile/:id', () => {
        it('обновить профиль', async () => {
            db.query.mockResolvedValueOnce({
                rows: [{
                    user_id: 123,
                    full_name: 'Updated Name',
                    phone_number: 'enc_79998887766',
                    email: 'enc_new@example.com',
                    birth_date: '2000-01-01',
                    class_course: 10,
                    school: 'School'
                }]
            });

            const res = await request(app)
                .patch('/profile/123')
                .set('x-user-id', '123')
                .send({
                    full_name: 'Updated Name',
                    phone_number: '+79998887766',
                    email: 'new@example.com'
                });
            expect(res.status).toBe(200);
            expect(res.body.user.phone_number).toBe('79998887766');
            expect(res.body.user.email).toBe('new@example.com');
        });
    });

    describe('POST /documents/upload', () => {
        it('загрузить документ и вернуть 201', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ document_id: 42 }] });
            const res = await request(app)
                .post('/documents/upload')
                .set('x-user-id', '123')
                .field('document_name', 'Test Doc')
                .field('received_date', '2025-01-01')
                .attach('file', Buffer.from('test content'), 'test.pdf');
            expect(res.status).toBe(201);
            expect(res.body.documentId).toBe(42);
        });
    });

    describe('GET /categories', () => {
        it('должен вернуть список категорий мероприятий', async () => {
            db.query.mockResolvedValueOnce({
                rows: [
                    { category_id: 1, category_name: 'Профориентация', max_points: 30 },
                    { category_id: 2, category_name: 'Наука', max_points: 60 }
                ]
            });
            const res = await request(app).get('/categories');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
            expect(res.body[0].category_name).toBe('Профориентация');
        });
    });

    describe('PATCH /documents/:id', () => {
        it('должен обновить документ (владелец, статус "На рассмотрении")', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ user_id: 123, status: 'На рассмотрении' }] });
            db.query.mockResolvedValueOnce({
                rows: [{
                    document_id: 5,
                    document_name: 'Новое название',
                    category_id: 2,
                    file_path: '/uploads/doc.pdf',
                    status: 'На рассмотрении'
                }]
            });
            const res = await request(app)
                .patch('/documents/5')
                .set('x-user-id', '123')
                .send({ document_name: 'Новое название', category_id: 2 });
            expect(res.status).toBe(200);
            expect(res.body.document.document_name).toBe('Новое название');
        });

        it('должен вернуть 403 при попытке редактирования чужого документа', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ user_id: 999, status: 'На рассмотрении' }] });
            const res = await request(app)
                .patch('/documents/5')
                .set('x-user-id', '123')
                .send({ document_name: 'Чужой документ' });
            expect(res.status).toBe(403);
        });

        it('должен вернуть 400 при попытке редактировать документ не со статусом "На рассмотрении"', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ user_id: 123, status: 'Одобрено' }] });
            const res = await request(app)
                .patch('/documents/5')
                .set('x-user-id', '123')
                .send({ document_name: 'Уже одобрено' });
            expect(res.status).toBe(400);
        });
    });

    describe('DELETE /documents/:id', () => {
        it('владелец может удалить свой документ со статусом "На рассмотрении"', async () => {
            // Проверка документа и прав
            db.query.mockResolvedValueOnce({ rows: [{ user_id: 123, status: 'На рассмотрении', is_admin: false }] });
            // Проверка is_admin (вспомогательный запрос)
            db.query.mockResolvedValueOnce({ rows: [{ is_admin: false }] });
            // Удаление
            db.query.mockResolvedValueOnce({});
            const res = await request(app)
                .delete('/documents/5')
                .set('x-user-id', '123');
            expect(res.status).toBe(200);
        });

        it('администратор может удалить любой документ', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ user_id: 999, status: 'Одобрено', is_admin: false }] });
            db.query.mockResolvedValueOnce({ rows: [{ is_admin: true }] });
            db.query.mockResolvedValueOnce({});
            const res = await request(app)
                .delete('/documents/5')
                .set('x-user-id', '1'); // админ
            expect(res.status).toBe(200);
        });
    });

    describe('GET /leaderboard', () => {
        it('должен вернуть отсортированный по баллам список пользователей', async () => {
            db.query.mockResolvedValueOnce({
                rows: [
                    { user_id: 2, full_name: 'Иванов', class_course: 11, school: 'Школа 1', total_points: 150 },
                    { user_id: 3, full_name: 'Петров', class_course: 10, school: 'Школа 2', total_points: 80 }
                ]
            });
            const res = await request(app).get('/leaderboard');
            expect(res.status).toBe(200);
            expect(res.body[0].total_points).toBe(150);
            expect(res.body[1].total_points).toBe(80);
        });
    });

    describe('GET /profile-by-login/:login', () => {
        it('должен вернуть профиль пользователя по логину с расшифровкой телефона/email', async () => {
            db.query.mockResolvedValueOnce({
                rows: [{
                    full_name: 'Тестов Тест',
                    email: 'enc_test@example.com',
                    phone_number: 'enc_79261234567',
                    birth_date: '2000-01-01',
                    class_course: 11,
                    school: 'Школа',
                    graduation_year: 2027,
                    registration_date: new Date(),
                    token: null,
                    is_verified: true,
                    user_id: 123,
                    login: 'testuser'
                }]
            });
            const res = await request(app)
                .get('/profile-by-login/testuser')
                .set('x-user-id', '123');
            expect(res.status).toBe(200);
            expect(res.body.phone_number).toBe('79261234567');
            expect(res.body.email).toBe('test@example.com');
        });
    });

    describe('GET /profile/:id/total-points', () => {
        it('должен вернуть общую сумму баллов пользователя', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ total_points: 125 }] });
            const res = await request(app).get('/profile/123/total-points');
            expect(res.status).toBe(200);
            expect(res.body.total_points).toBe(125);
        });
    });

    describe('GET /user-documents/:userId', () => {
        it('владелец может получить свои документы', async () => {
            db.query.mockResolvedValueOnce({
                rows: [
                    { document_id: 1, document_name: 'Грамота', status: 'Одобрено', points: 10, comment: null, category_id: 1, file_path: '/uploads/doc1.pdf' }
                ]
            });
            const res = await request(app)
                .get('/user-documents/123')
                .set('x-user-id', '123');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(1);
        });

        it('администратор может получить документы другого пользователя', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ is_admin: true, is_moderator: false }] });
            db.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(app)
                .get('/user-documents/999')
                .set('x-user-id', '1');
            expect(res.status).toBe(200);
        });
    });

    describe('POST /verify-token', () => {
        it('должен подтвердить аккаунт при корректном токене', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ user_id: 123, full_name: 'User', last_session_time: new Date() }] });
            db.query.mockResolvedValueOnce({ rows: [{ user_id: 123, full_name: 'User', login: 'user', email: 'user@ex.com' }] });
            const res = await request(app)
                .post('/verify-token')
                .send({ token: 'correct-token' });
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('yea');
        });

        it('должен вернуть 404 при неверном токене', async () => {
            db.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(app)
                .post('/verify-token')
                .send({ token: 'wrong-token' });
            expect(res.status).toBe(404);
        });
    });

    describe('POST /update-login-by-vk', () => {
        it('должен обновить логин пользователя на vk', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ user_id: 123, login: 'old_login' }] });
            db.query.mockResolvedValueOnce({ rows: [] }); // проверка, что логин свободен
            db.query.mockResolvedValueOnce({});
            const res = await request(app)
                .post('/update-login-by-vk')
                .send({ vk_user_id: '123456', email: 'user@example.com' });
            expect(res.status).toBe(200);
            expect(res.body.newLogin).toBe('vk_123456');
        });
    });

    describe('POST /generate-verification-token', () => {
        it('должен сгенерировать токен для неверифицированного пользователя', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ user_id: 123, is_verified: false, email: 'user@ex.com' }] });
            db.query.mockResolvedValueOnce({}); // update
            const res = await request(app)
                .post('/generate-verification-token')
                .set('x-user-id', '123');
            expect(res.status).toBe(200);
            expect(res.body.token).toBe('mock-token');
        });

        it('должен вернуть 400, если аккаунт уже подтверждён', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ user_id: 123, is_verified: true, email: 'user@ex.com' }] });
            const res = await request(app)
                .post('/generate-verification-token')
                .set('x-user-id', '123');
            expect(res.status).toBe(400);
        });
    });

    describe('GET /health', () => {
        it('должен вернуть статус ok при работающей БД', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ 1: 1 }] });
            const res = await request(app).get('/health');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('ok');
        });
    });

    describe('POST /request-password-reset', () => {
        it('должен отправить письмо со ссылкой для сброса пароля', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ user_id: 123, email: 'enc_user@ex.com', full_name: 'User' }] });
            db.query.mockResolvedValueOnce({}); // update reset_token
            const { sendPasswordResetEmail } = require('../config/smtp');
            sendPasswordResetEmail.mockResolvedValueOnce(true);
            const res = await request(app)
                .post('/request-password-reset')
                .send({ email: 'user@example.com' });
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('yea');
        });
    });

    describe('POST /confirm-password-reset', () => {
        it('должен сменить пароль при корректном токене', async () => {
            const future = new Date();
            future.setHours(future.getHours() + 1);
            db.query.mockResolvedValueOnce({ rows: [{ user_id: 123, email: 'user@ex.com', reset_token_expires_at: future }] });
            db.query.mockResolvedValueOnce({}); // update password
            const res = await request(app)
                .post('/confirm-password-reset')
                .send({ token: 'valid-token', newPassword: 'NewPass123!' });
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('yea');
        });
    });

    describe('POST /request-password-reset-vk', () => {
        it('должен сгенерировать ссылку для сброса пароля через VK-бота', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ user_id: 123, email: 'user@ex.com', full_name: 'User' }] });
            db.query.mockResolvedValueOnce({}); // update reset_token
            const res = await request(app)
                .post('/request-password-reset-vk')
                .send({ identifier: 'user@example.com' });
            expect(res.status).toBe(200);
            expect(res.body.resetUrl).toContain('reset-password?token=mock-token');
        });
    });

    describe('GET /thumbnail', () => {
        it('должен сгенерировать миниатюру для изображения', async () => {
            const res = await request(app).get('/thumbnail');
            expect(res.status).toBe(400);
            expect(res.body.message).toBe('Не указан путь к файлу');
        });
    });
});