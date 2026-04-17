# Лига Абитуриентов - Инструкция по запуску

## Требования

- **PostgreSQL** (версии 12 и выше)
- **Node.js** (версии 16 и выше)
- **Python** (версии 3.7 и выше)
- **ngrok** (для публичного доступа)

---

## Внимание

Нельзя проверить восстановление и подтверждение пароля при помощи бота ВКонтакте (другой проект)

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

3. Откройте `.env` и заполните свои данные:

```env
# Database Configuration
DB_USER=postgres              # пользователь PostgreSQL
DB_HOST=localhost
DB_NAME=liga_abiturientov
DB_PASSWORD=your_password     # ваш пароль от PostgreSQL
DB_PORT=5432

# Server Configuration
PORT=3000                     # порт бэкенда

# Encryption Key (для шифрования данных)
# Сгенерируйте случайный ключ командой: openssl rand -hex 32
ENCRYPTION_KEY=your_64_char_hex_key_here

# SMTP Configuration (для восстановления пароля)
SMTP_PROVIDER=gmail
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password   # пароль приложения (не пароль от аккаунта!)

# Frontend URL
FRONTEND_URL=http://localhost:5173
```

**Как получить App Password для Gmail:**
1. Google Account → Безопасность → Двухэтапная аутентификация (включить)
2. Поиск → "Пароли приложений" → Выберите приложение "Почта"
3. Скопируйте 16-значный пароль и вставьте в `SMTP_PASS` без пробелов

---

### Шаг 4: Установка зависимостей Node.js

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

### Шаг 5: Запуск приложения

**Терминал 1 - Запуск бэкенда:**

```bash
cd Test_server
node server.js
```

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

### Шаг 6: Настройка ngrok (для публичного доступа)

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

### Через ngrok:
1. Запустите ngrok
2. Откройте HTTPS URL на телефоне
3. Работает из любой сети

---

### Команды:
```bash
# Установка всех зависимостей
npm install

# Запуск в режиме разработки
npm run dev

# Сборка для продакшена
npm run build

# Предпросмотр сборки
npm run preview
```
