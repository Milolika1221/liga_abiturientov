import logging
import sys
from pathlib import Path
from typing import Optional


def setup_logging(log_level: str = "INFO", log_file: Optional[str] = None) -> None:

    numeric_level = getattr(logging, log_level.upper(), logging.INFO)
    
    formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    handlers = []
    
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(numeric_level)
    console_handler.setFormatter(formatter)
    handlers.append(console_handler)
    
    if log_file:
        log_path = Path(log_file)
        log_path.parent.mkdir(parents=True, exist_ok=True)
        
        file_handler = logging.FileHandler(log_path, encoding='utf-8')
        file_handler.setLevel(numeric_level)
        file_handler.setFormatter(formatter)
        handlers.append(file_handler)
    
    root_logger = logging.getLogger()
    root_logger.setLevel(numeric_level)
    
    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)
    
    for handler in handlers:
        root_logger.addHandler(handler)
    
    logging.getLogger('vkbottle').setLevel(logging.WARNING)
    logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)
    logging.getLogger('sqlalchemy.pool').setLevel(logging.WARNING)

def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
