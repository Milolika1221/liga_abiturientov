
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
            phone_number VARCHAR(255),
            email VARCHAR(255) UNIQUE,
            birth_date DATE,
            class_course INTEGER,
            graduation_year INTEGER,
            school VARCHAR(255),
            is_verified BOOLEAN DEFAULT FALSE,
            login VARCHAR(50) UNIQUE,
            password VARCHAR(255),
            reset_token VARCHAR(255),
            reset_token_expires_at TIMESTAMP,
            is_admin BOOLEAN DEFAULT FALSE,
            is_moderator BOOLEAN DEFAULT FALSE,
            position_id INTEGER REFERENCES positions(position_id) ON DELETE SET NULL,
            token VARCHAR(255),
            last_session_time TIMESTAMP,
            registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            is_online BOOLEAN DEFAULT FALSE,
            last_activity_time TIMESTAMP,
            created_by_admin BOOLEAN DEFAULT FALSE,
            last_data_confirmation TIMESTAMP
        );
        """
        
        # Таблица Parent (Данные родителей)
        create_parent_table = """
        CREATE TABLE IF NOT EXISTS parents (
            parent_id SERIAL PRIMARY KEY,
            user_id INTEGER UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,
            full_name VARCHAR(255) NOT NULL,
            phone_number VARCHAR(255)
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
            event_date DATE,
            category_id INTEGER REFERENCES event_categories(category_id) ON DELETE CASCADE
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
            upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            received_date DATE
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
            "CREATE INDEX IF NOT EXISTS idx_users_school ON users(school);",
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
    
    # Создание тестовых PDF файлов в папке uploads
    def create_test_files(self):
        import os
        from reportlab.lib.pagesizes import letter
        from reportlab.pdfgen import canvas
        from PIL import Image, ImageDraw, ImageFont
        
        uploads_dir = os.path.join(os.path.dirname(__file__), 'Test_server', 'uploads')
        os.makedirs(uploads_dir, exist_ok=True)
        
        # PDF файлы
        test_files = [
            ('diploma_ivanov.pdf', 'Диплом олимпиады', 'Иванов Иван Иванович'),
            ('certificate_scienc.pdf', 'Сертификат конференции', 'Петрова Анна Сергеевна'),
            ('volunteer_cert.pdf', 'Справка волонтера', 'Сидоров Алексей Павлович'),
            ('sport_medal.pdf', 'Медаль спартакиады', 'Козлова Мария Игоревна'),
            ('art_festival.pdf', 'Грамота фестиваля', 'Новиков Дмитрий Владимирович'),
            ('school_cert.pdf', 'Сертификат школы', 'Морозова Екатерина Андреевна'),
            ('rejected_doc.pdf', 'Отклоненный документ', 'Тестовый Пользователь'),
            ('pending_doc1.pdf', 'Документ на рассмотрении', 'Иванов Иван Иванович'),
            ('pending_doc2.pdf', 'Грамота за участие', 'Петрова Анна Сергеевна'),
        ]
        
        # PNG файлы (достижения-картинки)
        png_files = [
            ('diploma_math.png', 'Диплом олимпиады по математике', 'Иванов Иван'),
            ('science_conf.png', 'Сертификат научной конференции', 'Петрова Анна'),
            ('sport_medal.png', 'Медаль за спортивные достижения', 'Козлова Мария'),
            ('art_competition.png', 'Грамота за участие в конкурсе', 'Новиков Дмитрий'),
            ('volunteer_cert.png', 'Справка волонтера', 'Сидоров Алексей'),
        ]
        
        for filename, title, owner in test_files:
            filepath = os.path.join(uploads_dir, filename)
            try:
                c = canvas.Canvas(filepath, pagesize=letter)
                width, height = letter
                
                # Рамка документа
                c.setStrokeColorRGB(0.2, 0.2, 0.5)
                c.setLineWidth(3)
                c.rect(50, 50, width-100, height-100)
                
                # Внутренняя рамка
                c.setStrokeColorRGB(0.4, 0.4, 0.7)
                c.setLineWidth(1)
                c.rect(60, 60, width-120, height-120)
                
                # Заголовок документа
                c.setFont("Helvetica-Bold", 24)
                c.setFillColorRGB(0.1, 0.1, 0.4)
                c.drawCentredString(width/2, height-120, title.upper())
                
                # Декоративная линия под заголовком
                c.setStrokeColorRGB(0.6, 0.6, 0.8)
                c.setLineWidth(2)
                c.line(width/2-150, height-135, width/2+150, height-135)
                
                # Текст "Настоящим удостоверяется"
                c.setFont("Helvetica", 14)
                c.setFillColorRGB(0.2, 0.2, 0.2)
                c.drawCentredString(width/2, height-180, "НАСТОЯЩИМ УДОСТОВЕРЯЕТСЯ")
                
                # ФИО владельца (крупным шрифтом)
                c.setFont("Helvetica-Bold", 20)
                c.setFillColorRGB(0, 0, 0)
                c.drawCentredString(width/2, height-230, owner)
                
                # Описание документа
                c.setFont("Helvetica", 12)
                c.setFillColorRGB(0.3, 0.3, 0.3)
                descriptions = {
                    'diploma': 'за победу в олимпиаде и активное участие в научной деятельности',
                    'certificate': 'за участие в конференции и представление исследовательской работы',
                    'volunteer': 'за активное участие в волонтерской деятельности и помощь в организации мероприятий',
                    'medal': 'за участие в спортивных соревнованиях и достижение высоких результатов',
                    'art': 'за участие в творческом конкурсе и демонстрацию художественных навыков',
                    'school': 'за успешное окончание профильной школы и активное участие в программе'
                }
                doc_key = filename.split('_')[0]
                desc = descriptions.get(doc_key, 'за активное участие и достижение значимых результатов')
                
                # Разбиваем длинный текст на строки
                words = desc.split()
                lines = []
                current_line = ""
                for word in words:
                    if len(current_line + " " + word) < 70:
                        current_line += " " + word if current_line else word
                    else:
                        lines.append(current_line)
                        current_line = word
                if current_line:
                    lines.append(current_line)
                
                y_pos = height - 280
                for line in lines:
                    c.drawCentredString(width/2, y_pos, line)
                    y_pos -= 20
                
                # Дата выдачи
                from datetime import datetime
                c.setFont("Helvetica", 11)
                c.drawCentredString(width/2, y_pos-30, f"Дата выдачи: {datetime.now().strftime('%d.%m.%Y')}")
                
                # Место для подписи
                c.setFont("Helvetica", 10)
                c.setFillColorRGB(0.4, 0.4, 0.4)
                c.drawString(100, 150, "Подпись руководителя: _________________")
                c.drawString(width-250, 150, "Печать организации")
                
                # Нижний колонтитул
                c.setFont("Helvetica", 8)
                c.setFillColorRGB(0.5, 0.5, 0.5)
                c.drawCentredString(width/2, 80, "КГПИ КемГУ • Лига Абитуриентов • Система учета достижений")
                
                # ID документа
                c.drawCentredString(width/2, 65, f"Регистрационный номер: DOC-{filename.split('.')[0].upper()}-2025")
                
                c.save()
                logger.info(f"Создан тестовый PDF: {filepath}")
            except Exception as e:
                logger.warning(f"Не удалось создать PDF {filepath}: {e}")
        
        # Создание PNG файлов
        for filename, title, owner in png_files:
            filepath = os.path.join(uploads_dir, filename)
            try:
                # Создаем изображение-сертификат
                width, height = 800, 600
                img = Image.new('RGB', (width, height), color='#f5f5f5')
                draw = ImageDraw.Draw(img)
                
                # Рамка
                draw.rectangle([(20, 20), (width-20, height-20)], outline='#2c3e50', width=4)
                draw.rectangle([(30, 30), (width-30, height-30)], outline='#3498db', width=2)
                
                # Заголовок
                try:
                    font_title = ImageFont.truetype("arial.ttf", 36)
                    font_text = ImageFont.truetype("arial.ttf", 24)
                    font_small = ImageFont.truetype("arial.ttf", 18)
                except:
                    font_title = ImageFont.load_default()
                    font_text = ImageFont.load_default()
                    font_small = ImageFont.load_default()
                
                # Текст заголовка
                bbox = draw.textbbox((0, 0), title.upper(), font=font_title)
                text_width = bbox[2] - bbox[0]
                draw.text(((width - text_width) / 2, 80), title.upper(), fill='#1a1a2e', font=font_title)
                
                # Линия под заголовком
                draw.line([(width/2 - 200, 130), (width/2 + 200, 130)], fill='#3498db', width=3)
                
                # Текст "Удостоверяется"
                bbox = draw.textbbox((0, 0), "НАСТОЯЩИМ УДОСТОВЕРЯЕТСЯ", font=font_small)
                text_width = bbox[2] - bbox[0]
                draw.text(((width - text_width) / 2, 170), "НАСТОЯЩИМ УДОСТОВЕРЯЕТСЯ", fill='#555', font=font_small)
                
                # ФИО (крупно)
                bbox = draw.textbbox((0, 0), owner, font=font_text)
                text_width = bbox[2] - bbox[0]
                draw.text(((width - text_width) / 2, 220), owner, fill='#000', font=font_text)
                
                # Описание
                from datetime import datetime
                descriptions_png = {
                    'diploma': 'за победу в олимпиаде по математике',
                    'science': 'за участие в научной конференции',
                    'sport': 'за спортивные достижения',
                    'art': 'за участие в творческом конкурсе',
                    'volunteer': 'за волонтерскую деятельность',
                }
                doc_key = filename.split('_')[0]
                desc = descriptions_png.get(doc_key, 'за активное участие')
                
                bbox = draw.textbbox((0, 0), desc, font=font_small)
                text_width = bbox[2] - bbox[0]
                draw.text(((width - text_width) / 2, 280), desc, fill='#666', font=font_small)
                
                # Дата
                date_str = f"Дата: {datetime.now().strftime('%d.%m.%Y')}"
                draw.text((100, 450), date_str, fill='#444', font=font_small)
                
                # Подпись
                draw.text((100, 500), "Подпись: _________________", fill='#444', font=font_small)
                draw.text((width-250, 500), "Печать", fill='#444', font=font_small)
                
                # Нижний колонтитул
                footer = "КГПИ КемГУ • Лига Абитуриентов"
                bbox = draw.textbbox((0, 0), footer, font=font_small)
                text_width = bbox[2] - bbox[0]
                draw.text(((width - text_width) / 2, 560), footer, fill='#888', font=font_small)
                
                img.save(filepath)
                logger.info(f"Создан тестовый PNG: {filepath}")
            except Exception as e:
                logger.warning(f"Не удалось создать PNG {filepath}: {e}")
        
        return uploads_dir

    # Наполнение базы данных тестовыми данными
    def populate_database(self):
        cursor = self.conn.cursor()
        cursor.execute("SET client_encoding TO 'UTF8';")
        cursor.execute("SET NAMES 'UTF8';")
        
        try:
            # Создание тестовых PDF файлов
            logger.info("Создание тестовых файлов документов...")
            uploads_dir = self.create_test_files()
            
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
                INSERT INTO users (full_name, phone_number, email, birth_date, login, password, is_admin, is_verified, last_data_confirmation)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (login) DO NOTHING
            """, (
                'Администратор системы',
                '+70000000000',
                'admin@liga-abiturientov.ru',
                '1990-01-01',
                'admin',
                'admin123',
                True,
                True
            ))

            # Создание тестового модератора
            cursor.execute("""
                INSERT INTO users (full_name, phone_number, email, birth_date, login, password, is_admin, is_moderator, position_id, is_verified, last_data_confirmation)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
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
                1,
                True
            ))
            
            # Пользователь 1: Иванов Иван - 3 достижения (разные статусы)
            cursor.execute("""
                INSERT INTO users (full_name, phone_number, email, birth_date, login, password, is_admin, class_course, graduation_year, school, is_verified, last_data_confirmation)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (login) DO NOTHING
                RETURNING user_id
            """, (
                'Иванов Иван Иванович',
                '+79001112233',
                'ivanov@liga-abiturientov.ru',
                '2005-05-15',
                'student1',
                'password1',
                False,
                1,
                2027,
                'Гимназия №5',

                True
            ))
            result = cursor.fetchone()
            ivanov_id = result[0] if result else None
            
            # Пользователь 2: Петрова Анна - 2 достижения (научная деятельность)
            cursor.execute("""
                INSERT INTO users (full_name, phone_number, email, birth_date, login, password, is_admin, class_course, graduation_year, school, is_verified, last_data_confirmation)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (login) DO NOTHING
                RETURNING user_id
            """, (
                'Петрова Анна Сергеевна',
                '+79002223344',
                'petrova@liga-abiturientov.ru',
                '2006-03-20',
                'student2',
                'password2',
                False,
                10,
                2028,
                'Лицей №10',
                True
            ))
            result = cursor.fetchone()
            petrova_id = result[0] if result else None
            
            # Пользователь 3: Сидоров Алексей - 2 достижения (волонтерство + спорт)
            cursor.execute("""
                INSERT INTO users (full_name, phone_number, email, birth_date, login, password, is_admin, class_course, graduation_year, school, is_verified, last_data_confirmation)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (login) DO NOTHING
                RETURNING user_id
            """, (
                'Сидоров Алексей Павлович',
                '+79003334455',
                'sidorov@liga-abiturientov.ru',
                '2005-11-08',
                'student3',
                'password3',
                False,
                11,
                2027,
                'Школа №15',
                True
            ))
            result = cursor.fetchone()
            sidorov_id = result[0] if result else None
            
            # Пользователь 4: Козлова Мария - 1 достижение (спорт)
            cursor.execute("""
                INSERT INTO users (full_name, phone_number, email, birth_date, login, password, is_admin, class_course, graduation_year, school, is_verified, last_data_confirmation)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (login) DO NOTHING
                RETURNING user_id
            """, (
                'Козлова Мария Игоревна',
                '+79004445566',
                'kozlova@liga-abiturientov.ru',
                '2006-07-25',
                'student4',
                'password4',
                False,
                10,
                2028,
                'Гимназия №3',
                True
            ))
            result = cursor.fetchone()
            kozlova_id = result[0] if result else None
            
            # Пользователь 5: Новиков Дмитрий - 2 достижения (творчество)
            cursor.execute("""
                INSERT INTO users (full_name, phone_number, email, birth_date, login, password, is_admin, class_course, graduation_year, school, is_verified, last_data_confirmation)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (login) DO NOTHING
                RETURNING user_id
            """, (
                'Новиков Дмитрий Владимирович',
                '+79005556677',
                'novikov@liga-abiturientov.ru',
                '2005-09-12',
                'student5',
                'password5',
                False,
                11,
                2027,
                'Школа искусств',
                True
            ))
            result = cursor.fetchone()
            novikov_id = result[0] if result else None
            
            # Пользователь 6: Морозова Екатерина - 1 достижение (профильная школа)
            cursor.execute("""
                INSERT INTO users (full_name, phone_number, email, birth_date, login, password, is_admin, class_course, graduation_year, school, is_verified, last_data_confirmation)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (login) DO NOTHING
                RETURNING user_id
            """, (
                'Морозова Екатерина Андреевна',
                '+79006667788',
                'morozova@liga-abiturientov.ru',
                '2006-01-30',
                'student6',
                'password6',
                False,
                10,
                2028,
                'Лицей №7',
                True
            ))
            result = cursor.fetchone()
            morozova_id = result[0] if result else None
            
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
            
            # Добавление мероприятий с датами
            # Категория 1: Профориентационные мероприятия
            cursor.execute("""
                INSERT INTO events (event_name, event_date, category_id) VALUES
                ('День Абитуриента', '2025-03-15', 1),
                ('День открытых дверей', '2025-04-20', 1),
                ('Профориентационные мастер-классы', '2025-05-10', 1),
                ('Консультации с деканами', '2025-06-05', 1)
            """)
            
            # Категория 2: Научно-исследовательская деятельность
            cursor.execute("""
                INSERT INTO events (event_name, event_date, category_id) VALUES
                ('Научные конференции школьников', '2025-02-10', 2),
                ('Олимпиады', '2025-03-25', 2),
                ('Конкурсы исследовательских работ', '2025-04-15', 2)
            """)
            
            # Категория 3: Творческие конкурсы и фестивали
            cursor.execute("""
                INSERT INTO events (event_name, event_date, category_id) VALUES
                ('Литературные конкурсы', '2025-05-20', 3),
                ('Художественные выставки', '2025-06-10', 3),
                ('Вокальные конкурсы', '2025-04-05', 3),
                ('Танцевальные конкурсы', '2025-07-15', 3),
                ('Театральные постановки', '2025-08-20', 3)
            """)
            
            # Категория 4: Спортивные мероприятия
            cursor.execute("""
                INSERT INTO events (event_name, event_date, category_id) VALUES
                ('Спартакиады', '2025-05-25', 4),
                ('Турниры по игровым видам спорта', '2025-06-30', 4)
            """)
            
            # Категория 5: Профильные школы и интенсивы
            cursor.execute("""
                INSERT INTO events (event_name, event_date, category_id) VALUES
                ('Летняя школа', '2025-07-01', 5),
                ('Зимняя школа', '2025-01-15', 5),
                ('Профильные смены', '2025-08-10', 5),
                ('Интенсивы', '2025-09-05', 5),
                ('Осенние каникулы', '2025-10-25', 5),
                ('Весенние каникулы', '2025-03-20', 5)
            """)
            
            # Категория 6: Волонтерская деятельность
            cursor.execute("""
                INSERT INTO events (event_name, event_date, category_id) VALUES
                ('Помощь в организации мероприятий совместно с КГПИ КемГУ', '2025-04-12', 6)
            """)
            
            # Получаем ID существующих пользователей
            cursor.execute("SELECT user_id, login FROM users WHERE login IN ('student1', 'student2', 'student3', 'student4', 'student5', 'student6')")
            existing_users = {row[1]: row[0] for row in cursor.fetchall()}
            ivanov_id = existing_users.get('student1') or ivanov_id
            petrova_id = existing_users.get('student2') or petrova_id
            sidorov_id = existing_users.get('student3') or sidorov_id
            kozlova_id = existing_users.get('student4') or kozlova_id
            novikov_id = existing_users.get('student5') or novikov_id
            morozova_id = existing_users.get('student6') or morozova_id
            
            # Добавление документов (достижений) с разными статусами и категориями
            # Иванов Иван: 3 документа (разные статусы)
            if ivanov_id:
                cursor.execute("""
                    INSERT INTO documents (document_name, file_path, status, points, category_id, user_id, received_date, comment) VALUES
                    ('Диплом олимпиады по математике', '/uploads/diploma_ivanov.pdf', 'Одобрено', 30, 2, %s, '2025-03-25', 'Победитель олимпиады'),
                    ('Сертификат участника Дня Абитуриента', '/uploads/pending_doc1.pdf', 'На рассмотрении', 0, 1, %s, '2025-03-15', NULL),
                    ('Диплом олимпиады (PNG)', '/uploads/diploma_math.png', 'Одобрено', 25, 2, %s, '2025-03-20', 'За отличную работу')
                    ON CONFLICT DO NOTHING
                """, (ivanov_id, ivanov_id, ivanov_id))
            
            # Петрова Анна: 2 документа (научная деятельность)
            if petrova_id:
                cursor.execute("""
                    INSERT INTO documents (document_name, file_path, status, points, category_id, user_id, received_date, comment) VALUES
                    ('Сертификат научной конференции', '/uploads/certificate_scienc.pdf', 'Одобрено', 20, 2, %s, '2025-02-10', 'Активное участие'),
                    ('Грамота за участие в конкурсе', '/uploads/science_conf.png', 'Одобрено', 15, 2, %s, '2025-04-15', 'За лучший доклад')
                    ON CONFLICT DO NOTHING
                """, (petrova_id, petrova_id))
            
            # Сидоров Алексей: 2 документа (волонтерство + спорт)
            if sidorov_id:
                cursor.execute("""
                    INSERT INTO documents (document_name, file_path, status, points, category_id, user_id, received_date, comment) VALUES
                    ('Справка волонтера мероприятий', '/uploads/volunteer_cert.png', 'Одобрено', 15, 6, %s, '2025-04-12', 'Отличная работа'),
                    ('Участник турнира по футболу', '/uploads/sport_medal.pdf', 'На рассмотрении', 0, 4, %s, '2025-05-25', NULL)
                    ON CONFLICT DO NOTHING
                """, (sidorov_id, sidorov_id))
            
            # Козлова Мария: 1 документ (спорт, отклонен)
            if kozlova_id:
                cursor.execute("""
                    INSERT INTO documents (document_name, file_path, status, points, category_id, user_id, received_date, comment) VALUES
                    ('Медаль спартакиады школьников', '/uploads/sport_medal.png', 'Отклонено', 0, 4, %s, '2025-05-25', 'Неполный пакет документов, требуется дополнительная информация')
                    ON CONFLICT DO NOTHING
                """, (kozlova_id,))
            
            # Новиков Дмитрий: 2 документа (творчество)
            if novikov_id:
                cursor.execute("""
                    INSERT INTO documents (document_name, file_path, status, points, category_id, user_id, received_date, comment) VALUES
                    ('Грамота вокального конкурса', '/uploads/art_festival.pdf', 'Одобрено', 25, 3, %s, '2025-04-05', 'Лауреат 2 степени'),
                    ('Диплом художественной выставки', '/uploads/art_competition.png', 'Одобрено', 20, 3, %s, '2025-06-10', 'За креативность')
                    ON CONFLICT DO NOTHING
                """, (novikov_id, novikov_id))
            
            # Морозова Екатерина: 1 документ (профильная школа)
            if morozova_id:
                cursor.execute("""
                    INSERT INTO documents (document_name, file_path, status, points, category_id, user_id, received_date, comment) VALUES
                    ('Сертификат Летней школы', '/uploads/school_cert.pdf', 'Одобрено', 20, 5, %s, '2025-07-01', 'Успешное окончание')
                    ON CONFLICT DO NOTHING
                """, (morozova_id,))
            
            # Добавление данных родителей для несовершеннолетних пользователей (класс 10-11)
            if ivanov_id:
                cursor.execute("""
                    INSERT INTO parents (user_id, full_name, phone_number) VALUES
                    (%s, 'Иванова Мария Петровна', '+79112223344')
                    ON CONFLICT (user_id) DO NOTHING
                """, (ivanov_id,))
            
            if petrova_id:
                cursor.execute("""
                    INSERT INTO parents (user_id, full_name, phone_number) VALUES
                    (%s, 'Петров Сергей Александрович', '+79113334455')
                    ON CONFLICT (user_id) DO NOTHING
                """, (petrova_id,))
            
            if sidorov_id:
                cursor.execute("""
                    INSERT INTO parents (user_id, full_name, phone_number) VALUES
                    (%s, 'Сидорова Ольга Викторовна', '+79114445566')
                    ON CONFLICT (user_id) DO NOTHING
                """, (sidorov_id,))
            
            if kozlova_id:
                cursor.execute("""
                    INSERT INTO parents (user_id, full_name, phone_number) VALUES
                    (%s, 'Козлов Игорь Дмитриевич', '+79115556677')
                    ON CONFLICT (user_id) DO NOTHING
                """, (kozlova_id,))
            
            if novikov_id:
                cursor.execute("""
                    INSERT INTO parents (user_id, full_name, phone_number) VALUES
                    (%s, 'Новикова Владимира Семеновна', '+79116667788')
                    ON CONFLICT (user_id) DO NOTHING
                """, (novikov_id,))
            
            if morozova_id:
                cursor.execute("""
                    INSERT INTO parents (user_id, full_name, phone_number) VALUES
                    (%s, 'Морозов Андрей Викторович', '+79117778899')
                    ON CONFLICT (user_id) DO NOTHING
                """, (morozova_id,))
            
            self.conn.commit()
            logger.info("База данных наполнена тестовыми данными")
            logger.info(f"Создано пользователей: 6 студентов + админ + модератор")
            logger.info(f"Создано документов: 11 достижений с разными статусами")
            logger.info(f"Файлы документов: {uploads_dir}")
            
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
        print("\n--- ТЕСТОВЫЕ УЧЕТНЫЕ ДАННЫЕ ---")
        print("\n[АДМИНИСТРАТОРЫ]")
        print("  admin@liga-abiturientov.ru / admin123     (Администратор системы)")
        print("  moderator@liga-abiturientov.ru / mod123   (Модератор системы)")
        print("\n[СТУДЕНТЫ]")
        print("  ivanov@liga-abiturientov.ru / password1   (Иванов Иван, 11 кл)")
        print("  petrova@liga-abiturientov.ru / password2  (Петрова Анна, 10 кл)")
        print("  sidorov@liga-abiturientov.ru / password3  (Сидоров Алексей, 11 кл)")
        print("  kozlova@liga-abiturientov.ru / password4 (Козлова Мария, 10 кл)")
        print("  novikov@liga-abiturientov.ru / password5  (Новиков Дмитрий, 11 кл)")
        print("  morozova@liga-abiturientov.ru / password6 (Морозова Екатерина, 10 кл)")
        print("\n--- СТАТИСТИКА ДОСТИЖЕНИЙ ---")
        print("  Всего документов: 11")
        print("  Статусы: Одобрено (6), На рассмотрении (4), Отклонено (1)")
        print("  Категории: Все 6 категорий покрыты")
        print("\n--- ФАЙЛЫ ДОКУМЕНТОВ ---")
        print(f"  Папка uploads: {db_name}/Test_server/uploads/")
        print("  Создано 9 тестовых PDF файлов")
        print("="*60)
        
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
