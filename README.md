# Лига Абитуриентов - Инструкция по запуску

## Требования

- **PostgreSQL** (версии 12 и выше)
- **Node.js** (версии 16 и выше)
- **Python** (версии 3.7 и выше)
- **ngrok** (для публичного доступа)

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

**Что делает скрипт:**
- Создаёт базу данных `liga_abiturientov`
- Создаёт все необходимые таблицы
- Добавляет тестовые данные (категории достижений)

---

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

**Для фронтенда:**

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

## Структура проекта

```
liga_abiturientov/
├── database_setup.py          # Скрипт создания БД
├── README.md                  # Этот файл
├── Test_server/               # Бэкенд (Node.js + Express)
│   ├── server.js             # Главный файл сервера
│   ├── .env                  # Конфигурация (создать из .env.example)
│   ├── .env.example          # Шаблон конфигурации
│   └── package.json
├── frontend/                  # Фронтенд (React + Vite)
│   ├── src/
│   │   ├── components/       # React компоненты
│   │   ├── styles/          # CSS файлы
│   │   └── assets/          # Изображения, шрифты
│   ├── index.html
│   └── package.json
```

---

## Решение проблем

### Порт занят

Если порт 3000 или 5173 занят:

**Для бэкенда:**
- Измените `PORT` в `.env` на другой (например, 3001)

**Для фронтенда:**
```bash
npm run dev -- --port 5174
```

### Ошибка подключения к базе данных

1. Убедитесь, что PostgreSQL запущен
2. Проверьте правильность данных в `.env`
3. Убедитесь, что база данных `liga_abiturientov` существует:
   ```bash
   psql -U postgres -c "\l"
   ```

### Не отправляются письма (SMTP)

1. Проверьте правильность `SMTP_USER` и `SMTP_PASS`
2. Убедитесь, что используете App Password, а не обычный пароль
3. Проверьте настройки безопасности Gmail

### Проблемы с ngrok

1. Убедитесь, что ngrok авторизован: `ngrok authtoken YOUR_TOKEN`
2. Проверьте, что фронтенд запущен на указанном порту
3. После перезапуска ngrok URL меняется - обновите `FRONTEND_URL`

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

## Разработка

### Технологии:
- **Frontend:** React, Vite, Tailwind CSS
- **Backend:** Node.js, Express, PostgreSQL
- **Email:** Nodemailer (SMTP)

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
