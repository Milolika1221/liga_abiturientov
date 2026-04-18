# Лига Абитуриентов - Инструкция по запуску

## Требования

- **PostgreSQL** (версии 12 и выше)
- **Node.js** (версии 16 и выше)
- **Python** (версии 3.7 и выше)
- **ngrok** (для публичного доступа)

---

## 🤖 Настройка VK бота (Test_Bot)
Для тестирования восстановления доступа и подтверждение личного кабинета при помощи бота ВКонтакте

### Автоматическая инициализация базы данных

```bash
cd Test_Bot
python database_setup.py
```

### Конфигурация бота

Файл `.env.example` содержит пример конфигурации. Скопируйте и настройте:

```bash
cd Test_Bot
copy .env.example .env
```

### Запуск бота

```bash
cd Test_Bot
python main.py
```

### Развернутый бот

- **Бот:** https://vk.com/im/convo/-227705075
- **Группа:** https://vk.com/club227705075

---

## Пошаговая инструкция по запуску

### Шаг 1: Установка зависимостей Python

```bash
pip install psycopg2-binary
```

### Шаг 2: Создание базы данных

Запустите скрипт для создания базы данных и таблиц:

```bash
python database_setup.py
```

### Шаг 3: Настройка окружения (.env)

1. Перейдите в папку `Test_server/`
2. Скопируйте файл `.env.example` и переименуйте в `.env`:

```bash
cd Test_server
copy .env.example .env
```

3. Откройте `.env` и укажите ваши данные для подключения к базе данных:

```env
# Database Configuration - ЗАПОЛНИТЕ СВОИ ДАННЫЕ
DB_USER=postgres              # пользователь PostgreSQL
DB_HOST=localhost
DB_NAME=liga_abiturientov
DB_PASSWORD=your_password     # ваш пароль от PostgreSQL
DB_PORT=5432
```

**Важно:** Остальные переменные в `.env` уже настроены (SMTP, ключи шифрования, VK токены) и не требуют изменений для тестирования.

---

### Шаг 3: Установка зависимостей Node.js

**Для бэкенда (Test_server):**

```bash
cd Test_server
npm install
```

**Для фронтенда (frontend):**

```bash
cd frontend
npm install
```

---

### Шаг 4: Запуск приложения

**Терминал 1 - Запуск бэкенда:**

```bash
cd Test_server
node server.js
```
Сервер: `http://localhost:3000`

Сервер запустится на `http://localhost:3000`

**Терминал 2 - Запуск фронтенда:**

```bash
cd frontend
npm run dev
```

Фронтенд запустится на:
- **Local:** http://localhost:5173/
- **Network:** http://192.168.x.x:5173/ (ваш IP)

---

### Шаг 6: Настройка ngrok (для публичного доступа) - нужно для восстановления пароля через бота ВКонтакте

1. Установите ngrok: https://ngrok.com/download
2. Авторизуйтесь (зарегистрируйтесь и получите auth token)
3. Запустите ngrok для фронтенда:

```bash
ngrok http http://localhost:5173
```

4. Скопируйте HTTPS URL из вывода ngrok (например, `https://xxxx.ngrok-free.app`)
5. Обновите `FRONTEND_URL` в `.env` на этот URL
6. Перезапустите бэкенд

---

## Проверка на мобильных устройствах

### Локальная сеть (тот же Wi-Fi):
1. Убедитесь, что телефон и компьютер в одной сети
2. Откройте в браузере телефона: `http://192.168.x.x:5173/`
3. При необходимости отключите брандмауэр Windows

---

## Структура проекта

- `Test_server/` - Бэкенд API (Node.js)
- `frontend/` - Фронтенд (Vite/Vue)
- `Test_Bot/` - VK бот (Python)

---

## Команды

```bash
# Фронтенд
cd frontend
npm install
npm run dev

# Бэкенд
cd Test_server
npm install
node server.js

# База данных
cd Test_Bot
python database_setup.py
```
