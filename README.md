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

После этого можно запускать сервер: node Test_server/server.js

## Структура базы данных

База данных содержит следующие таблицы:

### Основные таблицы:
- **users** - хранит информацию о пользователях (включая флаг администратора)
- **parents** - данные родителей (связь 1:1 с пользователями)
- **event_categories** - категории мероприятий
- **events** - конкретные мероприятия с баллами
- **documents** - документы со статусом модерации
- **user_documents** - связь пользователей с документами (M:M)
- **user_events** - связь пользователей с мероприятиями (M:M)

## Установка и запуск

### 1. Требования

- PostgreSQL (версии 12 и выше)
- Python 3.7+
- Библиотеки Python:
  ```bash
  pip install psycopg2-binary
  ```

### 2. Создание базы данных

Запустите Python скрипт для создания базы данных и таблиц:
```bash
python database_setup.py
```

## Структура таблиц

### users
```sql
- user_id (SERIAL, PRIMARY KEY)
- full_name (VARCHAR(255))
- phone_number (VARCHAR(20))
- birth_date (DATE)
- class_course (INTEGER)
- is_verified (BOOLEAN)
- login (VARCHAR(50), UNIQUE)
- password (VARCHAR(255))
- is_admin (BOOLEAN)
- token (VARCHAR(255))
- last_session_time (TIMESTAMP)
- registration_date (TIMESTAMP)
```

### parents
```sql
- parent_id (SERIAL, PRIMARY KEY)
- user_id (INTEGER, UNIQUE, FOREIGN KEY)
- full_name (VARCHAR(255))
- phone_number (VARCHAR(20))
```

### event_categories
```sql
- category_id (SERIAL, PRIMARY KEY)
- category_name (VARCHAR(255), UNIQUE)
- max_points (INTEGER)
```

### events
```sql
- event_id (SERIAL, PRIMARY KEY)
- event_name (VARCHAR(255))
- category_id (INTEGER, FOREIGN KEY)
- points (INTEGER)
- max_points_category (INTEGER)
```

### documents
```sql
- document_id (SERIAL, PRIMARY KEY)
- document_name (VARCHAR(255))
- status (VARCHAR(50))
- points (INTEGER)
- category_id (INTEGER, FOREIGN KEY)
```

### user_documents
```sql
- user_id (INTEGER, FOREIGN KEY)
- document_id (INTEGER, FOREIGN KEY)
- upload_date (TIMESTAMP)
```

### user_events
```sql
- user_id (INTEGER, FOREIGN KEY)
- event_id (INTEGER, FOREIGN KEY)
- registration_date (TIMESTAMP)
- status (VARCHAR(50))
```

