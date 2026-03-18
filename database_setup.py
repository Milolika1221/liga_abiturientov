
import psycopg2
import psycopg2.extras
import logging
import sys
import os

# Кодировка для stdout/stderr
if sys.stdout.encoding is None or sys.stdout.encoding.upper() != 'UTF-8':
    sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)
if sys.stderr.encoding is None or sys.stderr.encoding.upper() != 'UTF-8':
    sys.stderr = open(sys.stderr.fileno(), mode='w', encoding='utf-8', buffering=1)

# Настройка логирования с указанием кодировки для вывода
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

class DatabaseManager:
    def __init__(self, dbname: str, user: str, password: str, host: str = 'localhost', port: str = '5432'):
        self.dbname = dbname
        self.user = user
        self.password = password
        self.host = host
        self.port = port
        self.conn = None
    
    def connect(self):
        try:
            self.conn = psycopg2.connect(
                dbname= 'postgres',
                user=self.user,
                password=self.password,
                host=self.host,
                port=self.port,
                client_encoding= 'UTF8'  
            )
            self.conn.autocommit = True  
            logger.info("Подключение к PostgreSQL установлено")
        except psycopg2.OperationalError as e:
            logger.error(f"Ошибка подключения к PostgreSQL: {e}")
            raise
    
    def create_database(self):
        cursor = self.conn.cursor()
        try:
            # Проверка существования базы данных
            cursor.execute("SELECT 1 FROM pg_database WHERE datname = %s", (self.dbname,))
            exists = cursor.fetchone()
            
            if not exists:
                try:
                    cursor.execute(f"""
                        CREATE DATABASE {self.dbname} 
                        ENCODING 'UTF8' 
                        LC_COLLATE 'ru_RU.UTF-8' 
                        LC_CTYPE 'ru_RU.UTF-8'
                        TEMPLATE template0
                    """)
                    logger.info(f"База данных {self.dbname} создана с кодировкой UTF-8 и русской локалью")
                except psycopg2.Error:
                    self.conn.rollback()
                    cursor.execute(f"CREATE DATABASE {self.dbname} ENCODING 'UTF8'")
                    logger.info(f"База данных {self.dbname} создана с кодировкой UTF-8 (локаль по умолчанию)")
            else:
                logger.info(f"База данных {self.dbname} уже существует")
                
        except psycopg2.Error as e:
            logger.error(f"Ошибка при создании базы данных: {e}")
            raise
        finally:
            cursor.close()
        
        self.conn.close()
        self.conn = psycopg2.connect(
            dbname=self.dbname,
            user=self.user,
            password=self.password,
            host=self.host,
            port=self.port,
            client_encoding='UTF8' 
        )
        self.conn.autocommit = False
    
    def create_tables(self):
        cursor = self.conn.cursor()
        cursor.execute("SET client_encoding TO 'UTF8';")
        
        # Таблица User (Пользователь)
        create_user_table = """
        CREATE TABLE IF NOT EXISTS users (
            user_id SERIAL PRIMARY KEY,
            full_name VARCHAR(255),
            phone_number VARCHAR(20),
            email VARCHAR(255) UNIQUE,
            birth_date DATE,
            class_course INTEGER,
            is_verified BOOLEAN DEFAULT FALSE,
            login VARCHAR(50) UNIQUE NOT NULL,
            password VARCHAR(255) NOT NULL,
            is_admin BOOLEAN DEFAULT FALSE,
            is_moderator BOOLEAN DEFAULT FALSE,
            position_id INTEGER REFERENCES positions(position_id) ON DELETE SET NULL,
            token VARCHAR(255),
            last_session_time TIMESTAMP,
            registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        
        # Таблица Parent (Данные родителей)
        create_parent_table = """
        CREATE TABLE IF NOT EXISTS parents (
            parent_id SERIAL PRIMARY KEY,
            user_id INTEGER UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
            full_name VARCHAR(255) NOT NULL,
            phone_number VARCHAR(20)
        );
        """
        
        # Таблица Position (Должности)
        create_position_table = """
        CREATE TABLE IF NOT EXISTS positions (
            position_id SERIAL PRIMARY KEY,
            position_name VARCHAR(255) UNIQUE NOT NULL
        );
        """
        
        # Таблица EventCategory (Категории мероприятий)
        create_category_table = """
        CREATE TABLE IF NOT EXISTS event_categories (
            category_id SERIAL PRIMARY KEY,
            category_name VARCHAR(255) UNIQUE NOT NULL,
            max_points INTEGER DEFAULT 0 CHECK (max_points >= 0)
        );
        """
        
        # Таблица Event (Мероприятия)
        create_event_table = """
        CREATE TABLE IF NOT EXISTS events (
            event_id SERIAL PRIMARY KEY,
            event_name VARCHAR(255) NOT NULL,
            category_id INTEGER REFERENCES event_categories(category_id) ON DELETE CASCADE,
            points INTEGER DEFAULT 0 CHECK (points >= 0)
        );
        """
        
        # Таблица Document (Документы)
        create_document_table = """
        CREATE TABLE IF NOT EXISTS documents (
            document_id SERIAL PRIMARY KEY,
            document_name VARCHAR(255) NOT NULL,
            file_path VARCHAR(500),
            status VARCHAR(50) DEFAULT 'На рассмотрении' CHECK (status IN ('На рассмотрении', 'Одобрено', 'Отклонено')),
            points INTEGER DEFAULT 0 CHECK (points >= 0),
            comment TEXT,
            category_id INTEGER REFERENCES event_categories(category_id) ON DELETE SET NULL,
            user_id INTEGER REFERENCES users(user_id) ON DELETE CASCADE,
            upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        
        tables = [
            create_position_table,
            create_user_table,
            create_parent_table,
            create_category_table,
            create_event_table,
            create_document_table
        ]
        
        for table_sql in tables:
            cursor.execute(table_sql)
        
        # Индексы для оптимизации
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_users_login ON users(login);",
            "CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);",
            "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);",
            "CREATE INDEX IF NOT EXISTS idx_parents_user ON parents(user_id);",
            "CREATE INDEX IF NOT EXISTS idx_events_category ON events(category_id);",
            "CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category_id);",
            "CREATE INDEX IF NOT EXISTS idx_documents_user ON documents(user_id);",
            "CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);"
        ]
        
        for index_sql in indexes:
            cursor.execute(index_sql)
        
        self.conn.commit()
        logger.info("Таблицы и индексы созданы успешно")
        cursor.close()
    
    def populate_database(self):
        # Наполнение базы данных тестовыми данными
        cursor = self.conn.cursor()
        cursor.execute("SET client_encoding TO 'UTF8';")
        cursor.execute("SET NAMES 'UTF8';")
        
        try:
            # Добавление должностей
            cursor.execute("""
                INSERT INTO positions (position_name) VALUES
                ('Оператор приемной комиссии'),
                ('Специалист по документам'),
                ('Консультант абитуриента'),
                ('Сотрудник приемной комиссии')
                ON CONFLICT (position_name) DO NOTHING
            """)
            
            # Создание тестового администратора
            cursor.execute("""
                INSERT INTO users (full_name, phone_number, email, birth_date, login, password, is_admin)
                VALUES (%s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (login) DO NOTHING
            """, (
                'Администратор системы',
                '+70000000000',
                'admin@liga-abiturientov.ru',
                '1990-01-01',
                'admin',
                'admin123',
                True
            ))

            # Создание тестового модератора (обычный админ)
            cursor.execute("""
                INSERT INTO users (full_name, phone_number, email, birth_date, login, password, is_admin, is_moderator, position_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (login) DO NOTHING
            """, (
                'Модератор системы',
                '+70000000001',
                'moderator@liga-abiturientov.ru',
                '1995-01-01',
                'moderator',
                'mod123',
                False,
                True,
                1  # Оператор приемной комиссии
            ))
            
            # Добавление тестового пользователя
            cursor.execute("""
                INSERT INTO users (full_name, phone_number, email, birth_date, login, password, is_admin, class_course)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                ON CONFLICT (login) DO NOTHING
            """, (
                'Иванов Иван Иванович',
                '+79001112233',
                'ivanov@liga-abiturientov.ru',
                '2005-05-15',
                'student1',
                'password1',
                False,
                11
            ))
            
            # Добавление категорий мероприятий с максимальными баллами
            cursor.execute("""
                INSERT INTO event_categories (category_name, max_points) VALUES
                ('Профориентационные мероприятия КГПИ КемГУ', 30),
                ('Научно-исследовательская деятельность в КГПИ КемГУ', 60),
                ('Творческие конкурсы и фестивали на базе КГПИ КемГУ', 50),
                ('Спортивные мероприятия на базе КГПИ КемГУ', 40),
                ('Профильные школы и интенсивы КГПИ КемГУ', 30),
                ('Волонтерская деятельность в КГПИ КемГУ', 20)
                ON CONFLICT (category_name) DO NOTHING
            """)
            
            # Добавление мероприятий с баллами
            # Категория 1: Профориентационные мероприятия
            cursor.execute("""
                INSERT INTO events (event_name, category_id, points, max_points_category) VALUES
                ('День Абитуриента', 1, 5, 30),
                ('День открытых дверей', 1, 5, 30),
                ('Профориентационные мастер-классы', 1, 5, 30),
                ('Консультации с деканами', 1, 5, 30)
            """)
            
            # Категория 2: Научно-исследовательская деятельность
            cursor.execute("""
                INSERT INTO events (event_name, category_id, points, max_points_category) VALUES
                ('Научные конференции школьников', 2, 30, 60),
                ('Олимпиады', 2, 30, 60),
                ('Конкурсы исследовательских работ', 2, 10, 60)
            """)
            
            # Категория 3: Творческие конкурсы и фестивали
            cursor.execute("""
                INSERT INTO events (event_name, category_id, points, max_points_category) VALUES
                ('Литературные конкурсы', 3, 30, 50),
                ('Художественные выставки', 3, 20, 50),
                ('Вокальные конкурсы', 3, 20, 50),
                ('Танцевальные конкурсы', 3, 20, 50),
                ('Театральные постановки', 3, 10, 50)
            """)
            
            # Категория 4: Спортивные мероприятия
            cursor.execute("""
                INSERT INTO events (event_name, category_id, points, max_points_category) VALUES
                ('Спартакиады', 4, 30, 40),
                ('Турниры по игровым видам спорта', 4, 10, 40)
            """)
            
            # Категория 5: Профильные школы и интенсивы
            cursor.execute("""
                INSERT INTO events (event_name, category_id, points, max_points_category) VALUES
                ('Летняя школа', 5, 30, 30),
                ('Зимняя школа', 5, 30, 30),
                ('Профильные смены', 5, 30, 30),
                ('Интенсивы', 5, 30, 30),
                ('Осенние каникулы', 5, 30, 30),
                ('Весенние каникулы', 5, 30, 30)
            """)
            
            # Категория 6: Волонтерская деятельность
            cursor.execute("""
                INSERT INTO events (event_name, category_id, points, max_points_category) VALUES
                ('Помощь в организации мероприятий совместно с КГПИ КемГУ', 6, 10, 20)
            """)
            
            # 5. Добавление документов (достижений поступающих)
            cursor.execute("""
                INSERT INTO documents (document_name, status, points, category_id) VALUES
                ('Грамота', 'На рассмотрении', 0, NULL)
            """)
            
            # 6. Добавление данных родителя для тестового пользователя
            cursor.execute("""
                INSERT INTO parents (user_id, full_name, phone_number) VALUES
                (2, 'Петрова Мария Николаевна', '+79001122544')
                ON CONFLICT (user_id) DO NOTHING
            """)
            
            # 7. Связь пользователя с мероприятием
            cursor.execute("""
                INSERT INTO user_events (user_id, event_id, status) VALUES
                (2, 1, 'completed')
                ON CONFLICT (user_id, event_id) DO NOTHING
            """)
            
            self.conn.commit()
            logger.info("База данных наполнена тестовыми данными")
            
        except Exception as e:
            self.conn.rollback()
            logger.error(f"Ошибка при наполнении базы данных: {e}")
            raise
        finally:
            cursor.close()
    
    def close(self):
        if self.conn:
            self.conn.close()
            logger.info("Соединение с базой данных закрыто")

def main():
    print("--- Установка базы данных ---")
    
    try:
        print("\nВведите параметры подключения к PostgreSQL:")
        db_user = input("Имя пользователя (по умолчанию 'postgres'): ").strip() or 'postgres'
        db_password = input("Пароль: ").strip() or 'postgres'
        db_host = input("Хост (по умолчанию 'localhost'): ").strip() or 'localhost'
        db_name = input("Имя базы данных (по умолчанию 'liga_abiturientov'): ").strip() or 'liga_abiturientov'
        
        # Создание и наполнение базы данных
        db_manager = DatabaseManager(
            dbname = db_name,
            user = db_user,
            password = db_password,
            host = db_host
        )
        
        print("\nПодключение к PostgreSQL...")
        db_manager.connect()
        
        print("Создание базы данных...")
        db_manager.create_database()
        
        print("Создание таблиц...")
        db_manager.create_tables()
        
        print("Наполнение тестовыми данными...")
        db_manager.populate_database()
        
        db_manager.close()
        
        print("База данных успешно создана и наполнена!")
        print(f"База данных: {db_name}")
        print("Тестовый администратор: login=admin, password=admin123")
        print("  - student1 / password1 (Иванов Иван Иванович)")
        
    except Exception as e:
        logger.error(f"Ошибка при установке базы данных: {e}")
        print(f"\nОшибка: {e}")
        print("\nВозможные решения:")
        print("1. Убедитесь, что PostgreSQL запущен")
        print("2. Проверьте правильность имени пользователя и пароля")
        print("3. Убедитесь, что у пользователя есть права на создание базы данных")
        print("4. Проверьте настройки кодировки в PostgreSQL")
        print("5. Попробуйте запустить скрипт с явным указанием кодировки:")
        print("   PYTHONIOENCODING=utf-8 python script.py")
        return 1
    
    return 0

if __name__ == "__main__":
    main()
