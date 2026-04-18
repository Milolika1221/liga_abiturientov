from typing import List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, delete, and_
from datetime import datetime, timedelta

from domain.repositories import UserRepository, StateRepository
from domain.entities import User, BotState, UserRole
from domain.exceptions import DatabaseException
from .models import UserModel, StateModel
from .connection import get_database

class SQLAlchemyUserRepository(UserRepository):    
    async def get_by_id(self, user_id: int) -> Optional[User]:
        try:
            async with (await get_database()).get_session() as session:
                result = await session.execute(
                    select(UserModel).where(UserModel.user_id == user_id)
                )
                user_model = result.scalar_one_or_none()
                return user_model.to_domain() if user_model else None
        except Exception as e:
            raise DatabaseException(f"Failed to get user {user_id}: {e}")
    
    async def save(self, user: User) -> User:
        try:
            async with (await get_database()).get_session() as session:
                user_model = UserModel.from_domain(user)
                user_model.updated_at = datetime.utcnow()
                
                await session.merge(user_model)
                await session.flush()
                
                return user_model.to_domain()
        except Exception as e:
            raise DatabaseException(f"Failed to save user {user.user_id}: {e}")
    
    async def get_all_admins(self) -> List[User]:
        try:
            async with (await get_database()).get_session() as session:
                result = await session.execute(
                    select(UserModel).where(UserModel.role == 'admin')
                )
                user_models = result.scalars().all()
                return [model.to_domain() for model in user_models]
        except Exception as e:
            raise DatabaseException(f"Failed to get admins: {e}")
    
    async def get_all_users(self) -> List[User]:
        try:
            async with (await get_database()).get_session() as session:
                result = await session.execute(
                    select(UserModel)
                )
                user_models = result.scalars().all()
                return [model.to_domain() for model in user_models]
        except Exception as e:
            raise DatabaseException(f"Failed to get all users: {e}")
    
    async def delete(self, user_id: int) -> bool:
        try:
            async with (await get_database()).get_session() as session:
                result = await session.execute(
                    delete(UserModel).where(UserModel.user_id == user_id)
                )
                return result.rowcount > 0
        except Exception as e:
            raise DatabaseException(f"Failed to delete user {user_id}: {e}")

class SQLAlchemyStateRepository(StateRepository):
    async def get_by_user_id(self, user_id: int) -> Optional[BotState]:
        try:
            async with (await get_database()).get_session() as session:
                result = await session.execute(
                    select(StateModel).where(StateModel.user_id == user_id)
                )
                state_model = result.scalar_one_or_none()
                return state_model.to_domain() if state_model else None
        except Exception as e:
            raise DatabaseException(f"Failed to get state for user {user_id}: {e}")
    
    async def save(self, state: BotState) -> BotState:
        try:
            async with (await get_database()).get_session() as session:
                state_model = StateModel.from_domain(state)
                state_model.updated_at = datetime.utcnow()
                
                await session.merge(state_model)
                await session.flush()
                
                return state_model.to_domain()
        except Exception as e:
            raise DatabaseException(f"Failed to save state for user {state.user_id}: {e}")
    
    async def delete(self, user_id: int) -> bool:
        try:
            async with (await get_database()).get_session() as session:
                result = await session.execute(
                    delete(StateModel).where(StateModel.user_id == user_id)
                )
                return result.rowcount > 0
        except Exception as e:
            raise DatabaseException(f"Failed to delete state for user {user_id}: {e}")
    
    async def clear_expired(self, max_age_hours: int = 24) -> int:
        try:
            async with (await get_database()).get_session() as session:
                cutoff_time = datetime.utcnow() - timedelta(hours=max_age_hours)
                result = await session.execute(
                    delete(StateModel).where(StateModel.updated_at < cutoff_time)
                )
                return result.rowcount
        except Exception as e:
            raise DatabaseException(f"Failed to clear expired states: {e}")
