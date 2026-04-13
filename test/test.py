"""
Нагрузочный тест для проверки работы сайта под нагрузкой 150 пользователей.
Поддерживает сценарии:
- Одновременные действия (всплески нагрузки)
- Параллельные действия (равномерное распределение)
Сохраняет отчет с результатами тестирования.
"""

import asyncio
import aiohttp
import aiofiles
import asyncpg
import time
import json
import os
import sys
import random
from datetime import datetime, timedelta
from dataclasses import dataclass, field, asdict
from typing import List, Dict, Optional
from pathlib import Path
from dotenv import load_dotenv
import statistics

# Загружаем переменные окружения
load_dotenv(os.path.join(os.path.dirname(__file__), '..', 'Test_server', '.env'))

# Конфигурация
BASE_URL = os.getenv('TEST_BASE_URL', 'http://localhost:3000')
DB_CONFIG = {
    'user': os.getenv('DB_USER'),
    'password': os.getenv('DB_PASSWORD'),
    'database': os.getenv('DB_NAME'),
    'host': os.getenv('DB_HOST'),
    'port': int(os.getenv('DB_PORT', 5432))
}

REPORTS_DIR = Path(__file__).parent / 'reports'


@dataclass
class TestResult:
    # Результат отдельного запроса
    endpoint: str
    method: str
    status_code: int
    response_time_ms: float
    success: bool
    error_message: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class UserSession:
    # Сессия пользователя
    user_id: int
    login: str  
    password: str
    email: str 
    token: Optional[str] = None
    cookies: Dict = field(default_factory=dict)
    results: List[TestResult] = field(default_factory=list)


@dataclass
class LoadTestReport:
    # Отчет о нагрузочном тесте
    test_name: str
    start_time: datetime
    total_users: int
    concurrent_users: int
    test_duration_seconds: int
    scenario_type: str
    end_time: Optional[datetime] = None
    
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    
    avg_response_time_ms: float = 0.0
    min_response_time_ms: float = 0.0
    max_response_time_ms: float = 0.0
    p50_response_time_ms: float = 0.0
    p95_response_time_ms: float = 0.0
    p99_response_time_ms: float = 0.0
    
    requests_per_second: float = 0.0
    
    endpoint_stats: Dict = field(default_factory=dict)
    errors: List[Dict] = field(default_factory=list)
    
    def to_dict(self):
        return {
            'test_name': self.test_name,
            'start_time': self.start_time.isoformat(),
            'end_time': self.end_time.isoformat() if self.end_time else None,
            'total_users': self.total_users,
            'concurrent_users': self.concurrent_users,
            'test_duration_seconds': self.test_duration_seconds,
            'scenario_type': self.scenario_type,
            'total_requests': self.total_requests,
            'successful_requests': self.successful_requests,
            'failed_requests': self.failed_requests,
            'success_rate_percent': round(self.successful_requests / max(self.total_requests, 1) * 100, 2),
            'avg_response_time_ms': round(self.avg_response_time_ms, 2),
            'min_response_time_ms': round(self.min_response_time_ms, 2),
            'max_response_time_ms': round(self.max_response_time_ms, 2),
            'p50_response_time_ms': round(self.p50_response_time_ms, 2),
            'p95_response_time_ms': round(self.p95_response_time_ms, 2),
            'p99_response_time_ms': round(self.p99_response_time_ms, 2),
            'requests_per_second': round(self.requests_per_second, 2),
            'endpoint_stats': self.endpoint_stats,
            'errors': self.errors[:20] 
        }


class LoadTesterAdvanced:
    # Продвинутый нагрузочный тестер
    
    def __init__(self, base_url: str, total_users: int = 150, concurrent_users: int = 50):
        self.base_url = base_url
        self.total_users = total_users
        self.concurrent_users = concurrent_users
        self.user_sessions: List[UserSession] = []
        self.all_results: List[TestResult] = []
        self.report: Optional[LoadTestReport] = None
        self.stress_mode: bool = False  # Режим постоянной нагрузки без задержек
        
    async def get_test_users_from_db(self) -> List[Dict]:
        # Получение тестовых пользователей из БД
        conn = await asyncpg.connect(**DB_CONFIG)
        
        users = await conn.fetch(
            """
            SELECT user_id, login, email
            FROM users 
            WHERE login LIKE 'test_user_%' OR is_admin = false 
            ORDER BY user_id 
            LIMIT $1
            """,
            self.total_users
        )
        
        await conn.close()
        
        return [
            {
                'user_id': u['user_id'],
                'login': u['login'],
                'email': u['email'], 
                'password': 'TestPass123!' if u['login'].startswith('test_user_') else 'password123'
            }
            for u in users
        ]
    
    async def login_user(self, session: aiohttp.ClientSession, user: UserSession) -> bool:
        # Авторизация пользователя
        try:
            start_time = time.time()
            
            async with session.post(
                f"{self.base_url}/login",
                json={
                    'email': user.email,  
                    'password': user.password
                }
            ) as response:
                response_time = (time.time() - start_time) * 1000
                
                success = response.status == 200
                
                # Логируем неуспешные запросы для отладки
                if not success:
                    try:
                        error_text = await response.text()
                        print(f"\n⚠ Login failed for {user.email}: HTTP {response.status} - {error_text[:100]}")
                    except:
                        print(f"\n⚠ Login failed for {user.email}: HTTP {response.status}")
                
                result = TestResult(
                    endpoint='/login',
                    method='POST',
                    status_code=response.status,
                    response_time_ms=response_time,
                    success=success
                )
                user.results.append(result)
                
                if success:
                    data = await response.json()
                    if data.get('status') == 'yea':
                        user.token = data.get('user', {}).get('token')
                
                return success
                
        except Exception as e:
            result = TestResult(
                endpoint='/login',
                method='POST',
                status_code=0,
                response_time_ms=0,
                success=False,
                error_message=str(e)
            )
            user.results.append(result)
            return False
    
    async def get_profile(self, session: aiohttp.ClientSession, user: UserSession) -> bool:
        # Получение профиля пользователя
        try:
            start_time = time.time()
            
            headers = {'X-User-Id': str(user.user_id)}
            
            async with session.get(
                f"{self.base_url}/profile/{user.user_id}",
                headers=headers
            ) as response:
                response_time = (time.time() - start_time) * 1000
                
                success = response.status == 200
                
                result = TestResult(
                    endpoint='/profile/:id',
                    method='GET',
                    status_code=response.status,
                    response_time_ms=response_time,
                    success=success
                )
                user.results.append(result)
                
                return success
                
        except Exception as e:
            result = TestResult(
                endpoint='/profile/:id',
                method='GET',
                status_code=0,
                response_time_ms=0,
                success=False,
                error_message=str(e)
            )
            user.results.append(result)
            return False
    
    async def get_leaderboard(self, session: aiohttp.ClientSession, user: UserSession) -> bool:
        # Получение таблицы лидеров
        try:
            start_time = time.time()
            
            async with session.get(f"{self.base_url}/leaderboard") as response:
                response_time = (time.time() - start_time) * 1000
                
                success = response.status == 200
                
                result = TestResult(
                    endpoint='/leaderboard',
                    method='GET',
                    status_code=response.status,
                    response_time_ms=response_time,
                    success=success
                )
                user.results.append(result)
                
                return success
                
        except Exception as e:
            result = TestResult(
                endpoint='/leaderboard',
                method='GET',
                status_code=0,
                response_time_ms=0,
                success=False,
                error_message=str(e)
            )
            user.results.append(result)
            return False
    
    async def get_user_documents(self, session: aiohttp.ClientSession, user: UserSession) -> bool:
        # Получение документов пользователя
        try:
            start_time = time.time()
            
            headers = {'X-User-Id': str(user.user_id)}
            
            async with session.get(
                f"{self.base_url}/user-documents/{user.user_id}",
                headers=headers
            ) as response:
                response_time = (time.time() - start_time) * 1000
                
                success = response.status == 200
                
                result = TestResult(
                    endpoint='/user-documents/:userId',
                    method='GET',
                    status_code=response.status,
                    response_time_ms=response_time,
                    success=success
                )
                user.results.append(result)
                
                return success
                
        except Exception as e:
            result = TestResult(
                endpoint='/user-documents/:userId',
                method='GET',
                status_code=0,
                response_time_ms=0,
                success=False,
                error_message=str(e)
            )
            user.results.append(result)
            return False
    
    async def get_categories(self, session: aiohttp.ClientSession, user: UserSession) -> bool:
        # Получение категорий мероприятий
        try:
            start_time = time.time()
            
            async with session.get(f"{self.base_url}/categories") as response:
                response_time = (time.time() - start_time) * 1000
                
                success = response.status == 200
                
                result = TestResult(
                    endpoint='/categories',
                    method='GET',
                    status_code=response.status,
                    response_time_ms=response_time,
                    success=success
                )
                user.results.append(result)
                
                return success
                
        except Exception as e:
            result = TestResult(
                endpoint='/categories',
                method='GET',
                status_code=0,
                response_time_ms=0,
                success=False,
                error_message=str(e)
            )
            user.results.append(result)
            return False

    async def upload_document(self, session: aiohttp.ClientSession, user: UserSession) -> bool:
        # Загрузка документа 
        try:
            start_time = time.time()
            
            headers = {'X-User-Id': str(user.user_id)}
            
            # Создаем тестовые данные для multipart запроса
            data = aiohttp.FormData()
            data.add_field('document_name', f'Test Achievement {random.randint(1, 1000)}')
            data.add_field('category_id', str(random.randint(1, 5)))
            data.add_field('received_date', datetime.now().strftime('%Y-%m-%d'))
            
            # Добавляем фейковый файл
            data.add_field('file', b'fake file content', filename='test_doc.pdf', content_type='application/pdf')
            
            async with session.post(
                f"{self.base_url}/documents/upload",
                headers=headers,
                data=data
            ) as response:
                response_time = (time.time() - start_time) * 1000
                
                success = response.status == 201  # Created
                
                result = TestResult(
                    endpoint='/documents/upload',
                    method='POST',
                    status_code=response.status,
                    response_time_ms=response_time,
                    success=success
                )
                user.results.append(result)
                
                return success
                
        except Exception as e:
            result = TestResult(
                endpoint='/documents/upload',
                method='POST',
                status_code=0,
                response_time_ms=0,
                success=False,
                error_message=str(e)
            )
            user.results.append(result)
            return False
    
    def _get_delay(self, base_min: float = 0.05, base_max: float = 0.1) -> float:
        # Возвращает задержку: 0 в stress режиме, или минимальную задержку
        if self.stress_mode:
            return 0.0
        return random.uniform(base_min, base_max)
    
    async def run_user_scenario(self, session: aiohttp.ClientSession, user: UserSession):
        # Сценарий: логин - профиль - документы - загрузка достижения - таблица лидеров - категории
        
        # Шаг 1: Логин
        if not await self.login_user(session, user):
            return
        
        await asyncio.sleep(self._get_delay(0.05, 0.1))
        
        # Шаг 2: Получение профиля
        await self.get_profile(session, user)
        await asyncio.sleep(self._get_delay(0.05, 0.1))
        
        # Шаг 3: Получение документов
        await self.get_user_documents(session, user)
        await asyncio.sleep(self._get_delay(0.05, 0.1))
        
        # Шаг 4: Загрузка достижения (только для 30% пользователей)
        if random.random() < 0.3:
            await self.upload_document(session, user)
            await asyncio.sleep(self._get_delay(0.05, 0.1))
        
        # Шаг 5: Получение таблицы лидеров
        await self.get_leaderboard(session, user)
        await asyncio.sleep(self._get_delay(0.05, 0.1))
        
        # Шаг 6: Получение категорий
        await self.get_categories(session, user)
    
    async def run_parallel_load_test(self, duration_seconds: int = 60) -> LoadTestReport:
        report = LoadTestReport(
            test_name="Parallel Load Test",
            start_time=datetime.now(),
            total_users=self.total_users,
            concurrent_users=self.concurrent_users,
            test_duration_seconds=duration_seconds,
            scenario_type="parallel"
        )
        
        print(f"\n{'='*60}")
        print(f"ПАРАЛЛЕЛЬНЫЙ НАГРУЗОЧНЫЙ ТЕСТ")
        print(f"{'='*60}")
        print(f"Всего пользователей: {self.total_users}")
        print(f"Одновременно активных: {self.concurrent_users}")
        print(f"Длительность: {duration_seconds} секунд")
        print(f"{'='*60}\n")
        
        # Получаем пользователей из БД
        users_data = await self.get_test_users_from_db()
        
        if len(users_data) < self.total_users:
            print(f"⚠ ВНИМАНИЕ: Найдено только {len(users_data)} пользователей, требуется {self.total_users}")
            print("Запустите: python seed_users.py --create")
            self.total_users = len(users_data)
        
        # Создаем сессии
        self.user_sessions = [
            UserSession(
                u['user_id'], 
                u.get('login', u.get('email', '')), 
                u['password'],
                u.get('email', u.get('login', '')) 
            )
            for u in users_data[:self.total_users]
        ]
        
        semaphore = asyncio.Semaphore(self.concurrent_users)
        test_end_time = time.time() + duration_seconds
        active = True
        
        async def user_worker(session: aiohttp.ClientSession, user: UserSession):
            # Рабочий процесс пользователя - циклически выполняет сценарий
            nonlocal active
            while active and time.time() < test_end_time:
                async with semaphore:
                    await self.run_user_scenario(session, user)
                # Минимальная пауза между итерациями для предотвращения spam
                if not self.stress_mode:
                    await asyncio.sleep(0.01)
                # Между циклами сценария - небольшая задержка (в stress режиме нет)
                if not self.stress_mode:
                    await asyncio.sleep(random.uniform(0.1, 0.3))
        
        connector = aiohttp.TCPConnector(
            limit=self.concurrent_users * 2,
            limit_per_host=self.concurrent_users
        )
        timeout = aiohttp.ClientTimeout(total=30)
        
        start_time = time.time()
        
        async with aiohttp.ClientSession(
            connector=connector,
            timeout=timeout
        ) as session:
            # Запускаем всех пользователей как фоновые задачи
            tasks = [
                asyncio.create_task(user_worker(session, user))
                for user in self.user_sessions
            ]
            
            # Даем время задачам запуститься
            await asyncio.sleep(0.5)
            
            # Показываем прогресс
            while time.time() < test_end_time:
                elapsed = int(time.time() - start_time)
                remaining = duration_seconds - elapsed
                
                # Считаем текущую статистику
                total_reqs = sum(len(u.results) for u in self.user_sessions)
                successful = sum(1 for u in self.user_sessions for r in u.results if r.success)
                
                print(f"\r⏱ {elapsed}s | Осталось: {remaining}s | "
                      f"Запросов: {total_reqs} | Успешно: {successful}    ", end='', flush=True)
                
                await asyncio.sleep(1)
            
            active = False
            # Даем время на завершение текущих операций
            await asyncio.sleep(1)
            # Отменяем оставшиеся задачи
            for task in tasks:
                if not task.done():
                    task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
        
        print(f"\n\nТест завершен. Обработка результатов...")
        
        # Собираем все результаты
        all_results = []
        for user in self.user_sessions:
            all_results.extend(user.results)
        
        self.all_results = all_results
        self._calculate_stats(report, all_results)
        
        report.end_time = datetime.now()
        self.report = report
        
        return report
    
    async def run_burst_load_test(self, bursts: int = 5, burst_size: int = 50, 
                                   pause_between_bursts: int = 10) -> LoadTestReport:
        total_users = bursts * burst_size
        duration_estimate = bursts * pause_between_bursts
        
        report = LoadTestReport(
            test_name="Burst Load Test",
            start_time=datetime.now(),
            total_users=total_users,
            concurrent_users=burst_size,
            test_duration_seconds=duration_estimate,
            scenario_type="burst"
        )
        
        print(f"\n{'='*60}")
        print(f"ТЕСТ ВСПЛЕСКОВ НАГРУЗКИ")
        print(f"{'='*60}")
        print(f"Количество всплесков: {bursts}")
        print(f"Пользователей во всплеске: {burst_size}")
        print(f"Пауза между всплесками: {pause_between_bursts} сек")
        print(f"Всего пользователей: {total_users}")
        print(f"{'='*60}\n")
        
        # Получаем пользователей из БД
        users_data = await self.get_test_users_from_db()
        
        if len(users_data) < total_users:
            print(f"⚠ Найдено только {len(users_data)} пользователей, требуется {total_users}")
            total_users = len(users_data)
            bursts = max(1, total_users // burst_size)
        
        connector = aiohttp.TCPConnector(
            limit=burst_size * 2,
            limit_per_host=burst_size
        )
        timeout = aiohttp.ClientTimeout(total=30)
        
        all_results = []
        
        async with aiohttp.ClientSession(
            connector=connector,
            timeout=timeout
        ) as session:
            for burst_num in range(bursts):
                print(f"\nВсплеск {burst_num + 1}/{bursts}...")
                
                start_idx = burst_num * burst_size
                end_idx = min(start_idx + burst_size, len(users_data))
                burst_users = users_data[start_idx:end_idx]
                
                # Создаем сессии для этого всплеска
                user_sessions = [
                    UserSession(
                        u['user_id'], 
                        u.get('login', u.get('email', '')), 
                        u['password'],
                        u.get('email', u.get('login', ''))
                    )
                    for u in burst_users
                ]
                
                # Запускаем всех пользователей одновременно
                tasks = [
                    self.run_user_scenario(session, user)
                    for user in user_sessions
                ]
                
                await asyncio.gather(*tasks, return_exceptions=True)
                
                # Собираем результаты всплеска
                for user in user_sessions:
                    all_results.extend(user.results)
                
                successful = sum(1 for r in all_results if r.success)
                total = len(all_results)
                
                print(f"   ✅ Всплеск {burst_num + 1} завершен: {successful}/{total} успешно")
                
                # Пауза перед следующим всплеском
                if burst_num < bursts - 1:
                    print(f"   ⏸ Пауза {pause_between_bursts} секунд...")
                    await asyncio.sleep(pause_between_bursts)
        
        print(f"\nТест завершен. Обработка результатов...")
        
        self.all_results = all_results
        self._calculate_stats(report, all_results)
        
        report.end_time = datetime.now()
        self.report = report
        
        return report
    
    def _calculate_stats(self, report: LoadTestReport, results: List[TestResult]):
        # Расчет статистики по результатам
        if not results:
            return
        
        response_times = [r.response_time_ms for r in results if r.success and r.response_time_ms > 0]
        
        report.total_requests = len(results)
        report.successful_requests = sum(1 for r in results if r.success)
        report.failed_requests = report.total_requests - report.successful_requests
        
        if response_times:
            report.avg_response_time_ms = statistics.mean(response_times)
            report.min_response_time_ms = min(response_times)
            report.max_response_time_ms = max(response_times)
            report.p50_response_time_ms = statistics.median(response_times)
            report.p95_response_time_ms = self._percentile(response_times, 95)
            report.p99_response_time_ms = self._percentile(response_times, 99)
        
        # RPS
        if report.end_time and report.start_time:
            duration = (report.end_time - report.start_time).total_seconds()
            if duration > 0:
                report.requests_per_second = report.total_requests / duration
        
        # Статистика по endpoint
        endpoint_stats = {}
        for result in results:
            key = f"{result.method} {result.endpoint}"
            if key not in endpoint_stats:
                endpoint_stats[key] = {'count': 0, 'success': 0, 'times': []}
            
            endpoint_stats[key]['count'] += 1
            if result.success:
                endpoint_stats[key]['success'] += 1
                if result.response_time_ms > 0:
                    endpoint_stats[key]['times'].append(result.response_time_ms)
        
        # Рассчитываем среднее время для каждого endpoint
        for key, stats in endpoint_stats.items():
            if stats['times']:
                stats['avg_time_ms'] = round(statistics.mean(stats['times']), 2)
                stats['min_time_ms'] = round(min(stats['times']), 2)
                stats['max_time_ms'] = round(max(stats['times']), 2)
            else:
                stats['avg_time_ms'] = 0
                stats['min_time_ms'] = 0
                stats['max_time_ms'] = 0
            del stats['times']
        
        report.endpoint_stats = endpoint_stats
        
        # Собираем ошибки
        errors = []
        for result in results:
            if not result.success and result.error_message:
                errors.append({
                    'endpoint': result.endpoint,
                    'method': result.method,
                    'status_code': result.status_code,
                    'error': result.error_message,
                    'timestamp': result.timestamp.isoformat()
                })
        
        report.errors = errors
    
    @staticmethod
    def _percentile(data: List[float], percentile: int) -> float:
        # Расчет перцентиля
        if not data:
            return 0.0
        sorted_data = sorted(data)
        index = (len(sorted_data) - 1) * (percentile / 100)
        lower = int(index)
        upper = min(lower + 1, len(sorted_data) - 1)
        weight = index - lower
        return sorted_data[lower] * (1 - weight) + sorted_data[upper] * weight
    
    def print_report(self):
        # Вывод отчета в консоль
        if not self.report:
            print("Нет данных для отчета")
            return
        
        r = self.report
        
        print(f"\n{'='*70}")
        print(f"ОТЧЕТ О НАГРУЗОЧНОМ ТЕСТИРОВАНИИ")
        print(f"{'='*70}")
        print(f"Тест:              {r.test_name}")
        print(f"Сценарий:          {r.scenario_type}")
        print(f"Всего пользователей: {r.total_users}")
        print(f"Начало:            {r.start_time.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"Конец:             {r.end_time.strftime('%Y-%m-%d %H:%M:%S') if r.end_time else 'N/A'}")
        print(f"{'='*70}")
        print(f"\n📊 ОБЩАЯ СТАТИСТИКА")
        print(f"{'-'*40}")
        print(f"Всего запросов:        {r.total_requests}")
        print(f"Успешных запросов:     {r.successful_requests}")
        print(f"Неуспешных запросов:   {r.failed_requests}")
        print(f"Успешность:            {r.successful_requests / max(r.total_requests, 1) * 100:.1f}%")
        print(f"Запросов/сек:          {r.requests_per_second:.2f}")
        
        print(f"\n⏱ ВРЕМЯ ОТВЕТА")
        print(f"{'-'*40}")
        print(f"Среднее:      {r.avg_response_time_ms:.2f} мс")
        print(f"Минимальное:  {r.min_response_time_ms:.2f} мс")
        print(f"Максимальное: {r.max_response_time_ms:.2f} мс")
        print(f"P50 (медиана): {r.p50_response_time_ms:.2f} мс")
        print(f"P95:          {r.p95_response_time_ms:.2f} мс")
        print(f"P99:          {r.p99_response_time_ms:.2f} мс")
        
        print(f"\n📡 СТАТИСТИКА ПО ENDPOINT")
        print(f"{'-'*40}")
        for endpoint, stats in r.endpoint_stats.items():
            success_rate = stats['success'] / max(stats['count'], 1) * 100
            avg_time = stats.get('avg_time_ms', 0)
            print(f"{endpoint:30} | {stats['count']:4} запр. | {success_rate:5.1f}% | {avg_time:6.1f} мс")
        
        if r.errors:
            print(f"\n❌ ОШИБКИ (первые 10)")
            print(f"{'-'*40}")
            for error in r.errors[:10]:
                print(f"{error['method']} {error['endpoint']} | "
                      f"Код: {error['status_code']} | {error['error'][:50]}")
        
        print(f"\n{'='*70}\n")
    
    async def save_report(self, filename: Optional[str] = None):
        # Сохранение отчета в файл
        if not self.report:
            print("Нет данных для сохранения")
            return
        
        # Создаем директорию для отчетов
        REPORTS_DIR.mkdir(exist_ok=True)
        
        # Генерируем имя файла
        if not filename:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f"load_test_{self.report.scenario_type}_{timestamp}.json"
        
        filepath = REPORTS_DIR / filename
        
        # Сохраняем JSON
        async with aiofiles.open(filepath, 'w', encoding='utf-8') as f:
            await f.write(json.dumps(self.report.to_dict(), indent=2, ensure_ascii=False))
        
        # Сохраняем текстовый отчет
        txt_filename = filename.replace('.json', '.txt')
        txt_filepath = REPORTS_DIR / txt_filename
        
        r = self.report
        txt_content = f"""
======================================================================
ОТЧЕТ О НАГРУЗОЧНОМ ТЕСТИРОВАНИИ
======================================================================
Тест:              {r.test_name}
Сценарий:          {r.scenario_type}
Всего пользователей: {r.total_users}
Начало:            {r.start_time.strftime('%Y-%m-%d %H:%M:%S')}
Конец:             {r.end_time.strftime('%Y-%m-%d %H:%M:%S') if r.end_time else 'N/A'}

ОБЩАЯ СТАТИСТИКА
----------------------------------------------------------------------
Всего запросов:        {r.total_requests}
Успешных запросов:     {r.successful_requests}
Неуспешных запросов:   {r.failed_requests}
Успешность:            {r.successful_requests / max(r.total_requests, 1) * 100:.1f}%
Запросов/сек:          {r.requests_per_second:.2f}

ВРЕМЯ ОТВЕТА
----------------------------------------------------------------------
Среднее:      {r.avg_response_time_ms:.2f} мс
Минимальное:  {r.min_response_time_ms:.2f} мс
Максимальное: {r.max_response_time_ms:.2f} мс
P50 (медиана): {r.p50_response_time_ms:.2f} мс
P95:          {r.p95_response_time_ms:.2f} мс
P99:          {r.p99_response_time_ms:.2f} мс

СТАТИСТИКА ПО ENDPOINT
----------------------------------------------------------------------
"""
        for endpoint, stats in r.endpoint_stats.items():
            success_rate = stats['success'] / max(stats['count'], 1) * 100
            avg_time = stats.get('avg_time_ms', 0)
            txt_content += f"{endpoint:30} | {stats['count']:4} запр. | {success_rate:5.1f}% | {avg_time:6.1f} мс\n"
        
        if r.errors:
            txt_content += f"""
ОШИБКИ (первые 20)
----------------------------------------------------------------------
"""
            for error in r.errors[:20]:
                txt_content += f"{error['method']} {error['endpoint']} | Код: {error['status_code']} | {error['error'][:50]}\n"
        
        txt_content += "\n======================================================================\n"
        
        async with aiofiles.open(txt_filepath, 'w', encoding='utf-8') as f:
            await f.write(txt_content)
        
        print(f"💾 Отчеты сохранены:")
        print(f"   JSON: {filepath}")
        print(f"   TXT:  {txt_filepath}")
        
        return filepath, txt_filepath


async def main():
    """Основная функция."""
    import argparse
    
    parser = argparse.ArgumentParser(description='Нагрузочное тестирование сайта')
    parser.add_argument('--scenario', choices=['parallel', 'burst', 'both'], 
                        default='both', help='Тип сценария')
    parser.add_argument('--users', type=int, default=150, 
                        help='Количество пользователей (по умолчанию 150)')
    parser.add_argument('--concurrent', type=int, default=150, 
                        help='Количество одновременных пользователей (по умолчанию 150)')
    parser.add_argument('--duration', type=int, default=60, 
                        help='Длительность теста в секундах (по умолчанию 60)')
    parser.add_argument('--bursts', type=int, default=3, 
                        help='Количество всплесков (для burst сценария, по умолчанию 3 для 150 пользователей)')
    parser.add_argument('--burst-size', type=int, default=50, 
                        help='Размер всплеска (для burst сценария)')
    parser.add_argument('--pause', type=int, default=10, 
                        help='Пауза между всплесками в секундах')
    parser.add_argument('--stress', action='store_true',
                        help='Режим постоянной нагрузки без задержек между запросами')
    
    args = parser.parse_args()
    
    # Создаем тестер
    tester = LoadTesterAdvanced(
        base_url=BASE_URL,
        total_users=args.users,
        concurrent_users=args.concurrent
    )
    tester.stress_mode = args.stress
    
    reports = []
    
    # Параллельный сценарий
    if args.scenario in ['parallel', 'both']:
        print("\n" + "="*70)
        print("ЗАПУСК ПАРАЛЛЕЛЬНОГО СЦЕНАРИЯ")
        print("="*70)
        
        report = await tester.run_parallel_load_test(duration_seconds=args.duration)
        tester.print_report()
        json_path, txt_path = await tester.save_report()
        reports.append(('parallel', json_path, txt_path))
        
        # Небольшая пауза между тестами
        if args.scenario == 'both':
            print("\n⏸ Пауза 10 секунд перед следующим тестом...\n")
            await asyncio.sleep(10)
    
    # Сценарий всплесков
    if args.scenario in ['burst', 'both']:
        print("\n" + "="*70)
        print("ЗАПУСК СЦЕНАРИЯ ВСПЛЕСКОВ")
        print("="*70)
        
        report = await tester.run_burst_load_test(
            bursts=args.bursts,
            burst_size=args.burst_size,
            pause_between_bursts=args.pause
        )
        tester.print_report()
        json_path, txt_path = await tester.save_report()
        reports.append(('burst', json_path, txt_path))
    
    # Итоговая сводка
    print("\n" + "="*70)
    print("ТЕСТИРОВАНИЕ ЗАВЕРШЕНО")
    print("="*70)
    print("\nСохраненные отчеты:")
    for scenario, json_path, txt_path in reports:
        print(f"  {scenario}:")
        print(f"    JSON: {json_path}")
        print(f"    TXT:  {txt_path}")
    print(f"\nВсе отчеты находятся в папке: {REPORTS_DIR}")


if __name__ == "__main__":
    try:
        asyncio.run(main())
    except KeyboardInterrupt:
        print("\n\n⚠ Тест прерван пользователем")
    except Exception as e:
        print(f"\n\n❌ Ошибка: {e}")
        import traceback
        traceback.print_exc()
