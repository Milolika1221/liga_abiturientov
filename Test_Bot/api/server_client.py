"""
API Client for communicating with Liga Abiturientov server
"""

import aiohttp
import logging
from typing import Dict, Any, Optional
from config import get_config

logger = logging.getLogger(__name__)


class ServerAPIClient:    
    def __init__(self):
        self.config = get_config()
        self.base_url = self.config.server.api_url
        self.timeout = aiohttp.ClientTimeout(total=self.config.server.timeout)
    
    async def verify_token(self, token: str) -> Dict[str, Any]:

        try:
            url = f"{self.base_url}/verify-token"
            payload = {"token": token}
            
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                async with session.post(url, json=payload) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        return {
                            "status": "error",
                            "message": f"Server returned status {response.status}"
                        }
                        
        except aiohttp.ClientConnectorError:
            logger.error("Cannot connect to server. Is it running?")
            return {
                "status": "error", 
                "message": "Сервер недоступен. Убедитесь, что сервер запущен на localhost:3000"
            }
        except aiohttp.ClientError as e:
            logger.error(f"Client error: {e}")
            return {
                "status": "error",
                "message": f"Ошибка соединения: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return {
                "status": "error",
                "message": "Произошла непредвиденная ошибка"
            }
    
    async def request_password_reset(self, identifier: str) -> Dict[str, Any]:
        try:
            url = f"{self.base_url}/request-password-reset-vk"
            payload = {"identifier": identifier}
            
            async with aiohttp.ClientSession(timeout=self.timeout) as session:
                async with session.post(url, json=payload) as response:
                    if response.status == 200:
                        return await response.json()
                    else:
                        return {
                            "status": "error",
                            "message": f"Server returned status {response.status}"
                        }
                        
        except aiohttp.ClientConnectorError:
            logger.error("Cannot connect to server. Is it running?")
            return {
                "status": "error",
                "message": "Сервер недоступен. Убедитесь, что сервер запущен на localhost:3000"
            }
        except aiohttp.ClientError as e:
            logger.error(f"Client error: {e}")
            return {
                "status": "error",
                "message": f"Ошибка соединения: {str(e)}"
            }
        except Exception as e:
            logger.error(f"Unexpected error: {e}")
            return {
                "status": "error",
                "message": "Произошла непредвиденная ошибка"
            }
    
    async def health_check(self) -> bool:

        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=5)) as session:
                async with session.get(self.base_url) as response:
                    return response.status < 500
        except:
            return False


_api_client: Optional[ServerAPIClient] = None


def get_api_client() -> ServerAPIClient:
    global _api_client
    if _api_client is None:
        _api_client = ServerAPIClient()
    return _api_client
