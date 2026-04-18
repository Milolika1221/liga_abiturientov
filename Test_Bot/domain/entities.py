from dataclasses import dataclass
from typing import Optional, List
from datetime import datetime
from enum import Enum


class UserRole(Enum):
    USER = "user"
    ADMIN = "admin"

@dataclass
class User:
    user_id: int
    username: Optional[str] = None
    role: UserRole = UserRole.USER
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    def is_admin(self) -> bool:
        return self.role == UserRole.ADMIN
    
    def promote_to_admin(self) -> None:
        self.role = UserRole.ADMIN
    
    def demote_to_user(self) -> None:
        self.role = UserRole.USER

@dataclass
class BotState:
    user_id: int
    state_name: str
    data: dict
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    
    def update_data(self, key: str, value) -> None:
        self.data[key] = value
    
    def get_data(self, key: str, default=None):
        return self.data.get(key, default)
    
    def clear_data(self) -> None:
        self.data.clear()
