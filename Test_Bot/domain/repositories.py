from abc import ABC, abstractmethod
from typing import List, Optional, Dict
from .entities import User, BotState


class UserRepository(ABC):    
    @abstractmethod
    async def get_by_id(self, user_id: int) -> Optional[User]:
        pass
    
    @abstractmethod
    async def save(self, user: User) -> User:
        pass
    
    @abstractmethod
    async def get_all_admins(self) -> List[User]:
        pass
    
    async def get_all_users(self) -> List[User]:
        pass
    
    @abstractmethod
    async def delete(self, user_id: int) -> bool:
        pass


class StateRepository(ABC):
    @abstractmethod
    async def get_by_user_id(self, user_id: int) -> Optional[BotState]:
        pass
    
    @abstractmethod
    async def save(self, state: BotState) -> BotState:
        pass
    
    @abstractmethod
    async def delete(self, user_id: int) -> bool:
        pass
    
    @abstractmethod
    async def clear_expired(self, max_age_hours: int = 24) -> int:
        pass
