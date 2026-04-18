from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from contextlib import asynccontextmanager
from typing import AsyncGenerator
import logging

logger = logging.getLogger(__name__)

Base = declarative_base()

class DatabaseConfig:
    def __init__(self, database_url: str, echo: bool = False):
        self.database_url = database_url
        self.echo = echo
        self._engine = None
        self._session_factory = None
    
    async def initialize(self) -> None:
        try:
            self._engine = create_async_engine(
                self.database_url,
                echo=self.echo,
                pool_pre_ping=True,
                pool_recycle=3600,
                pool_size=10,
                max_overflow=20
            )
            
            self._session_factory = async_sessionmaker(
                self._engine,
                class_=AsyncSession,
                expire_on_commit=False
            )
            
            logger.info("Database engine initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            raise
    
    async def close(self) -> None:
        if self._engine:
            await self._engine.dispose()
            logger.info("Database connections closed")
    
    @asynccontextmanager
    async def get_session(self) -> AsyncGenerator[AsyncSession, None]:
        if not self._session_factory:
            raise RuntimeError("Database not initialized. Call initialize() first.")
        
        async with self._session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception as e:
                await session.rollback()
                logger.error(f"Database session error: {e}")
                raise
            finally:
                await session.close()
    
    async def create_tables(self) -> None:
        if not self._engine:
            raise RuntimeError("Database not initialized. Call initialize() first.")
        
        try:
            logger.info("Creating database tables...")
            async with self._engine.begin() as conn:
                logger.debug("Connection established, running create_all...")
                await conn.run_sync(Base.metadata.create_all)
                logger.debug("create_all completed")
            logger.info("Database tables created successfully")
        except Exception as e:
            logger.error(f"Failed to create database tables: {e}")
            import traceback
            logger.error(f"Traceback: {traceback.format_exc()}")
            raise
    
    async def drop_tables(self) -> None:
        if not self._engine:
            raise RuntimeError("Database not initialized. Call initialize() first.")
        
        try:
            async with self._engine.begin() as conn:
                await conn.run_sync(Base.metadata.drop_all)
            logger.warning("Database tables dropped")
        except Exception as e:
            logger.error(f"Failed to drop database tables: {e}")
            raise

db_config: DatabaseConfig = None


async def get_database() -> DatabaseConfig:
    global db_config
    if db_config is None:
        raise RuntimeError("Database not configured. Call setup_database() first.")
    return db_config


async def setup_database(database_url: str, echo: bool = False) -> DatabaseConfig:
    global db_config
    db_config = DatabaseConfig(database_url, echo)
    await db_config.initialize()
    return db_config


async def cleanup_database() -> None:
    global db_config
    if db_config:
        await db_config.close()
        db_config = None
