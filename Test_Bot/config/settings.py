import os
from typing import List
from dotenv import load_dotenv
from dataclasses import dataclass

load_dotenv()

def _get_database_url() -> str:
    url = os.getenv('DATABASE_URL')
    if url:
        if url.startswith('postgresql://') and not url.startswith('postgresql+asyncpg://'):
            url = url.replace('postgresql://', 'postgresql+asyncpg://', 1)
        return url
    
    user = os.getenv('DB_USER', 'postgres')
    password = os.getenv('DB_PASSWORD', 'postgres')
    host = os.getenv('DB_HOST', 'localhost')
    port = os.getenv('DB_PORT', '5432')
    db_name = os.getenv('DB_NAME', 'bot_database')
    
    return f'postgresql+asyncpg://{user}:{password}@{host}:{port}/{db_name}'

@dataclass
class VKConfig:
    token: str
    group_id: int
    api_version: str = "5.199"

@dataclass
class DatabaseConfig:
    url: str
    echo: bool = False
    pool_size: int = 10
    max_overflow: int = 20

@dataclass
class BotConfig:
    admins: List[int]
    heartbeat_chat_id: int
    log_level: str = "INFO"
    max_file_size: int = 50 * 1024 * 1024  # 50MB
    upload_folder: str = "uploads"


@dataclass
class AppConfig:
    vk: VKConfig
    database: DatabaseConfig
    bot: BotConfig
    
    @classmethod
    def from_env(cls) -> 'AppConfig':
        return cls(
            vk=VKConfig(
                token=os.getenv('VK_TOKEN', ''),
                group_id=int(os.getenv('GROUP_ID', '0')),
                api_version=os.getenv('VK_API_VERSION', '5.199')
            ),
            database=DatabaseConfig(
                url=_get_database_url(),
                echo=os.getenv('DB_ECHO', 'false').lower() == 'true',
                pool_size=int(os.getenv('DB_POOL_SIZE', '10')),
                max_overflow=int(os.getenv('DB_MAX_OVERFLOW', '20'))
            ),
            bot=BotConfig(
                admins=list(map(int, os.getenv('ADMINS', '1018042795').split(','))),
                heartbeat_chat_id=int(os.getenv('HEARTBEAT_CHAT_ID', '1018042795')),
                log_level=os.getenv('LOG_LEVEL', 'INFO'),
                max_file_size=int(os.getenv('MAX_FILE_SIZE', str(50 * 1024 * 1024))),
                upload_folder=os.getenv('UPLOAD_FOLDER', 'uploads')
            )
        )
    
    def validate(self) -> None:
        if not self.vk.token:
            raise ValueError("VK_TOKEN is required")
        
        if self.vk.group_id <= 0:
            raise ValueError("GROUP_ID must be a positive integer")
        
        if not self.database.url:
            raise ValueError("DATABASE_URL is required")
        
        if not self.bot.admins:
            raise ValueError("ADMINS list cannot be empty")
        
        if self.bot.heartbeat_chat_id <= 0:
            raise ValueError("HEARTBEAT_CHAT_ID must be a positive integer")

_config: AppConfig = None

def get_config() -> AppConfig:
    global _config
    if _config is None:
        raise RuntimeError("Configuration not initialized. Call setup_config() first.")
    return _config

def setup_config() -> AppConfig:
    global _config
    _config = AppConfig.from_env()
    _config.validate()
    return _config

def cleanup_config() -> None:
    global _config
    _config = None
