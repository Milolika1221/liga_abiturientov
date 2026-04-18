from typing import Dict, Any, Type, TypeVar, Callable, Optional
import inspect
import logging

from domain.repositories import UserRepository, StateRepository
from domain.services import UserDomainService, StateDomainService
from db.repositories import SQLAlchemyUserRepository, SQLAlchemyStateRepository
from application.use_cases import UserUseCases, BotUseCases

logger = logging.getLogger(__name__)

T = TypeVar('T')


class DIContainer:    
    def __init__(self):
        self._services: Dict[Type, Any] = {}
        self._factories: Dict[Type, Callable] = {}
        self._singletons: Dict[Type, Any] = {}
    
    def register_singleton(self, interface: Type[T], implementation: T) -> None:
        self._singletons[interface] = implementation
        logger.info(f"Registered singleton: {interface.__name__}")
    
    def register_factory(self, interface: Type[T], factory: Callable[[], T]) -> None:
        self._factories[interface] = factory
        logger.info(f"Registered factory: {interface.__name__}")
    
    def register_transient(self, interface: Type[T], implementation: Type[T]) -> None:
        self._services[interface] = implementation
        logger.info(f"Registered transient: {interface.__name__}")
    
    def get(self, interface: Type[T]) -> T:
        if interface in self._singletons:
            return self._singletons[interface]
        
        if interface in self._factories:
            return self._factories[interface]()
        
        if interface in self._services:
            implementation = self._services[interface]
            return self._create_instance(implementation)
        
        raise ValueError(f"Service {interface.__name__} not registered")
    
    def _create_instance(self, cls: Type[T]) -> T:
        sig = inspect.signature(cls.__init__)
        
        kwargs = {}
        for param_name, param in sig.parameters.items():
            if param_name == 'self':
                continue
            
            param_type = param.annotation
            if param_type != inspect.Parameter.empty:
                try:
                    kwargs[param_name] = self.get(param_type)
                except ValueError:
                    if param.default != inspect.Parameter.empty:
                        continue
                    else:
                        raise
        
        return cls(**kwargs)

class ContainerBuilder:
    def __init__(self):
        self.container = DIContainer()
    
    def build(self) -> DIContainer:
        return self.container
    
    def configure_services(self) -> 'ContainerBuilder':
        self._configure_repositories()
        self._configure_domain_services()
        self._configure_use_cases()
        return self
    
    def _configure_repositories(self) -> None:
        self.container.register_transient(UserRepository, SQLAlchemyUserRepository)
        self.container.register_transient(StateRepository, SQLAlchemyStateRepository)
    
    def _configure_domain_services(self) -> None:
        self.container.register_transient(UserDomainService, UserDomainService)
        self.container.register_transient(StateDomainService, StateDomainService)
    
    def _configure_use_cases(self) -> None:
        self.container.register_transient(UserUseCases, UserUseCases)
        self.container.register_transient(BotUseCases, BotUseCases)

_container: Optional[DIContainer] = None

def get_container() -> DIContainer:
    global _container
    if _container is None:
        raise RuntimeError("Container not initialized. Call setup_container() first.")
    return _container


def setup_container() -> DIContainer:
    global _container
    _container = ContainerBuilder().configure_services().build()
    logger.info("DI Container initialized")
    return _container


def cleanup_container() -> None:
    global _container
    _container = None
    logger.info("DI Container cleaned up")
