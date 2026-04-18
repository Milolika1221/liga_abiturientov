import asyncio
import logging
import re
import requests
import json
from typing import Optional
from datetime import datetime

from vkbottle import Bot, API, Keyboard, KeyboardButtonColor, Text, OpenLink
from vkbottle.bot import Bot as VBot
from vkbottle.bot import Message
from application import get_container

logger = logging.getLogger(__name__)


class VKBotPresenter:    
    def __init__(self, vk_token: str, group_id: int):
        self.api = API(vk_token)
        self.bot = VBot(api=self.api)
        self.group_id = group_id
        self.use_cases = None
        
        self._setup_handlers()
    
    async def initialize(self):
        container = get_container()
        from application.use_cases import BotUseCases
        self.use_cases = container.get(BotUseCases)
        
        logger.info("VK Bot presenter initialized (minimal version)")
    
    def _setup_handlers(self):
        @self.bot.on.message(text=["/start", "start", "Начать", "начать", "Меню", "меню"])
        async def handle_start(message: Message):
            await self._handle_start(message)
        
        @self.bot.on.message(text=["Подтвердить аккаунт", "подтвердить аккаунт"])
        async def handle_confirm(message: Message):
            await self._handle_confirm_account(message)
        
        @self.bot.on.message(text=["Восстановить пароль", "восстановить пароль", "Восстановить аккаунт", "восстановить аккаунт"])
        async def handle_reset(message: Message):
            await self._handle_reset_password(message)
        
        @self.bot.on.message(text=["Назад", "назад"])
        async def handle_back(message: Message):
            await self._handle_start(message)
        
        @self.bot.on.message()
        async def handle_text(message: Message):
            await self._handle_text_input(message)
    
    async def _handle_start(self, message: Message):
        user_id = message.from_id
        peer_id = message.peer_id
        
        try:
            user_info = await self.bot.api.users.get(user_ids=user_id)
            username = user_info[0].first_name if user_info and user_info[0].first_name else str(user_id)
            
            welcome_text = f"""👋 Привет, {username}!

Это бот Лига Абитуриентов.

Здесь вы можете:
• Подтвердить свой аккаунт
• Восстановить доступ к аккаунту

Выберите действие:"""
            
            keyboard = Keyboard(one_time=False, inline=True)
            keyboard.row()
            keyboard.add(Text("Подтвердить аккаунт"), KeyboardButtonColor.PRIMARY)
            keyboard.row()
            keyboard.add(Text("Восстановить пароль"), KeyboardButtonColor.PRIMARY)
            
            await self.bot.api.messages.send(
                peer_id=peer_id,
                message=welcome_text,
                keyboard=keyboard.get_json(),
                random_id=0
            )
            
            logger.info(f"Sent main menu to user {user_id}")
            
        except Exception as e:
            logger.error(f"Error in start handler: {e}")
            await self._send_error(peer_id)
    
    async def _handle_confirm_account(self, message: Message):
        user_id = message.from_id
        peer_id = message.peer_id
        
        try:
            text = """🔐 **Подтверждение аккаунта**

Введите токен подтверждения, полученный на сайте Лига Абитуриентов.

📋 **Как получить токен:**
1. Зарегистрируйтесь на сайте приемной комиссии
2. Перейдите в профиль и нажмите "Верификация через бота"
3. Скопируйте токен из окна
4. Отправьте токен в этот чат

💡 **Тестовый токен для проверки:** `TEST123456`

Введите токен:"""
            
            keyboard = Keyboard(one_time=False, inline=True)
            keyboard.row()
            keyboard.add(Text("Назад"), KeyboardButtonColor.SECONDARY)
            
            await self.bot.api.messages.send(
                peer_id=peer_id,
                message=text,
                keyboard=keyboard.get_json(),
                random_id=0
            )
            
            self._set_user_state(user_id, "waiting_token")
            
        except Exception as e:
            logger.error(f"Error in confirm handler: {e}")
            await self._send_error(peer_id)
    
    async def _handle_reset_password(self, message: Message):
        user_id = message.from_id
        peer_id = message.peer_id
        
        try:
            text = """🔐 **Восстановление пароля**

Введите ваш email или номер телефона для восстановления пароля.

📋 **Форматы:**
• Email: `example@mail.ru`
• Телефон: `+79991234567`

После проверки бот пришлет вам ссылку для восстановления пароля.

Введите email или телефон:"""
            
            keyboard = Keyboard(one_time=False, inline=True)
            keyboard.row()
            keyboard.add(Text("Назад"), KeyboardButtonColor.SECONDARY)
            
            await self.bot.api.messages.send(
                peer_id=peer_id,
                message=text,
                keyboard=keyboard.get_json(),
                random_id=0
            )
            
            self._set_user_state(user_id, "waiting_reset_identifier")
            
        except Exception as e:
            logger.error(f"Error in reset handler: {e}")
            await self._send_error(peer_id)
    
    async def _handle_text_input(self, message: Message):
        user_id = message.from_id
        peer_id = message.peer_id
        text = message.text.strip()
        
        state = self._get_user_state(user_id)
        
        if state == "waiting_token":
            await self._process_token(user_id, peer_id, text)
        elif state == "waiting_reset_identifier":
            await self._process_reset_identifier(user_id, peer_id, text)
        else:
            await self._handle_start(message)
    
    async def _process_token(self, user_id: int, peer_id: int, token: str):
        try:
            if token == "TEST123456":
                keyboard = Keyboard(one_time=False, inline=True)
                keyboard.row()
                keyboard.add(Text("Назад"), KeyboardButtonColor.SECONDARY)
                
                await self.bot.api.messages.send(
                    peer_id=peer_id,
                    message="""✅ **Тестовый аккаунт подтвержден!**

Токен принят (TEST123456).
• Проверка на сервере: ✅ (имитация)
• Статус верификации: ✅ Подтвержден

В реальном режиме здесь была бы ссылка в личный кабинет.""",
                    keyboard=keyboard.get_json(),
                    random_id=0
                )
                self._clear_user_state(user_id)
                return
            
            backend_url = "http://localhost:3000/verify-token-vk"
            payload = {"token": token}
            
            response = requests.post(backend_url, json=payload, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get("status") == "yea":
                    login = result.get("login", "user")
                    keyboard = Keyboard(one_time=False, inline=True)
                    keyboard.row()
                    keyboard.add(Text("Назад"), KeyboardButtonColor.SECONDARY)
                    
                    await self.bot.api.messages.send(
                        peer_id=peer_id,
                        message=f"""✅ **Аккаунт подтвержден!**

👤 Логин: `{login}`
📧 Email: {result.get('email', 'не указан')}
🕐 Подтвержден: {datetime.now().strftime('%d.%m.%Y %H:%M')}

Аккаунт успешно верифицирован!""",
                        keyboard=keyboard.get_json(),
                        random_id=0
                    )
                else:
                    await self._send_message(peer_id, f"❌ {result.get('message', 'Неверный токен')}")
            else:
                await self._send_message(peer_id, "❌ Ошибка сервера. Попробуйте позже.")
                
        except requests.exceptions.RequestException:
            await self._send_message(peer_id, "❌ Нет связи с сервером. Попробуйте позже.")
        except Exception as e:
            logger.error(f"Error processing token: {e}")
            await self._send_error(peer_id)
        finally:
            self._clear_user_state(user_id)
    
    async def _process_reset_identifier(self, user_id: int, peer_id: int, identifier: str):
        try:
            # Validate format
            is_email = re.match(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$', identifier)
            is_phone = re.match(r'^[\+]?[78]?[\s\-]?\(?[0-9]{3}\)?[\s\-]?[0-9]{3}[\s\-]?[0-9]{2}[\s\-]?[0-9]{2}$', identifier)
            
            if not (is_email or is_phone):
                await self._send_message(peer_id, 
                    "❌ Неверный формат. Введите:\n"
                    "• Email: example@mail.ru\n"
                    "• Телефон: +79001112233")
                return
            
            if identifier in ["test@test.com", "+79001112233"]:
                test_url = "https://example.com/reset?token=TEST123"
                keyboard = Keyboard(one_time=False, inline=True)
                keyboard.row()
                keyboard.add(OpenLink(test_url, "🔗 Восстановить пароль (ТЕСТ)"), KeyboardButtonColor.PRIMARY)
                keyboard.row()
                keyboard.add(Text("Назад"), KeyboardButtonColor.SECONDARY)
                
                await self.bot.api.messages.send(
                    peer_id=peer_id,
                    message=f"""✅ **Тестовый пользователь найден!**

📧 Идентификатор: `{identifier}`
👤 Имя: Тестовый Пользователь

⏰ Ссылка действительна 1 час""",
                    keyboard=keyboard.get_json(),
                    random_id=0
                )
                self._clear_user_state(user_id)
                return
            
            # Call backend API
            backend_url = "http://localhost:3000/request-password-reset-vk"
            payload = {"identifier": identifier}
            
            response = requests.post(backend_url, json=payload, timeout=10)
            
            if response.status_code == 200:
                result = response.json()
                
                if result.get("status") == "yea":
                    reset_url = result.get("resetUrl")
                    if reset_url:
                        keyboard = Keyboard(one_time=False, inline=True)
                        keyboard.row()
                        keyboard.add(OpenLink(reset_url, "🔗 Восстановить пароль"), KeyboardButtonColor.PRIMARY)
                        keyboard.row()
                        keyboard.add(Text("Назад"), KeyboardButtonColor.SECONDARY)
                        
                        await self.bot.api.messages.send(
                            peer_id=peer_id,
                            message=f"""✅ **Пользователь найден!**

👤 Имя: {result.get('userName', 'Пользователь')}
📧 Восстановление для: `{identifier}`

⏰ **Важно:** Ссылка действительна 1 час.""",
                            keyboard=keyboard.get_json(),
                            random_id=0
                        )
                    else:
                        await self._send_message(peer_id, "❌ Ошибка при генерации ссылки.")
                else:
                    await self._send_message(peer_id, f"❌ {result.get('message', 'Пользователь не найден')}")
            else:
                await self._send_message(peer_id, "❌ Ошибка сервера. Попробуйте позже.")
                
        except requests.exceptions.RequestException:
            await self._send_message(peer_id, "❌ Нет связи с сервером. Попробуйте позже.")
        except Exception as e:
            logger.error(f"Error processing reset: {e}")
            await self._send_error(peer_id)
        finally:
            self._clear_user_state(user_id)
    
    _user_states: dict = {}
    
    def _set_user_state(self, user_id: int, state: str):
        self._user_states[user_id] = state
    
    def _get_user_state(self, user_id: int) -> Optional[str]:
        return self._user_states.get(user_id)
    
    def _clear_user_state(self, user_id: int):
        self._user_states.pop(user_id, None)
    
    async def _send_message(self, peer_id: int, text: str):
        await self.bot.api.messages.send(
            peer_id=peer_id,
            message=text,
            random_id=0
        )
    
    async def _send_error(self, peer_id: int):
        keyboard = Keyboard(one_time=False, inline=True)
        keyboard.row()
        keyboard.add(Text("Назад"), KeyboardButtonColor.SECONDARY)
        
        await self.bot.api.messages.send(
            peer_id=peer_id,
            message="❌ Произошла ошибка. Попробуйте снова.",
            keyboard=keyboard.get_json(),
            random_id=0
        )
    
    async def run(self):
        await self.initialize()
        logger.info("Starting VK Bot (minimal version with 2 buttons)...")
        await self.bot.run_polling()
    
    async def stop(self):
        logger.info("Stopping VK Bot...")
