from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass(frozen=True)
class UserID:
    value: int
    
    def __post_init__(self):
        if not isinstance(self.value, int) or self.value <= 0:
            raise ValueError("User ID must be a positive integer")
    
    @property
    def is_admin(self) -> bool:
        return False

@dataclass(frozen=True)
class BotCommand:
    value: str
    
    def __post_init__(self):
        if not isinstance(self.value, str):
            raise ValueError("Command must be a string")
        if not self.value.startswith('/'):
            raise ValueError("Command must start with '/'")
    
    @property
    def name(self) -> str:
        return self.value[1:].lower().strip()
    
    def is_admin_command(self) -> bool:
        admin_commands = ['admin', 'админ', 'admin-panel', 'админ-панель']
        return self.name in admin_commands
    
    def is_start_command(self) -> bool:
        return self.name in ['start', 'help', 'помощь']

@dataclass(frozen=True)
class StateName:
    value: str
    
    def __post_init__(self):
        if not isinstance(self.value, str):
            raise ValueError("State name must be a string")
        if len(self.value.strip()) < 1:
            raise ValueError("State name cannot be empty")
        if len(self.value) > 50:
            raise ValueError("State name must be less than 50 characters")
    
    @property
    def sanitized(self) -> str:
        return self.value.strip().lower()


@dataclass(frozen=True)
class Timestamp:
    value: Optional[datetime] = None
    
    def __post_init__(self):
        if self.value is not None and not isinstance(self.value, datetime):
            raise ValueError("Timestamp must be a datetime object")
    
    @property
    def exists(self) -> bool:
        return self.value is not None
    
    @classmethod
    def now(cls) -> 'Timestamp':
        return cls(datetime.utcnow())
