from typing import List, Optional
from datetime import datetime, timedelta

from .entities import User, BotState, UserRole
from .exceptions import (
    UnauthorizedAccessException, 
    ValidationException
)
from .repositories import UserRepository
from .value_objects import UserID


class UserDomainService:    
    def __init__(self, user_repository: UserRepository):
        self.user_repository = user_repository
    
    async def ensure_user_exists(self, user_id: int, username: Optional[str] = None) -> tuple[User, bool]:
        user = await self.user_repository.get_by_id(user_id)
        is_new = False
        
        if not user:
            user = User(
                user_id=user_id,
                username=username,
                role=UserRole.USER
            )
            user = await self.user_repository.save(user)
            is_new = True
        
        return user, is_new
    
    async def can_access_admin_panel(self, user_id: int) -> bool:
        user = await self.user_repository.get_by_id(user_id)
        return user is not None and user.is_admin()
    
    async def verify_admin_access(self, user_id: int) -> bool:
        if not await self.can_access_admin_panel(user_id):
            raise UnauthorizedAccessException(f"User {user_id} does not have admin access")
        return True
    
    async def promote_to_admin(self, user_id: int) -> User:
        user = await self.user_repository.get_by_id(user_id)
        if not user:
            raise ValidationException("User not found")
        
        user.promote_to_admin()
        return await self.user_repository.save(user)
    
    async def demote_from_admin(self, user_id: int) -> User:
        user = await self.user_repository.get_by_id(user_id)
        if not user:
            raise ValidationException("User not found")
        
        user.demote_to_user()
        return await self.user_repository.save(user)

class StateDomainService:
    
    def __init__(self, state_repository):
        self.state_repository = state_repository
    
    async def set_user_state(self, user_id: int, state_name: str, data: dict = None) -> BotState:
        if data is None:
            data = {}
        
        state = await self.state_repository.get_by_user_id(user_id)
        
        if state:
            state.state_name = state_name
            state.data = data
            state.updated_at = datetime.utcnow()
        else:
            state = BotState(
                user_id=user_id,
                state_name=state_name,
                data=data,
                created_at=datetime.utcnow()
            )
        
        return await self.state_repository.save(state)
    
    async def get_user_state(self, user_id: int) -> Optional[BotState]:
        return await self.state_repository.get_by_user_id(user_id)
    
    async def clear_user_state(self, user_id: int) -> bool:
        return await self.state_repository.delete(user_id)
    
    async def update_state_data(self, user_id: int, key: str, value) -> Optional[BotState]:
        state = await self.state_repository.get_by_user_id(user_id)
        if not state:
            return None
        
        state.update_data(key, value)
        state.updated_at = datetime.utcnow()
        return await self.state_repository.save(state)
    
    async def cleanup_expired_states(self, max_age_hours: int = 24) -> int:
        return await self.state_repository.clear_expired(max_age_hours)
