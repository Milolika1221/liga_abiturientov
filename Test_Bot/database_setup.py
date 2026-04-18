import psycopg2
import psycopg2.extras
import logging
import sys
import os
from dotenv import load_dotenv

# Кодировка для stdout/stderr
if sys.stdout.encoding is None or sys.stdout.encoding.upper() != 'UTF-8':
    sys.stdout = open(sys.stdout.fileno(), mode='w', encoding='utf-8', buffering=1)
if sys.stderr.encoding is None or sys.stderr.encoding.upper() != 'UTF-8':
    sys.stderr = open(sys.stderr.fileno(), mode='w', encoding='utf-8', buffering=1)

# Настройка логирования
logging.basicConfig(
    level=logging.INFO, 
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger(__name__)

try:
    load_dotenv(encoding='utf-8')
except UnicodeDecodeError:
    load_dotenv(encoding='cp1251')

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = int(os.getenv('DB_PORT', 5432))
DB_USER = os.getenv('DB_USER', 'postgres') 
DB_PASS = os.getenv('DB_PASSWORD', 'postgres')
DB_NAME = os.getenv('DB_NAME', 'bot_database')


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
                dbname='postgres',
                user=self.user,
                password=self.password,
                host=self.host,
                port=self.port,
                client_encoding='UTF8'  
            )
            self.conn.autocommit = True
            logger.info("Подключение к PostgreSQL установлено")
        except psycopg2.OperationalError as e:
            logger.error(f"Ошибка подключения к PostgreSQL: {e}")
            raise
    
    def create_database(self):
        cursor = self.conn.cursor()
        try:
            # Создание пользователя bot_user если не существует
            try:
                cursor.execute("SELECT 1 FROM pg_roles WHERE rolname = %s", (DB_USER,))
                if not cursor.fetchone():
                    cursor.execute(f"CREATE ROLE {DB_USER} WITH LOGIN PASSWORD %s", (DB_PASS,))
                    logger.info(f"Роль {DB_USER} создана")
                else:
                    logger.info(f"Роль {DB_USER} уже существует")
            except psycopg2.Error as e:
                logger.warning(f"Не удалось создать роль {DB_USER}: {e}")
            
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
            
            # Даем права пользователю на базу данных
            try:
                cursor.execute(f"GRANT ALL PRIVILEGES ON DATABASE {self.dbname} TO {DB_USER}")
                logger.info(f"Права на базу {self.dbname} выданы пользователю {DB_USER}")
            except psycopg2.Error as e:
                logger.warning(f"Не удалось выдать права: {e}")
                
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
        cursor.execute("SET NAMES 'UTF8';")
        
        # Таблица users (минимальная версия для VK Bot)
        create_user_table = """
        CREATE TABLE IF NOT EXISTS users (
            user_id BIGINT PRIMARY KEY,
            username VARCHAR(255),
            role VARCHAR(50) DEFAULT 'user',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        """
        
        cursor.execute(create_user_table)
        self.conn.commit()
        logger.info("Таблица users создана успешно")
        cursor.close()
    
    def populate_database(self):
        cursor = self.conn.cursor()
        cursor.execute("SET client_encoding TO 'UTF8';")
        cursor.execute("SET NAMES 'UTF8';")
        
        try:
            # Создание тестового администратора (VK ID)
            cursor.execute("""
                INSERT INTO users (user_id, username, role, created_at, updated_at)
                VALUES (%s, %s, %s, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
                ON CONFLICT (user_id) DO UPDATE SET 
                    role = EXCLUDED.role,
                    updated_at = CURRENT_TIMESTAMP
            """, (560915521, 'admin', 'admin'))
            
            self.conn.commit()
            logger.info("Тестовый администратор создан")
            
            # Проверка данных
            cursor.execute("SELECT COUNT(*) FROM users")
            count = cursor.fetchone()[0]
            logger.info(f"Всего пользователей в базе: {count}")
            
        except psycopg2.Error as e:
            logger.error(f"Ошибка при наполнении базы: {e}")
            self.conn.rollback()
            raise
        finally:
            cursor.close()
    
    def close(self):
        if self.conn:
            self.conn.close()
            logger.info("Соединение с базой данных закрыто")


def main():
    logger.info("=== Инициализация базы данных для VK Bot ===")
    
    db_manager = DatabaseManager(
        dbname=DB_NAME,
        user=DB_USER, 
        password=DB_PASS,
        host=DB_HOST,
        port=str(DB_PORT)
    )
    
    try:
        # Подключение к PostgreSQL
        db_manager.connect()
        
        # Создание базы данных
        db_manager.create_database()
        
        # Создание таблиц
        db_manager.create_tables()
        
        # Наполнение тестовыми данными
        db_manager.populate_database()
        
        logger.info("=== База данных успешно инициализирована ===")
        
    except Exception as e:
        logger.error(f"Ошибка инициализации: {e}")
        sys.exit(1)
    finally:
        db_manager.close()


if __name__ == "__main__":
    main()