const request = require('supertest');
const express = require('express');
const adminRoutes = require('../routes/admin');
const { db, decryptData } = require('../db');

const app = express();
app.use(express.json());
app.use('/', adminRoutes);

describe('Admin routes', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        // Явно задаём поведение decryptData для каждого теста
        decryptData.mockImplementation((text) => {
            if (!text) return null;
            if (text.startsWith('enc_')) return text.slice(4);
            return text;
        });
    });

    describe('GET /admin/users', () => {
        it('should return list of users with decrypted data', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ is_admin: true, is_moderator: false }] });
            db.query.mockResolvedValueOnce({
                rows: [
                    { user_id: 1, full_name: 'User1', phone_number: 'enc_79261234567', email: 'enc_user1@example.com', is_verified: true },
                    { user_id: 2, full_name: 'User2', phone_number: 'enc_79998887766', email: null, is_verified: false }
                ]
            });
            const res = await request(app).get('/admin/users').set('x-user-id', '1');
            expect(res.status).toBe(200);
            expect(res.body[0].phone_number).toBe('79261234567');
            expect(res.body[0].email).toBe('user1@example.com');
            expect(res.body[1].phone_number).toBe('79998887766');
            expect(res.body[1].email).toBe(null);
        });
    });

    describe('POST /admin/users', () => {
        it('should create new user with encrypted phone', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ is_admin: true, is_moderator: false }] });
            db.query.mockResolvedValueOnce({ rows: [] });
            db.query.mockResolvedValueOnce({ rows: [{ user_id: 99, full_name: 'Created', phone_number: 'enc_79260001122', email: null }] });
            const res = await request(app)
                .post('/admin/users')
                .set('x-user-id', '1')
                .send({
                    full_name: 'Created User',
                    phone_number: '+79260001122',
                    email: '',
                    birth_date: '2000-01-01',
                    class_course: 10,
                    school: 'School'
                });
            expect(res.status).toBe(201);
            expect(res.body.user.user_id).toBe(99);
        });
    });

    describe('PATCH /admin/documents/:id', () => {
        it('should update document status and broadcast leaderboard', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ is_admin: true, is_moderator: false }] });
            db.query.mockResolvedValueOnce({ rows: [{ user_id: 123, status: 'На рассмотрении', points: 0, category_id: 1 }] });
            db.query.mockResolvedValueOnce({ rows: [{ max_points: 30 }] });
            db.query.mockResolvedValueOnce({ rows: [{ total_points: 10 }] });
            db.query.mockResolvedValueOnce({ rows: [{ document_id: 5, document_name: 'Doc', status: 'Одобрено', points: 20, comment: null, category_id: 1, user_id: 123 }] });
            const res = await request(app)
                .patch('/admin/documents/5')
                .set('x-user-id', '1')
                .send({ status: 'Одобрено', points: 20, category_id: 1 });
            expect(res.status).toBe(200);
            expect(res.body.document.status).toBe('Одобрено');
        });
    });

    describe('GET /admin/stats', () => {
        it('should return registered and online users count', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ is_admin: true, is_moderator: false }] });
            db.query.mockResolvedValueOnce({ rows: [{ count: '100' }] });
            db.query.mockResolvedValueOnce({ rows: [{ count: '15' }] });
            const res = await request(app).get('/admin/stats').set('x-user-id', '1');
            expect(res.status).toBe(200);
            expect(res.body.registeredUsers).toBe(100);
            expect(res.body.onlineUsers).toBe(15);
        });
    });

    describe('GET /admin/users/search', () => {
        it('should search users by phone (exact match)', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ is_admin: true, is_moderator: false }] });
            db.query.mockResolvedValueOnce({
                rows: [{ user_id: 2, full_name: 'Found', phone_number: 'enc_79261112233', email: 'found@example.com' }]
            });
            const res = await request(app).get('/admin/users/search?query=79261112233').set('x-user-id', '1');
            expect(res.status).toBe(200);
            expect(res.body.users[0].phone_number).toBe('79261112233');
        });
    });

    // ========== НОВЫЕ ТЕСТЫ (с явными моками) ==========

    describe('GET /admin/positions', () => {
        it('должен вернуть список должностей', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ is_admin: true }] });
            db.query.mockResolvedValueOnce({
                rows: [
                    { position_id: 1, position_name: 'Оператор ПК' },
                    { position_id: 2, position_name: 'Специалист по документам' }
                ]
            });
            const res = await request(app).get('/admin/positions').set('x-user-id', '1');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
            expect(res.body[0].position_name).toBe('Оператор ПК');
        });
    });

    describe('GET /admin/moderators', () => {
        it('должен вернуть список модераторов с расшифрованным email', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ is_admin: true }] });
            db.query.mockResolvedValueOnce({
                rows: [
                    { user_id: 10, full_name: 'Модератор 1', email: 'enc_mod1@example.com', login: 'mod1', position_id: 1, position_name: 'Оператор', registration_date: new Date() },
                    { user_id: 11, full_name: 'Модератор 2', email: 'enc_mod2@example.com', login: 'mod2', position_id: 2, position_name: 'Специалист', registration_date: new Date() }
                ]
            });
            const res = await request(app).get('/admin/moderators').set('x-user-id', '1');
            expect(res.status).toBe(200);
            expect(res.body[0].email).toBe('mod1@example.com');
            expect(res.body[1].email).toBe('mod2@example.com');
        });
    });

    describe('POST /admin/moderators', () => {
        it('должен создать нового модератора с зашифрованным email', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ is_admin: true }] });
            db.query.mockResolvedValueOnce({ rows: [{ position_id: 3 }] });
            db.query.mockResolvedValueOnce({
                rows: [{ user_id: 99, login: 'newmod', full_name: 'Новый Модератор', email: 'enc_newmod@example.com' }]
            });
            const res = await request(app)
                .post('/admin/moderators')
                .set('x-user-id', '1')
                .send({
                    login: 'newmod',
                    full_name: 'Новый Модератор',
                    email: 'newmod@example.com',
                    position_name: 'Специалист',
                    password: 'pass123'
                });
            expect(res.status).toBe(201);
            expect(res.body.user.full_name).toBe('Новый Модератор');
            expect(res.body.generated_password).toBe('pass123');
        });
    });

    describe('PATCH /admin/moderators/:id', () => {
        it('должен обновить данные модератора (email шифруется)', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ is_admin: true }] });
            db.query.mockResolvedValueOnce({ rows: [{ position_id: 2 }] });
            db.query.mockResolvedValueOnce({
                rows: [{ user_id: 10, full_name: 'Обновлённый', email: 'enc_updated@example.com', position_id: 2 }]
            });
            const res = await request(app)
                .patch('/admin/moderators/10')
                .set('x-user-id', '1')
                .send({
                    full_name: 'Обновлённый',
                    email: 'updated@example.com',
                    position_name: 'Старший специалист'
                });
            expect(res.status).toBe(200);
            expect(res.body.user.full_name).toBe('Обновлённый');
        });
    });

    describe('DELETE /admin/moderators/:id', () => {
        it('должен удалить модератора', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ is_admin: true }] });
            db.query.mockResolvedValueOnce({ rows: [{ user_id: 10 }] });
            const res = await request(app).delete('/admin/moderators/10').set('x-user-id', '1');
            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Модератор успешно удален');
        });
    });

    describe('GET /admin/users/:id', () => {
        it('должен вернуть детали пользователя с расшифрованными данными и родителями', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ is_admin: true, is_moderator: false }] });
            db.query.mockResolvedValueOnce({
                rows: [{
                    user_id: 123,
                    full_name: 'Тестов Пользователь',
                    phone_number: 'enc_79261234567',
                    email: 'enc_test@example.com',
                    birth_date: '2005-05-15',
                    class_course: 11,
                    school: 'Школа №1',
                    created_by_admin: false,
                    is_verified: true,
                    is_adult: false,
                    parent_name: 'Родитель Родителевич',
                    parent_phone: 'enc_79001112233'
                }]
            });
            const res = await request(app).get('/admin/users/123').set('x-user-id', '1');
            expect(res.status).toBe(200);
            expect(res.body.user.phone_number).toBe('79261234567');
            expect(res.body.user.email).toBe('test@example.com');
            expect(res.body.user.parent_phone).toBe('79001112233');
        });
    });

    describe('PATCH /admin/users/:id/verify', () => {
        it('должен подтвердить аккаунт пользователя', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ is_admin: true, is_moderator: false }] });
            db.query.mockResolvedValueOnce({
                rows: [{ user_id: 123, full_name: 'Тестов', is_verified: true }]
            });
            const res = await request(app)
                .patch('/admin/users/123/verify')
                .set('x-user-id', '1')
                .send({ is_verified: true });
            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Аккаунт подтвержден');
        });
    });

    describe('GET /admin/documents', () => {
        it('должен вернуть список документов с данными пользователя и категорий', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ is_admin: true, is_moderator: false }] });
            db.query.mockResolvedValueOnce({
                rows: [{
                    document_id: 1,
                    document_name: 'Грамота',
                    status: 'Одобрено',
                    points: 10,
                    received_date: '2025-01-01',
                    comment: null,
                    file_path: '/uploads/doc1.pdf',
                    user_id: 123,
                    category_id: 1,
                    student_name: 'Иванов Иван',
                    category_name: 'Научная деятельность'
                }]
            });
            const res = await request(app).get('/admin/documents').set('x-user-id', '1');
            expect(res.status).toBe(200);
            expect(res.body[0].document_name).toBe('Грамота');
        });
    });

    describe('POST /admin/categories', () => {
        it('должен добавить новую категорию наград', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ is_admin: true }] });
            db.query.mockResolvedValueOnce({
                rows: [{ category_id: 10, category_name: 'Новая категория', max_points: 50 }]
            });
            const res = await request(app)
                .post('/admin/categories')
                .set('x-user-id', '1')
                .send({ category_name: 'Новая категория', max_points: 50 });
            expect(res.status).toBe(201);
            expect(res.body.category.category_name).toBe('Новая категория');
        });
    });

    describe('PATCH /admin/categories/:id', () => {
        it('должен обновить категорию', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ is_admin: true }] });
            db.query.mockResolvedValueOnce({
                rows: [{ category_id: 5, category_name: 'Обновлённая', max_points: 100 }]
            });
            const res = await request(app)
                .patch('/admin/categories/5')
                .set('x-user-id', '1')
                .send({ category_name: 'Обновлённая', max_points: 100 });
            expect(res.status).toBe(200);
            expect(res.body.category.category_name).toBe('Обновлённая');
        });
    });

    describe('DELETE /admin/categories/:id', () => {
        it('должен удалить категорию', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ is_admin: true }] });
            db.query.mockResolvedValueOnce({ rows: [] });
            const res = await request(app).delete('/admin/categories/5').set('x-user-id', '1');
            expect(res.status).toBe(200);
            expect(res.body.message).toBe('Категория удалена');
        });
    });

    describe('POST /admin/documents/manual', () => {
        it('должен добавить документ вручную (админ/модератор)', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ is_admin: true, is_moderator: false }] });
            db.query.mockResolvedValueOnce({ rows: [{ document_id: 42 }] });
            const res = await request(app)
                .post('/admin/documents/manual')
                .set('x-user-id', '1')
                .field('user_id', '123')
                .field('document_name', 'Ручной документ')
                .field('category_id', '1')
                .field('points', '15')
                .field('received_date', '2025-01-10')
                .attach('file', Buffer.from('test'), 'test.pdf');
            expect(res.status).toBe(201);
            expect(res.body.documentId).toBe(42);
        });
    });

    describe('GET /admin/users/:id/category/:categoryId/available-points', () => {
        it('должен вернуть доступные баллы для категории пользователя', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ is_admin: true, is_moderator: false }] });
            db.query.mockResolvedValueOnce({
                rows: [{ category_name: 'Наука', max_points: 60 }]
            });
            db.query.mockResolvedValueOnce({ rows: [{ total_points: 25 }] });
            const res = await request(app)
                .get('/admin/users/123/category/2/available-points')
                .set('x-user-id', '1');
            expect(res.status).toBe(200);
            expect(res.body.max_points).toBe(60);
            expect(res.body.available_points).toBe(35);
        });
    });

    describe('GET /admin/events', () => {
        it('должен вернуть список мероприятий', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ is_admin: true, is_moderator: false }] });
            db.query.mockResolvedValueOnce({
                rows: [
                    { event_id: 1, event_name: 'День открытых дверей', event_date: '2025-04-20' },
                    { event_id: 2, event_name: 'Олимпиада', event_date: '2025-03-15' }
                ]
            });
            const res = await request(app).get('/admin/events').set('x-user-id', '1');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(2);
        });
    });

    describe('POST /admin/events', () => {
        it('должен создать новое мероприятие', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ is_admin: true, is_moderator: false }] });
            db.query.mockResolvedValueOnce({ rows: [{ event_id: 10 }] });
            const res = await request(app)
                .post('/admin/events')
                .set('x-user-id', '1')
                .send({ event_name: 'Новое событие', event_date: '2025-12-01', category_id: 1 });
            expect(res.status).toBe(201);
            expect(res.body.eventId).toBe(10);
        });
    });

    describe('POST /admin/find-user', () => {
        it('должен найти пользователя по ФИО и телефону (точное совпадение)', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ is_admin: true, is_moderator: false }] });
            db.query.mockResolvedValueOnce({
                rows: [{ user_id: 123, full_name: 'Иванов Иван', phone_number: 'enc_79261234567', email: 'enc_ivan@example.com' }]
            });
            const res = await request(app)
                .post('/admin/find-user')
                .set('x-user-id', '1')
                .send({ full_name: 'Иванов', phone_number: '+79261234567' });
            expect(res.status).toBe(200);
            expect(res.body.user.phone_number).toBe('79261234567');
        });
    });

    describe('GET /admin/documents/pending', () => {
        it('должен вернуть документы на модерации', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ is_admin: true, is_moderator: false }] });
            db.query.mockResolvedValueOnce({
                rows: [{
                    document_id: 5,
                    document_name: 'Справка',
                    status: 'На рассмотрении',
                    category_id: 1,
                    comment: null,
                    file_path: '/uploads/doc.pdf',
                    user_id: 123,
                    student_name: 'Петров Петр',
                    upload_date: '2025-04-10',
                    category_name: 'Профориентация'
                }]
            });
            const res = await request(app).get('/admin/documents/pending').set('x-user-id', '1');
            expect(res.status).toBe(200);
            expect(res.body[0].document_name).toBe('Справка');
        });
    });

    describe('GET /moderator/documents/pending', () => {
        it('должен вернуть документы на модерацию для модератора', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ is_moderator: true }] });
            db.query.mockResolvedValueOnce({
                rows: [{
                    document_id: 6,
                    document_name: 'Диплом',
                    status: 'На рассмотрении',
                    category_id: 2,
                    user_id: 124,
                    student_name: 'Сидоров Сидор',
                    upload_date: '2025-04-11'
                }]
            });
            const res = await request(app)
                .get('/moderator/documents/pending')
                .set('x-user-id', '2');
            expect(res.status).toBe(200);
            expect(res.body[0].document_name).toBe('Диплом');
        });
    });

    describe('PATCH /moderator/documents/:id', () => {
        it('модератор может одобрить документ с проверкой лимита баллов', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ is_moderator: true }] });
            db.query.mockResolvedValueOnce({ rows: [{ user_id: 123, status: 'На рассмотрении', points: 0, category_id: 1 }] });
            db.query.mockResolvedValueOnce({ rows: [{ max_points: 30 }] });
            db.query.mockResolvedValueOnce({ rows: [{ total_points: 10 }] });
            db.query.mockResolvedValueOnce({
                rows: [{ document_id: 5, document_name: 'Док', status: 'Одобрено', points: 15, comment: null, received_date: '2025-01-01' }]
            });
            const res = await request(app)
                .patch('/moderator/documents/5')
                .set('x-user-id', '2')
                .send({ status: 'Одобрено', points: 15 });
            expect(res.status).toBe(200);
            expect(res.body.document.status).toBe('Одобрено');
        });
    });

    describe('GET /download/:documentId', () => {
        it('администратор может скачать файл документа (файл не найден – 404)', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ is_admin: true, is_moderator: false }] });
            db.query.mockResolvedValueOnce({ rows: [{ file_path: '/uploads/doc-123.pdf' }] });
            const res = await request(app).get('/download/1').set('x-user-id', '1');
            expect(res.status).toBe(404);
        });
    });

    describe('GET /admin/categories/stats', () => {
        it('должен вернуть статистику по категориям с количеством одобренных документов', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ is_admin: true, is_moderator: false }] });
            db.query.mockResolvedValueOnce({
                rows: [
                    { category_id: 1, category_name: 'Профориентационные мероприятия КГПИ КемГУ', achievement_count: 45 },
                    { category_id: 2, category_name: 'Научно-исследовательская деятельность в КГПИ КемГУ', achievement_count: 23 },
                    { category_id: 3, category_name: 'Творческие конкурсы и фестивали на базе КГПИ КемГУ', achievement_count: 67 }
                ]
            });

            const res = await request(app)
                .get('/admin/categories/stats')
                .set('x-user-id', '1');

            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(3);
            expect(res.body[0].category_name).toBe('Профориентационные мероприятия КГПИ КемГУ');
            expect(res.body[0].achievement_count).toBe(45);
        });

        it('должен вернуть пустой массив, если категорий нет', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ is_admin: true, is_moderator: false }] });
            db.query.mockResolvedValueOnce({ rows: [] });

            const res = await request(app)
                .get('/admin/categories/stats')
                .set('x-user-id', '1');

            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });

        it('должен вернуть 403, если пользователь не админ и не модератор', async () => {
            db.query.mockResolvedValueOnce({ rows: [{ is_admin: false, is_moderator: false }] });

            const res = await request(app)
                .get('/admin/categories/stats')
                .set('x-user-id', '123');

            expect(res.status).toBe(403);
            expect(res.body.message).toMatch(/Доступ запрещен/);
        });
    });
});