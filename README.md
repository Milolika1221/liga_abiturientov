# Лига Абитуриентов

## Инструкция по инсталляции

### Вариант 1: Стандартная установка

**Шаг 1: Настройка (один раз)**

```bash
cd scripts
setup.bat
```

Или просто дважды кликни на `scripts/setup.bat`

Этот скрипт установит все зависимости и создаст базы данных.

**Шаг 2: Запуск**

```bash
cd scripts
start.bat
```

Или просто дважды кликни на `scripts/start.bat`

Этот скрипт запустит все сервисы (backend, frontend, bot, ngrok).

### Вариант 2: Docker Hub
Docker-образы для работы с приложением:

Ссылки на образы:
- Backend: https://hub.docker.com/r/milolika1221/liga-abiturientov-server
- Frontend: https://hub.docker.com/r/milolika1221/liga-abiturientov-frontend  
- Bot: https://hub.docker.com/r/milolika1221/liga-abiturientov-bot

**Быстрое использование:**

```bash
# 1. Скачать образы
docker pull milolika1221/liga-abiturientov-server:latest
docker pull milolika1221/liga-abiturientov-frontend:latest
docker pull milolika1221/liga-abiturientov-bot:latest

# 2. Скачать docker-compose.yml
# Скачайте файл docker-compose.yml из папки Docker проекта

# 3. Запустить все сервисы
docker-compose up -d

# 4. Инициализация базы данных (первый раз)
docker-compose exec server python database_setup.py --auto
docker-compose exec bot python database_setup.py --auto
```

**Интерактивная работа с кодом:**

Если вам нужно редактировать код или работать с проектом напрямую:

# Способ A: Запустить командную оболочку внутри контейнера
docker run -it --rm \
  -v $(pwd)/my_project:/app \
  milolika1221/liga-abiturientov-server:latest \
  /bin/bash

# Способ B: Создать постоянную среду разработки
docker run -d --name liga_workspace \
  -v $(pwd)/my_project:/app \
  --restart unless-stopped \
  milolika1221/liga-abiturientov-server:latest \
  sleep infinity

# Подключиться к запущенному контейнеру в любое время
docker exec -it liga_workspace /bin/bash

**Проверка работы:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3000
- API Docs: http://localhost:3000/api
- PostgreSQL: localhost:5432

**Остановка:**
```bash
docker-compose down
```

---

## Требования

- **PostgreSQL** (версии 12 и выше)
- **Node.js** (версии 16 и выше)
- **Python** (версии 3.8 и выше)
- **ngrok** (для публичного доступа)

---

## Структура проекта

- `Test_server/` - Бэкенд API (Node.js + Express)
- `frontend/` - Фронтенд (Vite + React)
- `Test_Bot/` - VK бот (Python)
- `setup.py` - Скрипт автоматической установки

---

## 🤖 Настройка VK бота (Test_Bot)
Для тестирования восстановления доступа и подтверждение личного кабинета при помощи бота ВКонтакте

### Установка зависимостей Python для бота

```bash
cd Test_Bot
pip install -r requirements.txt
```

### Инициализация базы данных

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

## Пошаговая инструкция по запуску (для разработки)

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

1. Запустите ngrok для фронтенда:

```bash
ngrok http http://localhost:5173
```

2. Если ngrok в Forwading будет отличаться от "https://stoically-noncaloric-rowan.ngrok-free.dev", тогла скопируйте HTTPS URL из вывода ngrok
3. Обновите `FRONTEND_URL` в `.env` на этот URL
4. Перезапустите бэкенд

---

## Проверка на мобильных устройствах

### Локальная сеть (тот же Wi-Fi):
1. Убедитесь, что телефон и компьютер в одной сети
2. Откройте в браузере телефона: `http://192.168.x.x:5173/`
3. При необходимости отключите брандмауэр Windows

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

# Тестовый бот
cd Test_Bot
python database_setup.py

# База данных для сайта "Лига абитуриентов"
python database_setup.py
```

## Внимание
Если не отправляются инструкции на почту для восстановления пароля и на странице не всплывают уведомления об ошибке, то выключите VPN
