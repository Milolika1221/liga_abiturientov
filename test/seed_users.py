"""
Скрипт для добавления тестовых пользователей в базу данных.
Создает 150 пользователей для нагрузочного тестирования.
"""

import asyncio
import asyncpg
import os
import sys
from datetime import datetime, timedelta
from pathlib import Path
from dotenv import load_dotenv
import random
import string

# Добавляем путь к Test_server для импорта функций шифрования
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'Test_server'))

# Загружаем переменные окружения
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'Test_server', '.env'))

# Конфигурация БД
DB_CONFIG = {
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME'),
    'host': os.getenv('DB_HOST'),
    'port': int(os.getenv('DB_PORT', 5432))
}


def generate_random_string(length=8):
    return ''.join(random.choices(string.ascii_lowercase + string.digits, k=length))


def hash_password_simple(password):
    import hashlib
    salt = ''.join(random.choices(string.hexdigits, k=32))
    hash_value = hashlib.pbkdf2_hmac('sha512', password.encode(), salt.encode(), 10000).hex()
    return f"{salt}:{hash_value}"


def generate_phone():
    return f"7{random.randint(9000000000, 9999999999)}"


def generate_birth_date():
    years_ago = random.randint(16, 25)
    birth_date = datetime.now() - timedelta(days=years_ago * 365 + random.randint(0, 365))
    return birth_date.date()


async def create_test_users(count=150):
    # Создание тестовых пользователей в базе данных
    print(f"Подключение к базе данных...")
    
    try:
        conn = await asyncpg.connect(**DB_CONFIG)
        print(f"Успешное подключение к БД")
        
        created_count = 0
        skipped_count = 0
        created_users = [] 
        
        for i in range(1, count + 1):
            try:
                first_name = f"Test{i}"
                last_name = f"User{i}"
                full_name = f"{last_name} {first_name}"
                login = f"test_user_{i}_{generate_random_string(4)}"
                password = "TestPass123!"
                hashed_password = hash_password_simple(password)
                
                phone = generate_phone()
                email = f"test{i}_{generate_random_string(6)}@test.com"
                birth_date = generate_birth_date()
                graduation_year = datetime.now().year + random.randint(1, 3)
                course_class = random.randint(9, 11)
                
                # Проверяем, существует ли пользователь с таким телефоном
                existing = await conn.fetchval(
                    "SELECT user_id FROM users WHERE login = $1",
                    login
                )
                
                if existing:
                    print(f"Пользователь {login} уже существует, пропускаем...")
                    skipped_count += 1
                    continue
                
                # Вставляем пользователя
                user_id = await conn.fetchval(
                    """
                    INSERT INTO users (
                        login, password, full_name, phone_number, email,
                        birth_date, graduation_year, class_course,
                        last_session_time, is_verified, is_admin, is_moderator
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), true, false, false)
                    RETURNING user_id
                    """,
                    login, hashed_password, full_name, phone, email,
                    birth_date, graduation_year, course_class
                )
                
                created_count += 1
                
                # Сохраняем данные для файла credentials (используем email для логина)
                created_users.append({
                    'user_id': user_id,
                    'login': login,
                    'email': email,
                    'phone': phone
                })
                
                if i % 10 == 0:
                    print(f"Создано {i}/{count} пользователей...")
                
            except Exception as e:
                print(f"Ошибка при создании пользователя {i}: {e}")
                skipped_count += 1
                continue
        
        await conn.close()
        
        # Сохраняем учетные данные в файл
        if created_users:
            await save_user_credentials_to_file(created_users)
        
        print(f"\n=== Результаты ===")
        print(f"Создано пользователей: {created_count}")
        print(f"Пропущено (уже существуют): {skipped_count}")
        print(f"Всего в БД теперь: {created_count + skipped_count}")
        
        return created_count
        
    except Exception as e:
        print(f"Ошибка подключения к БД: {e}")
        return 0


async def get_user_credentials():
    # Получение логинов и паролей тестовых пользователей
    credentials = await load_user_credentials_from_file()
    if credentials:
        print(f"Загружено {len(credentials)} учетных записей из файла")
        return credentials
    
    # Если файла нет, загружаем из БД
    print("Загрузка учетных данных из БД...")
    conn = await asyncpg.connect(**DB_CONFIG)
    
    users = await conn.fetch(
        """SELECT login, user_id, email 
           FROM users 
           WHERE login LIKE 'test_user_%' 
           ORDER BY user_id"""
    )
    
    await conn.close()
    
    credentials = []
    for user in users:
        # Используем email для логина (сервер ожидает email или телефон)
        credentials.append({
            'user_id': user['user_id'],
            'login': user['login'],
            'email': user['email'],  
            'phone': None,
            'password': 'TestPass123!'
        })
    
    return credentials


async def save_user_credentials_to_file(users_data: list):
    # Сохранение учетных данных пользователей в файл
    import json
    credentials_file = Path(__file__).parent / 'test_users_credentials.json'
    
    for user in users_data:
        user['password'] = 'TestPass123!'
    
    with open(credentials_file, 'w', encoding='utf-8') as f:
        json.dump(users_data, f, indent=2, ensure_ascii=False)
    
    print(f"Учетные данные сохранены в: {credentials_file}")
    return credentials_file


async def load_user_credentials_from_file():
    # Загрузка учетных данных пользователей из файла
    import json
    credentials_file = Path(__file__).parent / 'test_users_credentials.json'
    
    if not credentials_file.exists():
        return None
    
    with open(credentials_file, 'r', encoding='utf-8') as f:
        return json.load(f)


async def cleanup_test_users():
    # Удаление тестовых пользователей из базы данных
    print("Удаление тестовых пользователей...")
    
    conn = await asyncpg.connect(**DB_CONFIG)
    
    # Удаляем связанные записи из других таблиц
    await conn.execute("""
        DELETE FROM documents 
        WHERE user_id IN (SELECT user_id FROM users WHERE login LIKE 'test_user_%')
    """)
    
    await conn.execute("""
        DELETE FROM parents 
        WHERE user_id IN (SELECT user_id FROM users WHERE login LIKE 'test_user_%')
    """)
    
    # Удаляем самих пользователей
    result = await conn.execute("""
        DELETE FROM users WHERE login LIKE 'test_user_%'
    """)
    
    await conn.close()
    
    # Удаляем файл с учетными данными
    credentials_file = Path(__file__).parent / 'test_users_credentials.json'
    if credentials_file.exists():
        credentials_file.unlink()
        print(f"Удален файл: {credentials_file}")
    
    # Парсим количество удаленных строк
    try:
        deleted = int(result.split()[-1])
        print(f"Удалено {deleted} тестовых пользователей")
        return deleted
    except:
        print("Тестовые пользователи удалены")
        return 0


if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description='Управление тестовыми пользователями')
    parser.add_argument('--create', action='store_true', help='Создать тестовых пользователей')
    parser.add_argument('--cleanup', action='store_true', help='Удалить тестовых пользователей')
    parser.add_argument('--count', type=int, default=150, help='Количество пользователей (по умолчанию 150)')
    
    args = parser.parse_args()
    
    if args.cleanup:
        asyncio.run(cleanup_test_users())
    elif args.create:
        asyncio.run(create_test_users(args.count))
    else:
        print("Использование:")
        print("  python seed_users.py --create [--count 150]  - создать тестовых пользователей")
        print("  python seed_users.py --cleanup               - удалить тестовых пользователей")
