# Конфигурация URL для фронтенда Лига Абитуриентов
# Для локальной разработки - localhost
# Для ngrok - указать ngrok URL

FRONTEND_URL = "http://localhost:5173"

# API сервера (backend)
API_BASE_URL = "http://localhost:3000"


def get_portfolio_link(login: str) -> str:
    # Генерирует ссылку на портфель пользователя
    return f"{FRONTEND_URL}/profile?login={login}"


def get_login_link() -> str:
    # Генерирует ссылку на страницу входа
    return f"{FRONTEND_URL}/login"


def get_reset_password_link(token: str) -> str:
    # Генерирует ссылку для сброса пароля
    return f"{FRONTEND_URL}/reset-password?token={token}"
