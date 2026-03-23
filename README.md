## Настройка окружения (.env)

Перед запуском сервера необходимо создать файл .env в папке Test_server/:

1. Скопируй файл .env.example и переименуй его в .env:

   - В командной строке (cmd): copy Test_server\.env.example Test_server\.env
   - В PowerShell: Copy-Item Test_server/.env.example Test_server/.env
   - Или просто сделай это в проводнике: скопируй файл и переименуй

2. Заполни свои данные в файле .env:

DB_USER=твой_пользователь     # обычно postgres

DB_HOST=localhost

DB_NAME=liga_abiturientov      # название базы данных

DB_PASSWORD=твой_пароль        # пароль от PostgreSQL

DB_PORT=5432                    # стандартный порт PostgreSQL

PORT=3000                       # порт для сервера

**После настройки окружения можно запускать приложения**

## Структура фронтенда (React)

### Основные файлы и их назначение:

- **index.html** - главный HTML файл, точка входа приложения
- **src/main.jsx** - главный файл React, рендерит App.jsx в корневой элемент DOM
- **src/App.jsx** - главный компонент приложения, содержит маршрутизацию и общую структуру
- **src/index.css** - глобальные стили, Tailwind CSS конфигурация
- **src/components/Registration.jsx** - компонент формы регистрации с HTML структурой и стилями

### Важные файлы для стилизации:
- **tailwind.config.js** - конфигурация Tailwind CSS
- **postcss.config.js** - обработка CSS
- **vite.config.js** - конфигурация сборщика Vite

## Установка и запуск

### 1. Требования

- PostgreSQL (версии 12 и выше)
- Python 3.7+
- Node.js 16+
- Библиотеки Python:
  ```bash
  pip install psycopg2-binary
  ```

### 2. Создание базы данных

Запустите Python скрипт для создания базы данных и таблиц:
```bash
python database_setup.py
```

### 3. Настройка окружения (.env)

Перед запуском сервера необходимо создать файл .env в папке Test_server/:

1. Скопируйте файл .env.example и переименуйте его в .env:

   - В командной строке (cmd): copy Test_server\.env.example Test_server\.env
   - В PowerShell: Copy-Item Test_server/.env.example Test_server/.env
   - Или просто сделайте это в проводнике: скопируйте файл и переименуй

2. Заполните свои данные в файле .env:

```
DB_USER=твой_пользователь     # обычно postgres
DB_HOST=localhost
DB_NAME=liga_abiturientov      # название базы данных
DB_PASSWORD=твой_пароль        # пароль от PostgreSQL
DB_PORT=5432                    # стандартный порт PostgreSQL
PORT=3000                       # порт для сервера
SMTP_PROVIDER=YOUR_PROVIDER # (gmail, mail, yandex) - используется пока gmail
SMTP_USER=YOUR_email@gmail.com
SMTP_PASS=YOUR_APP_PASSWORD_HERE
FRONTEND_URL=http://localhost:5173 # Frontend URL для сброса пароля
```

### 3. Настройка SMTP (для восстановления пароля)
**Как получить App Password для Gmail:**
1. Google Account → Безопасность → Двухэтапная аутентификация (включить)
2. Пароли приложений → Почта → Скопировать 16-значный пароль
3. Вставьте его в `SMTP_PASS` без пробелов


### 4. Запуск приложений

#### Запуск бэкенда (сервер):
```bash
node Test_server/server.js
```

#### Запуск фронтенда (React приложение):
```bash
cd frontend
npm install
npm run dev
```

После запуска фронтенд будет доступен по адресам:
- **Local:** http://localhost:5173/
- **Network:** http://192.168.0.100:5173/

### 5. Проверка на мобильных устройствах

Для проверки приложения на телефоне:
1. Убедитесь, что телефон и компьютер подключены к одной Wi-Fi сети
2. Откройте в браузере телефона сетевой адрес: `http://192.168.0.100:5173/`
3. Если не работает, проверьте настройки брандмауэра Windows
