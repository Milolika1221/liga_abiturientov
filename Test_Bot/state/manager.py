from typing import Dict, Optional, Any, Callable, Awaitable
from datetime import datetime, timedelta
import json
import logging

from domain.entities import BotState, Message, Callback
from domain.exceptions import InvalidStateException, StateNotFoundException
from domain.repositories import StateRepository

logger = logging.getLogger(__name__)


class StateHandler:    
    def __init__(self, state_name: str):
        self.state_name = state_name
    
    async def on_enter(self, user_id: int, data: Dict[str, Any] = None) -> Optional[str]:
        return None
    
    async def handle_message(self, message: Message, state_data: Dict[str, Any]) -> Optional[str]:
        return None
    
    async def handle_callback(self, callback: Callback, state_data: Dict[str, Any]) -> Optional[str]:
        return None
    
    async def on_exit(self, user_id: int, data: Dict[str, Any] = None) -> Optional[str]:
        return None


class StateManager:    
    def __init__(self, state_repository: StateRepository):
        self.state_repository = state_repository
        self.handlers: Dict[str, StateHandler] = {}
        self.default_state = "main_menu"
    
    def register_handler(self, state_name: str, handler: StateHandler):
        self.handlers[state_name] = handler
        logger.info(f"Registered handler for state: {state_name}")
    
    async def get_user_state(self, user_id: int) -> Optional[BotState]:
        return await self.state_repository.get_by_user_id(user_id)
    
    async def set_user_state(self, user_id: int, state_name: str, data: Dict[str, Any] = None) -> BotState:
        if data is None:
            data = {}
        
        current_state = await self.get_user_state(user_id)
        
        if current_state and current_state.current_state in self.handlers:
            try:
                await self.handlers[current_state.current_state].on_exit(user_id, current_state.data)
            except Exception as e:
                logger.error(f"Error in on_exit for state {current_state.current_state}: {e}")
        
        new_state = BotState(
            user_id=user_id,
            current_state=state_name,
            data=data,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        saved_state = await self.state_repository.save(new_state)
        
        if state_name in self.handlers:
            try:
                response = await self.handlers[state_name].on_enter(user_id, data)
                if response:
                    saved_state.data.update({"last_response": response})
                    saved_state = await self.state_repository.save(saved_state)
            except Exception as e:
                logger.error(f"Error in on_enter for state {state_name}: {e}")
        
        return saved_state
    
    async def update_state_data(self, user_id: int, key: str, value: Any) -> Optional[BotState]:
        state = await self.get_user_state(user_id)
        if not state:
            return None
        
        state.update_data(key, value)
        state.updated_at = datetime.utcnow()
        return await self.state_repository.save(state)
    
    async def clear_user_state(self, user_id: int) -> bool:
        current_state = await self.get_user_state(user_id)
        
        if current_state and current_state.current_state in self.handlers:
            try:
                await self.handlers[current_state.current_state].on_exit(user_id, current_state.data)
            except Exception as e:
                logger.error(f"Error in on_exit for state {current_state.current_state}: {e}")
        
        return await self.state_repository.delete(user_id)
    
    async def handle_message(self, message: Message) -> Optional[str]:
        state = await self.get_user_state(message.user_id)
        
        if not state:
            await self.set_user_state(message.user_id, self.default_state)
            state = await self.get_user_state(message.user_id)
        
        if not state or state.current_state not in self.handlers:
            return None
        
        try:
            handler = self.handlers[state.current_state]
            response = await handler.handle_message(message, state.data)
            
            if response:
                state.update_data("last_response", response)
                state.updated_at = datetime.utcnow()
                await self.state_repository.save(state)
            
            return response
        except Exception as e:
            logger.error(f"Error handling message in state {state.current_state}: {e}")
            return None
    
    async def handle_callback(self, callback: Callback) -> Optional[str]:
        state = await self.get_user_state(callback.user_id)
        
        if not state:
            await self.set_user_state(callback.user_id, self.default_state)
            state = await self.get_user_state(callback.user_id)
        
        if not state or state.current_state not in self.handlers:
            return None
        
        try:
            handler = self.handlers[state.current_state]
            response = await handler.handle_callback(callback, state.data)
            
            if response:
                state.update_data("last_response", response)
                state.updated_at = datetime.utcnow()
                await self.state_repository.save(state)
            
            return response
        except Exception as e:
            logger.error(f"Error handling callback in state {state.current_state}: {e}")
            return None
    
    async def cleanup_expired_states(self, max_age_hours: int = 24) -> int:
        return await self.state_repository.clear_expired(max_age_hours)
    
    async def get_all_active_states(self) -> Dict[int, BotState]:
        return {}


class BaseStateHandler(StateHandler):    
    def __init__(self, state_name: str, state_manager: StateManager):
        super().__init__(state_name)
        self.state_manager = state_manager
    
    async def transition_to(self, user_id: int, new_state: str, data: Dict[str, Any] = None) -> BotState:
        return await self.state_manager.set_user_state(user_id, new_state, data)
    
    async def go_to_main_menu(self, user_id: int) -> BotState:
        return await self.transition_to(user_id, "main_menu")
    
    async def go_to_admin_menu(self, user_id: int) -> BotState:
        return await self.transition_to(user_id, "admin_menu")
    
    async def clear_state(self, user_id: int) -> bool:
        return await self.state_manager.clear_user_state(user_id)
