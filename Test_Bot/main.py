import asyncio
import signal
import sys
import logging
from pathlib import Path

project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from config import setup_config, setup_logging, get_config, get_logger
from db import setup_database, cleanup_database
from application import setup_container, cleanup_container
from presentation import VKBotPresenter


class VKBotApplication:
    def __init__(self):
        self.config = None
        self.bot_presenter = None
        self.logger = None
        self.running = False
    
    async def initialize(self):
        try:
            self.config = setup_config()
            
            setup_logging(self.config.bot.log_level, "logs/vk_bot.log")
            self.logger = get_logger(__name__)
            
            self.logger.info("🚀 Initializing VK Bot Application...")
            
            await setup_database(self.config.database.url, self.config.database.echo)
            from db import get_database
            database = await get_database()
            await database.create_tables()
            
            setup_container()
            
            self.bot_presenter = VKBotPresenter(
                vk_token=self.config.vk.token,
                group_id=self.config.vk.group_id
            )
            await self.bot_presenter.initialize()
            
            self.logger.info("✅ VK Bot Application initialized successfully")
            
        except Exception as e:
            if self.logger:
                self.logger.error(f"❌ Failed to initialize application: {e}")
            else:
                print(f"❌ Failed to initialize application: {e}")
            raise
    
    async def run(self):
        try:
            self.running = True
            self.logger.info("🤖 Starting VK Bot...")
            
            if self.bot_presenter:
                bot_task = asyncio.create_task(self.bot_presenter.run())
            
            heartbeat_task = asyncio.create_task(self._heartbeat_loop())
            
            self.logger.info("🤖 VK Bot is running...")
            while self.running:
                await asyncio.sleep(1)
            
        except KeyboardInterrupt:
            self.logger.info("⏹️ Received keyboard interrupt")
        except Exception as e:
            self.logger.error(f"❌ Bot runtime error: {e}")
        finally:
            self.running = False
            if 'heartbeat_task' in locals() and not heartbeat_task.done():
                heartbeat_task.cancel()
            if 'bot_task' in locals() and not bot_task.done():
                bot_task.cancel()
    
    async def shutdown(self):
        self.logger.info("🛑 Shutting down VK Bot Application...")
        
        try:
            if self.bot_presenter:
                await self.bot_presenter.stop()
            
            await cleanup_container()
            await cleanup_database()
            
            self.logger.info("✅ VK Bot Application shutdown complete")
            
        except Exception as e:
            self.logger.error(f"❌ Error during shutdown: {e}")
    
    async def _heartbeat_loop(self):
        while self.running:
            try:
                await asyncio.sleep(3600)  
                
                if self.running and self.bot_presenter:
                    await self.bot_presenter.bot.api.messages.send(
                        peer_id=self.config.bot.heartbeat_chat_id,
                        message=f"💓 Бот жив! Время: {asyncio.get_event_loop().time()}",
                        random_id=0
                    )
                    self.logger.debug("Heartbeat sent successfully")
                    
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"❌ Heartbeat error: {e}")


app: VKBotApplication = None

def signal_handler(signum, frame):
    logger = get_logger(__name__)
    logger.info(f"📡 Received signal {signum}")
    
    if app:
        app.running = False
        try:
            loop = asyncio.get_event_loop()
            if loop.is_running():
                asyncio.create_task(app.shutdown())
            else:
                asyncio.run_coroutine_threadsafe(app.shutdown(), loop)
        except RuntimeError:
            pass


async def main():
    global app
    
    try:
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)
        
        app = VKBotApplication()
        await app.initialize()
        await app.run()
        
    except Exception as e:
        logger = get_logger(__name__)
        logger.error(f"❌ Fatal error: {e}")
        sys.exit(1)
    finally:
        if app:
            await app.shutdown()


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n⏹️ Application interrupted by user")
    except Exception as e:
        print(f"❌ Application error: {e}")
        sys.exit(1)
