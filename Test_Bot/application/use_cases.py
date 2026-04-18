from typing import List, Optional, Dict, Any
import logging

from domain.entities import User, UserRole
from domain.exceptions import UserNotFoundException
from domain.repositories import UserRepository
from domain.services import UserDomainService

logger = logging.getLogger(__name__)


class UserUseCases:
    def __init__(self, user_repository: UserRepository, user_service: UserDomainService):
        self.user_repository = user_repository
        self.user_service = user_service
    
    async def get_or_create_user(self, user_id: int, username: Optional[str] = None) -> tuple[User, bool]:
        return await self.user_service.ensure_user_exists(user_id, username)
    
    async def update_user_info(self, user_id: int, username: Optional[str] = None) -> User:
        user = await self.user_repository.get_by_id(user_id)
        if not user:
            raise UserNotFoundException(f"User {user_id} not found")
        
        if username:
            user.username = username
        
        return await self.user_repository.save(user)

class BotUseCases:    
    def __init__(self, user_use_cases: UserUseCases):
        self.user_use_cases = user_use_cases
    
    async def handle_user_message(self, user_id: int, username: Optional[str], message_text: str) -> Dict[str, Any]:
        user, _ = await self.user_use_cases.get_or_create_user(user_id, username)
        
        return {
            "action": "show_main_menu",
            "data": {}
        }
