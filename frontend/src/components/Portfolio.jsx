// ДЛЯ ТЕСТА

import React, { useState, useEffect } from 'react'
import backgroundImage from '../assets/background.png'
import grafity1 from '../assets/grafity1.png'
import grafity2 from '../assets/grafity2.png'

// Определяем API_URL в зависимости от того, где запущено приложение
const getApiUrl = () => {
  const hostname = window.location.hostname;
  
  // Если это localhost - используем localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }
  
  // Если это IP адрес - используем тот же IP, но с портом 3000
  if (hostname.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
    return `http://${hostname}:3000`;
  }
  
  // Для всех остальных случаев (включая ngrok)
  return 'http://localhost:3000';
};

const API_URL = getApiUrl();

const Portfolio = () => {
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchUserData = async (userLogin) => {
    console.log('Fetching user data for login:', userLogin)
    
    try {
      // Запрашиваем данные пользователя по login
      const response = await fetch(`${API_URL}/profile-by-login/${userLogin}`)
      console.log('Response status:', response.status)
      
      if (!response.ok) {
        console.log('Response not ok:', response.status)
        if (response.status === 404) {
          setError('Пользователь не найден')
        } else {
          setError('Ошибка при загрузке данных')
        }
        setLoading(false)
        return
      }

      const user = await response.json()
      console.log('User data received:', user)
      
      // Сохраняем данные в localStorage для авторизации
      localStorage.setItem('user', JSON.stringify({
        login: userLogin,
        userId: user.user_id,
        fullName: user.full_name || 'Пользователь Лиги Абитуриентов'
      }))
      localStorage.setItem('userId', user.user_id.toString())
      localStorage.setItem('sessionTime', new Date().toISOString())
      
      console.log('Data saved to localStorage')
      
      setUserData({
        login: userLogin,
        userId: user.user_id,
        fullName: user.full_name || 'Пользователь Лиги Абитуриентов',
        phone: user.phone_number,
        birthDate: user.birth_date,
        classCourse: user.class_course,
        graduationYear: user.graduation_year,
        registrationDate: user.registration_date,
        isVerified: user.is_verified
      })
      
      console.log('User state set:', {
        login: userLogin,
        userId: user.user_id,
        fullName: user.full_name
      })
    } catch (error) {
      console.error('Ошибка при загрузке данных пользователя:', error)
      setError('Ошибка соединения с сервером')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    console.log('Portfolio useEffect started')
    
    // Получаем login пользователя из URL параметров
    const urlParams = new URLSearchParams(window.location.search)
    const userLogin = urlParams.get('login')
    
    console.log('URL login param:', userLogin)

    if (!userLogin) {
      setError('Login пользователя не указан')
      setLoading(false)
      return
    }

    // Проверка авторизации и сессии
    const userId = localStorage.getItem('userId')
    const sessionTime = localStorage.getItem('sessionTime')
    
    console.log('localStorage check - userId:', userId, 'sessionTime:', sessionTime)
    
    // Если пользователь не авторизован, но пришел по ссылке из ВК-бота
    if (!userId || !sessionTime) {
      console.log('User not authorized, calling fetchUserData')
      // Автоматически загружаем данные пользователя и авторизуем
      fetchUserData(userLogin)
      return
    }
    
    // Проверка времени сессии
    const sessionDate = new Date(sessionTime)
    const now = new Date()
    const diffMs = now - sessionDate
    const TIMEOUT_MINUTES = 24
    const timeoutMs = TIMEOUT_MINUTES * 60 * 1000
    
    if (diffMs > timeoutMs) {
      // Сессия истекла - очищаем localStorage
      localStorage.removeItem('user')
      localStorage.removeItem('userId')
      localStorage.removeItem('sessionTime')
      setError('Сессия истекла. Пожалуйста, авторизуйтесь снова.')
      setLoading(false)
      
      // Редирект на логин через 2 секунды
      setTimeout(() => {
        window.location.href = '/login'
      }, 2000)
      return
    }

    // Если пользователь авторизован и сессия активна, загружаем данные
    fetchUserData(userLogin)
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}>
        <div className="text-white text-2xl">Загрузка...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}>
        <div className="bg-white rounded-[20px] p-8 max-w-md mx-auto border-4 border-red-500">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4" style={{ color: '#FF5959' }}>
              Ошибка
            </h2>
            <p style={{ color: '#000000', fontFamily: 'Montserrat', fontSize: '16px' }}>
              {error}
            </p>
          </div>
        </div>
      </div>
    )
  }

  if (!userData) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}>
        <div className="text-white text-2xl">Загрузка данных...</div>
      </div>
    )
  }

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: `url(${backgroundImage})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        backgroundAttachment: 'fixed'
      }}
    >
      {/* Декоративные элементы */}
      <img 
        src={grafity2} 
        alt="Декорация" 
        style={{
          position: 'fixed',
          top: '-250px',
          left: '-350px',
          width: '850px',
          height: 'auto',
          zIndex: 0
        }}
      />
      <img 
        src={grafity1} 
        alt="Декорация" 
        style={{
          position: 'fixed',
          bottom: '-150px',
          right: '-200px',
          width: '900px',
          height: 'auto',
          zIndex: 0
        }}
      />

      {/* Карточка портфеля */}
      <div className="bg-white rounded-[20px] overflow-hidden relative animate-slide-up" style={{ 
        width: '100%', 
        maxWidth: '580px', 
        border: '4px solid #0808E4', 
        margin: '0 auto'  
      }}>
        <div className="p-6 md:p-10 md:pt-12 md:pb-6">
          {/* Заголовок */}
          <header className="text-center mb-6">
            <h1 className="text-2xl md:text-3xl mb-1" style={{ 
              color: '#0808E4', 
              fontFamily: 'Widock TRIAL, sans-serif', 
              fontWeight: 'bold', 
              lineHeight: '150%', 
              letterSpacing: '0.05em' 
            }}>
              ЛИГА АБИТУРИЕНТОВ
            </h1>
            <h1 className="text-xl md:text-2xl mb-1" style={{ 
              color: '#0808E4', 
              fontFamily: 'Widock TRIAL, sans-serif', 
              fontWeight: 'bold', 
              lineHeight: '150%', 
              letterSpacing: '0.05em' 
            }}>
              КГПИ КЕМГУ
            </h1>
            <h1 className="text-lg md:text-xl mb-1" style={{ 
              color: '#BEE500', 
              fontFamily: 'Widock TRIAL, sans-serif', 
              fontWeight: 'bold', 
              lineHeight: '150%', 
              letterSpacing: '0.05em' 
            }}>
              ПОРТФОЛИО
            </h1>
          </header>

          {/* Информация о пользователе */}
          <div className="space-y-4">
            <div className="p-4 rounded-lg" style={{
              backgroundColor: '#EFEFEF',
              border: '2px solid #8484F2'
            }}>
              <h2 className="text-lg font-semibold mb-2" style={{
                color: '#0808E4',
                fontFamily: 'Montserrat',
                fontWeight: 'bold'
              }}>
                Информация о пользователе
              </h2>
              <div className="space-y-2">
                <p style={{
                  color: '#000000',
                  fontFamily: 'Montserrat',
                  fontSize: '16px'
                }}>
                  <strong>ФИО:</strong> {userData.fullName}
                </p>
                <p style={{
                  color: '#000000',
                  fontFamily: 'Montserrat',
                  fontSize: '16px'
                }}>
                  <strong>Login (VK ID):</strong> {userData.login}
                </p>
                <p style={{
                  color: '#000000',
                  fontFamily: 'Montserrat',
                  fontSize: '16px'
                }}>
                  <strong>ID пользователя:</strong> {userData.userId}
                </p>
                {userData.phone && (
                  <p style={{
                    color: '#000000',
                    fontFamily: 'Montserrat',
                    fontSize: '16px'
                  }}>
                    <strong>Телефон:</strong> {userData.phone}
                  </p>
                )}
                {userData.birthDate && (
                  <p style={{
                    color: '#000000',
                    fontFamily: 'Montserrat',
                    fontSize: '16px'
                  }}>
                    <strong>Дата рождения:</strong> {new Date(userData.birthDate).toLocaleDateString('ru-RU')}
                  </p>
                )}
                {userData.classCourse && (
                  <p style={{
                    color: '#000000',
                    fontFamily: 'Montserrat',
                    fontSize: '16px'
                  }}>
                    <strong>Класс/курс:</strong> {userData.classCourse}
                  </p>
                )}
                {userData.graduationYear && (
                  <p style={{
                    color: '#000000',
                    fontFamily: 'Montserrat',
                    fontSize: '16px'
                  }}>
                    <strong>Год окончания:</strong> {userData.graduationYear}
                  </p>
                )}
                <p style={{
                  color: '#000000',
                  fontFamily: 'Montserrat',
                  fontSize: '16px'
                }}>
                  <strong>Статус:</strong> 
                  <span className={`ml-2 px-2 py-1 rounded text-sm ${
                    userData.isVerified 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {userData.isVerified ? 'Подтвержден' : 'Не подтвержден'}
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Portfolio
