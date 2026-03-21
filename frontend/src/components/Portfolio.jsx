// ДЛЯ ТЕСТА

import React, { useState, useEffect } from 'react'
import backgroundImage from '../assets/background.png'
import grafity1 from '../assets/grafity1.png'
import grafity2 from '../assets/grafity2.png'

const API_URL = `http://${window.location.hostname}:3000`

const Portfolio = () => {
  const [userData, setUserData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    const fetchUserData = async () => {
      // Получаем login пользователя из URL параметров
      const urlParams = new URLSearchParams(window.location.search)
      const userLogin = urlParams.get('login')

      if (!userLogin) {
        setError('Login пользователя не указан')
        setLoading(false)
        return
      }

      try {
        // Запрашиваем данные пользователя по login
        const response = await fetch(`${API_URL}/profile-by-login/${userLogin}`)
        
        if (!response.ok) {
          if (response.status === 404) {
            setError('Пользователь не найден')
          } else {
            setError('Ошибка при загрузке данных')
          }
          setLoading(false)
          return
        }

        const user = await response.json()
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
      } catch (error) {
        console.error('Ошибка при загрузке данных пользователя:', error)
        setError('Ошибка соединения с сервером')
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
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
            <h1 className="text-2xl md:text-3xl mb-1" style={{ 
              color: '#0808E4', 
              fontFamily: 'Widock TRIAL, sans-serif', 
              fontWeight: 'bold', 
              lineHeight: '150%', 
              letterSpacing: '0.05em' 
            }}>
              КГПИ КЕМГУ
            </h1>
            <h1 className="text-xl md:text-3xl mb-1" style={{ 
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
