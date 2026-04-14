const WebSocket = require('ws');
const http = require('http');
const express = require('express');
const { db } = require('../db');

// Создаем изолированный WebSocket сервер для тестов
const app = express();
const testServer = http.createServer(app);
const wss = new WebSocket.Server({ server: testServer });

// Хранилища клиентов (как в основном сервере)
const leaderboardClients = new Set();
const userDocumentClients = new Map();

// WebSocket обработчик (копия логики из server.js)
wss.on('connection', (ws) => {
    ws.on('message', async (message) => {
        try {
            const data = JSON.parse(message);
            
            if (data.type === 'subscribe_leaderboard') {
                leaderboardClients.add(ws);
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
                    
                    ws.send(JSON.stringify({
                        type: 'leaderboard_update',
                        leaders: leaderboard.rows
                    }));
                } catch (dbError) {
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
                if (!userDocumentClients.has(userId.toString())) {
                    userDocumentClients.set(userId.toString(), new Set());
                }
                userDocumentClients.get(userId.toString()).add(ws);
                ws.send(JSON.stringify({
                    type: 'subscribed',
                    subscription: 'user_documents',
                    user_id: userId
                }));
            }
        } catch (error) {
            // Ошибка парсинга JSON - игнорируем
        }
    });

    ws.on('close', () => {
        leaderboardClients.delete(ws);
        userDocumentClients.forEach((clients, userId) => {
            clients.delete(ws);
            if (clients.size === 0) {
                userDocumentClients.delete(userId);
            }
        });
    });

    ws.on('error', () => {
        leaderboardClients.delete(ws);
        userDocumentClients.forEach((clients, userId) => {
            clients.delete(ws);
            if (clients.size === 0) {
                userDocumentClients.delete(userId);
            }
        });
    });
});

// Функция рассылки обновлений таблицы лидеров
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
        
        leaderboardClients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(updateMessage);
            } else {
                leaderboardClients.delete(client);
            }
        });
    } catch (error) {
        console.error('Error broadcasting leaderboard update:', error);
    }
}

// Функция уведомления о верификации
function broadcastUserVerified(userId) {
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
}

// Функция рассылки обновлений документов пользователя
async function broadcastUserDocumentsUpdate(userId) {
    const clients = userDocumentClients.get(userId.toString());
    if (!clients || clients.size === 0) return;
    try {
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
        clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            } else {
                clients.delete(client);
            }
        });
    } catch (err) {
        console.error(`Error broadcasting documents update for user ${userId}:`, err);
    }
}

// Тестовый порт
const TEST_PORT = 3001;

describe('WebSocket Server', () => {
    beforeAll((done) => {
        testServer.listen(TEST_PORT, () => {
            done();
        });
    });

    afterAll((done) => {
        wss.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.close();
            }
        });
        testServer.close(() => {
            done();
        });
    });

    beforeEach(() => {
        jest.clearAllMocks();
        leaderboardClients.clear();
        userDocumentClients.clear();
    });

    describe('Connection', () => {
        it('should establish WebSocket connection', (done) => {
            const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);
            
            ws.on('open', () => {
                expect(ws.readyState).toBe(WebSocket.OPEN);
                ws.close();
                done();
            });

            ws.on('error', (err) => {
                done(err);
            });
        });

        it('should handle multiple connections', (done) => {
            const clients = [];
            let connectedCount = 0;
            const totalClients = 3;

            for (let i = 0; i < totalClients; i++) {
                const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);
                clients.push(ws);

                ws.on('open', () => {
                    connectedCount++;
                    if (connectedCount === totalClients) {
                        expect(wss.clients.size).toBe(totalClients);
                        clients.forEach(client => client.close());
                        done();
                    }
                });

                ws.on('error', (err) => {
                    done(err);
                });
            }
        });
    });

    describe('Leaderboard Subscription', () => {
        it('should subscribe to leaderboard and receive initial data', (done) => {
            // Мокаем данные для таблицы лидеров
            db.query.mockResolvedValueOnce({
                rows: [
                    { user_id: 1, full_name: 'User One', class_course: 10, school: 'School 1', total_points: 150 },
                    { user_id: 2, full_name: 'User Two', class_course: 11, school: 'School 2', total_points: 120 }
                ]
            });

            const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);

            ws.on('open', () => {
                ws.send(JSON.stringify({ type: 'subscribe_leaderboard' }));
            });

            ws.on('message', (data) => {
                const message = JSON.parse(data);
                
                if (message.type === 'leaderboard_update') {
                    expect(message.leaders).toBeDefined();
                    expect(message.leaders.length).toBe(2);
                    expect(message.leaders[0].full_name).toBe('User One');
                    ws.close();
                    done();
                }
            });

            ws.on('error', (err) => {
                done(err);
            });
        });

        it('should add client to leaderboardClients on subscription', (done) => {
            const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);

            ws.on('open', () => {
                ws.send(JSON.stringify({ type: 'subscribe_leaderboard' }));
                
                // Даем время на обработку сообщения
                setTimeout(() => {
                    expect(leaderboardClients.size).toBe(1);
                    ws.close();
                    done();
                }, 100);
            });

            ws.on('error', (err) => {
                done(err);
            });
        });

        it('should handle database error gracefully', (done) => {
            // Мокаем ошибку базы данных
            db.query.mockRejectedValueOnce(new Error('Database error'));

            const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);

            ws.on('open', () => {
                ws.send(JSON.stringify({ type: 'subscribe_leaderboard' }));
            });

            ws.on('message', (data) => {
                const message = JSON.parse(data);
                
                if (message.type === 'error') {
                    expect(message.message).toBe('Failed to load leaderboard data');
                    ws.close();
                    done();
                }
            });

            ws.on('error', (err) => {
                done(err);
            });
        });
    });

    describe('User Documents Subscription', () => {
        it('should subscribe to user documents updates', (done) => {
            const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);
            const userId = 123;

            ws.on('open', () => {
                ws.send(JSON.stringify({
                    type: 'subscribe_user_documents',
                    user_id: userId
                }));
            });

            ws.on('message', (data) => {
                const message = JSON.parse(data);
                
                if (message.type === 'subscribed') {
                    expect(message.subscription).toBe('user_documents');
                    expect(message.user_id).toBe(userId);
                    
                    // Проверяем, что клиент добавлен в хранилище
                    expect(userDocumentClients.has(userId.toString())).toBe(true);
                    ws.close();
                    done();
                }
            });

            ws.on('error', (err) => {
                done(err);
            });
        });

        it('should return error if user_id is missing', (done) => {
            const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);

            ws.on('open', () => {
                ws.send(JSON.stringify({
                    type: 'subscribe_user_documents'
                }));
            });

            ws.on('message', (data) => {
                const message = JSON.parse(data);
                
                if (message.type === 'error') {
                    expect(message.message).toBe('user_id is required for subscribe_user_documents');
                    ws.close();
                    done();
                }
            });

            ws.on('error', (err) => {
                done(err);
            });
        });

        it('should handle multiple clients for same user', (done) => {
            const userId = 456;
            let connectedCount = 0;
            const ws1 = new WebSocket(`ws://localhost:${TEST_PORT}`);
            const ws2 = new WebSocket(`ws://localhost:${TEST_PORT}`);

            const checkComplete = () => {
                connectedCount++;
                if (connectedCount === 2) {
                    expect(userDocumentClients.get(userId.toString()).size).toBe(2);
                    ws1.close();
                    ws2.close();
                    done();
                }
            };

            [ws1, ws2].forEach((ws) => {
                ws.on('open', () => {
                    ws.send(JSON.stringify({
                        type: 'subscribe_user_documents',
                        user_id: userId
                    }));
                });

                ws.on('message', (data) => {
                    const message = JSON.parse(data);
                    if (message.type === 'subscribed') {
                        checkComplete();
                    }
                });

                ws.on('error', (err) => {
                    done(err);
                });
            });
        });
    });

    describe('Broadcast Functions', () => {
        it('should broadcast leaderboard update to all subscribed clients', (done) => {
            // Мокаем данные таблицы лидеров
            db.query.mockResolvedValue({
                rows: [
                    { user_id: 1, full_name: 'Leader One', total_points: 200 },
                    { user_id: 2, full_name: 'Leader Two', total_points: 150 }
                ]
            });

            const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);
            let receivedUpdate = false;

            ws.on('open', () => {
                // Подписываемся на обновления
                ws.send(JSON.stringify({ type: 'subscribe_leaderboard' }));

                setTimeout(async () => {
                    // Вызываем broadcast
                    await broadcastLeaderboardUpdate();
                }, 100);
            });

            ws.on('message', (data) => {
                const message = JSON.parse(data);
                
                if (message.type === 'leaderboard_update' && !receivedUpdate) {
                    receivedUpdate = true;
                    expect(message.leaders).toBeDefined();
                    expect(message.leaders.length).toBe(2);
                    ws.close();
                    done();
                }
            });

            ws.on('error', (err) => {
                done(err);
            });
        });

        it('should broadcast user verified notification', (done) => {
            const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);
            const userId = 789;

            ws.on('open', () => {
                // Подписываемся на обновления
                ws.send(JSON.stringify({ type: 'subscribe_leaderboard' }));

                setTimeout(() => {
                    // Отправляем уведомление о верификации
                    broadcastUserVerified(userId);
                }, 100);
            });

            ws.on('message', (data) => {
                const message = JSON.parse(data);
                
                if (message.type === 'user_verified') {
                    expect(message.user_id).toBe(userId);
                    expect(message.timestamp).toBeDefined();
                    ws.close();
                    done();
                }
            });

            ws.on('error', (err) => {
                done(err);
            });
        });

        it('should broadcast user documents update', (done) => {
            const userId = 101;
            
            // Мокаем данные документов
            db.query.mockResolvedValueOnce({
                rows: [
                    { document_id: 1, document_name: 'Doc 1', status: 'Одобрено', points: 20 },
                    { document_id: 2, document_name: 'Doc 2', status: 'На рассмотрении', points: 0 }
                ]
            });

            const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);

            ws.on('open', () => {
                // Подписываемся на обновления документов
                ws.send(JSON.stringify({
                    type: 'subscribe_user_documents',
                    user_id: userId
                }));

                setTimeout(async () => {
                    // Отправляем обновление документов
                    await broadcastUserDocumentsUpdate(userId);
                }, 100);
            });

            ws.on('message', (data) => {
                const message = JSON.parse(data);
                
                if (message.type === 'user_documents_update') {
                    expect(message.user_id).toBe(userId);
                    expect(message.documents).toBeDefined();
                    expect(message.documents.length).toBe(2);
                    ws.close();
                    done();
                }
            });

            ws.on('error', (err) => {
                done(err);
            });
        });

        it('should not broadcast if no clients connected', async () => {
            // Очищаем всех клиентов
            leaderboardClients.clear();
            userDocumentClients.clear();

            // Мокаем db.query чтобы проверить что он не вызывается
            db.query.mockClear();

            await broadcastLeaderboardUpdate();

            // Проверяем что запрос к базе не выполняется когда нет клиентов
            expect(db.query).not.toHaveBeenCalled();
        });
    });

    describe('Connection Cleanup', () => {
        it('should remove client from leaderboardClients on close', (done) => {
            const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);

            ws.on('open', () => {
                ws.send(JSON.stringify({ type: 'subscribe_leaderboard' }));

                setTimeout(() => {
                    expect(leaderboardClients.size).toBe(1);
                    ws.close();

                    setTimeout(() => {
                        expect(leaderboardClients.size).toBe(0);
                        done();
                    }, 100);
                }, 100);
            });

            ws.on('error', (err) => {
                done(err);
            });
        });

        it('should remove client from userDocumentClients on close', (done) => {
            const userId = 202;
            const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);

            ws.on('open', () => {
                ws.send(JSON.stringify({
                    type: 'subscribe_user_documents',
                    user_id: userId
                }));

                setTimeout(() => {
                    expect(userDocumentClients.has(userId.toString())).toBe(true);
                    ws.close();

                    setTimeout(() => {
                        expect(userDocumentClients.has(userId.toString())).toBe(false);
                        done();
                    }, 100);
                }, 100);
            });

            ws.on('error', (err) => {
                done(err);
            });
        });

        it('should handle client error and cleanup', (done) => {
            const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);

            ws.on('open', () => {
                ws.send(JSON.stringify({ type: 'subscribe_leaderboard' }));

                setTimeout(() => {
                    expect(leaderboardClients.size).toBe(1);
                    
                    // Симулируем ошибку соединения
                    ws.terminate();

                    setTimeout(() => {
                        // После ошибки клиент должен быть удален
                        expect(leaderboardClients.size).toBe(0);
                        done();
                    }, 100);
                }, 100);
            });

            ws.on('error', () => {
                // Ожидаем ошибку от terminate
            });
        });
    });

    describe('Invalid Messages', () => {
        it('should handle invalid JSON message', (done) => {
            const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);

            ws.on('open', () => {
                // Отправляем невалидный JSON
                ws.send('not valid json');
                
                // Даем время на обработку
                setTimeout(() => {
                    // Соединение должно остаться открытым (обработка ошибки не закрывает соединение)
                    expect(ws.readyState).toBe(WebSocket.OPEN);
                    ws.close();
                    done();
                }, 100);
            });

            ws.on('error', (err) => {
                done(err);
            });
        });

        it('should handle unknown message type', (done) => {
            const ws = new WebSocket(`ws://localhost:${TEST_PORT}`);

            ws.on('open', () => {
                // Отправляем сообщение с неизвестным типом
                ws.send(JSON.stringify({ type: 'unknown_type', data: 'test' }));
                
                // Даем время на обработку
                setTimeout(() => {
                    // Соединение должно остаться открытым
                    expect(ws.readyState).toBe(WebSocket.OPEN);
                    ws.close();
                    done();
                }, 100);
            });

            ws.on('error', (err) => {
                done(err);
            });
        });
    });
});
