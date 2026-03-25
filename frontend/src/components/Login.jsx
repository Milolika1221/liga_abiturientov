import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  
  // Для всех остальных случаев, включая ngrok
  return 'http://localhost:3000';
};

const API_URL = getApiUrl();

const Login = () => {
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const [errors, setErrors] = useState({})
  const [showMessage, setShowMessage] = useState({ show: false, text: '', type: '' })
  const [showResetModal, setShowResetModal] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetStep, setResetStep] = useState('select') 

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    if (!formData.email) {
      newErrors.email = 'Это поле обязательно для заполнения'
    } else if (!/\S+@\S+\.\S+/.test(formData.email) && !/^[\+]?[(]?[0-9]{1,4}[)]?[-\s\./0-9]*$/.test(formData.email)) {
      newErrors.email = 'Введите корректный email или номер телефона'
    }

    if (!formData.password) {
      newErrors.password = 'Это поле обязательно для заполнения'
    }

    return newErrors
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = validateForm()
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      })

      const result = await response.json()

      if (result.status === 'yea') {
        // Сохраняем данные пользователя и время сессии
        localStorage.setItem('user', JSON.stringify(result.user))
        localStorage.setItem('userId', result.user.user_id)
        localStorage.setItem('sessionTime', result.sessionTime)
        
        setShowMessage({
          show: true,
          text: 'Вход в систему',
          type: 'success'
        })

        // Переход на страницу профиля
        setTimeout(() => {
          navigate(`/profile?login=${result.user.login}`)
        }, 1500)
      } else {
        // Ошибка от сервера - показываем под конкретным полем
        if (result.field) {
          setErrors(prev => ({
            ...prev,
            [result.field]: result.message
          }))
        } else {
          setShowMessage({
            show: true,
            text: result.message || 'Ошибка при авторизации',
            type: 'error'
          })
        }
      }
    } catch (error) {
      console.error('Ошибка при отправке данных:', error)
      setShowMessage({
        show: true,
        text: 'Ошибка соединения с сервером. Попробуйте позже.',
        type: 'error'
      })
    }
  }

  const handleRegisterClick = () => {
    navigate('/register')
  }

  const handleForgotPasswordClick = () => {
    setShowResetModal(true)
    setResetStep('select')
    setResetEmail('')
  }

  const handleResetViaEmail = async () => {
    if (!resetEmail) {
      setShowMessage({
        show: true,
        text: 'Введите email',
        type: 'error'
      })
      return
    }

    try {
      const response = await fetch(`${API_URL}/request-password-reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      })

      const result = await response.json()
      
      if (result.status === 'yea') {
        setResetStep('success')
        setShowMessage({
          show: true,
          text: 'Инструкции отправлены на email',
          type: 'success'
        })
      } else {
        setShowMessage({
          show: true,
          text: result.message || 'Ошибка при отправке инструкций',
          type: 'error'
        })
      }
    } catch (error) {
      setShowMessage({
        show: true,
        text: 'Ошибка соединения с сервером',
        type: 'error'
      })
    }
  }

  const closeResetModal = () => {
    setShowResetModal(false)
    setResetEmail('')
    setResetStep('select')
  }

  // Авто-скрытие сообщений через 3 секунды
  useEffect(() => {
    if (showMessage.show) {
      const timer = setTimeout(() => {
        setShowMessage({ show: false, text: '', type: '' })
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [showMessage.show])

  const hideMessage = () => {
    setShowMessage({ show: false, text: '', type: '' })
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
        src = {grafity2} 
        alt = "Декорация" 
        style = {{
          position: 'fixed',
          top: '-250px',
          left: '-350px',
          width: '850px',
          height: 'auto',
          zIndex: 0
        }}
      />
      <img 
        src = {grafity1} 
        alt = "Декорация" 
        style = {{
          position: 'fixed',
          bottom: '-150px',
          right: '-200px',
          width: '900px',
          height: 'auto',
          zIndex: 0
        }}
      />

      {/* Сообщения */}
      {showMessage.show && (
        <div 
          className = {`fixed top-4 right-4 p-4 rounded-lg text-white font-medium z-50 max-w-sm animate-slide-in-right ${
            showMessage.type === 'error' 
              ? 'bg-gradient-to-r from-red-500 to-red-600' 
              : showMessage.type === 'info'
                ? 'bg-gradient-to-r from-blue-500 to-blue-600'
                : 'bg-gradient-to-r from-green-500 to-green-600'
          }`}
          onClick = {hideMessage}
        >
          {showMessage.text}
        </div>
      )}

      {/* Карточка формы */}
      <div className = "bg-white rounded-[20px] overflow-hidden relative animate-slide-up" style = {{ width: '100%', maxWidth: '580px', minHeight: '700px', border: '4px solid #0808E4', margin: '0 auto' }}>    
        <div className = "p-6 md:p-10 md:pt-12 md:pb-6 flex flex-col h-full">
          {/* Заголовки организации */}
          <header className="text-center mb-2">
            <h1 className="text-2xl md:text-3xl mb-1" style = {{ color: '#0808E4', fontFamily: 'Widock TRIAL, sans-serif', fontWeight: 'bold', lineHeight: '150%', letterSpacing: '0.05em' }}>
              ЛИГА АБИТУРИЕНТОВ
            </h1>
            <h1 className = "text-2xl md:text-3xl mb-1" style = {{ color: '#0808E4', fontFamily: 'Widock TRIAL, sans-serif', fontWeight: 'bold', lineHeight: '150%', letterSpacing: '0.05em' }}>
              КГПИ КЕМГУ
            </h1>
            <h1 className = "text-xl md:text-3xl mb-1" style = {{ color: '#BEE500', fontFamily: 'Widock TRIAL, sans-serif', fontWeight: 'bold', lineHeight: '150%', letterSpacing: '0.05em' }}>
              АВТОРИЗАЦИЯ
            </h1>
          </header>       

          {/* Форма */}
          <form onSubmit = {handleSubmit} className = "space-y-6 flex flex-col flex-grow justify-center mt-4">
            {/* Поле: Логин (Email) */}
            <div>
              <label htmlFor = "email" className = "block mb-2" style = {{ color: '#000000', fontFamily: 'Montserrat', fontWeight: 'bold', lineHeight: '150%', letterSpacing: '5%', fontSize: '18px' }}>
                Email/Номер телефона
              </label>
              <input
                type = "text"
                id = "email"
                name = "email"
                value = {formData.email}
                onChange = {handleChange}
                placeholder = "example@mail.ru или +7 (999) 123-45-67"
                className = {`w-full h-12 px-4 rounded-xl transition-all duration-200 ${
                  errors.email 
                    ? 'border-red-500' 
                    : ''
                }`}
                style = {{
                  fontFamily: 'Montserrat',
                  border: '2px solid #8484F2',
                  backgroundColor: '#EFEFEF',
                  borderRadius: '10px',
                  outline: 'none'
                }}
                autoComplete = "email"
              />
              {errors.email && (
                <p className = "mt-1 text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            {/* Поле: Пароль */}
            <div>
              <label htmlFor = "password" className = "block mb-2" style = {{ color: '#000000', fontFamily: 'Montserrat', fontWeight: 'bold', lineHeight: '150%', letterSpacing: '5%', fontSize: '18px' }}>
                Пароль
              </label>
              <input
                type = "password"
                id = "password"
                name = "password"
                value = {formData.password}
                onChange = {handleChange}
                placeholder = "Введите пароль"
                className = {`w-full h-12 px-4 rounded-xl transition-all duration-200 ${
                  errors.password 
                    ? 'border-red-500' 
                    : ''
                }`}
                style = {{
                  fontFamily: 'Montserrat',
                  border: '2px solid #8484F2',
                  backgroundColor: '#EFEFEF',
                  borderRadius: '10px',
                  outline: 'none'
                }}
                autoComplete = "current-password"
              />
              {errors.password && (
                <p className = "mt-1 text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Кнопка АВТОРИЗОВАТЬСЯ */}
            <button
              type = "submit"
              className = "font-semibold transition-all duration-300 mt-6 group mx-auto"
              style = {{
                backgroundColor: 'white',
                border: '3px solid #0808E4',
                borderRadius: '10px',
                color: '#0808E4',
                fontFamily: 'Widock TRIAL, sans-serif',
                fontWeight: 'bold',
                lineHeight: '150%',
                letterSpacing: '0.02em',
                fontSize: '14px',
                padding: '14px 40px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                width: 'auto'
              }}
              onMouseEnter = {(e) => {
                e.currentTarget.style.backgroundColor = '#0808E4'
                e.currentTarget.style.color = 'white'
                e.currentTarget.style.transform = 'scale(1.02)'
                e.currentTarget.style.borderColor = '#0808E4'
              }}
              onMouseLeave = {(e) => {
                e.currentTarget.style.backgroundColor = 'white'
                e.currentTarget.style.color = '#0808E4'
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.borderColor = '#0808E4'
              }}
            >
              АВТОРИЗОВАТЬСЯ
            </button>

            {/* Кнопка ЗАРЕГИСТРИРОВАТЬСЯ */}
            <button
              type = "button"
              onClick = {handleRegisterClick}
              className = "w-full font-semibold transition-all duration-300 mt-4 group"
              style = {{
                backgroundColor: 'white',
                border: '3px solid #BEE500',
                borderRadius: '10px',
                color: '#C9E410',
                fontFamily: 'Widock TRIAL, sans-serif',
                fontWeight: 'bold',
                lineHeight: '150%',
                letterSpacing: '0.02em',
                fontSize: '14px',
                padding: '14px 24px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter = {(e) => {
                e.currentTarget.style.backgroundColor = '#BEE500'
                e.currentTarget.style.color = 'white'
                e.currentTarget.style.transform = 'scale(1.02)'
                e.currentTarget.style.borderColor = '#BEE500'
              }}
              onMouseLeave = {(e) => {
                e.currentTarget.style.backgroundColor = 'white'
                e.currentTarget.style.color = '#C9E410'
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.borderColor = '#BEE500'
              }}
            >
              ЗАРЕГИСТРИРОВАТЬСЯ
            </button>

            {/* Кнопка ЗАБЫЛ ПАРОЛЬ */}
            <button
              type = "button"
              onClick = {handleForgotPasswordClick}
              className = "font-semibold transition-all duration-300 mt-4 group mx-auto"
              style = {{
                backgroundColor: 'white',
                border: '3px solid #FF3C3C',
                borderRadius: '10px',
                color: '#FF3C3C',
                fontFamily: 'Widock TRIAL, sans-serif',
                fontWeight: 'bold',
                lineHeight: '150%',
                letterSpacing: '0.02em',
                fontSize: '14px',
                padding: '14px 40px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                width: 'auto'
              }}
              onMouseEnter = {(e) => {
                e.currentTarget.style.backgroundColor = '#FF3C3C'
                e.currentTarget.style.color = 'white'
                e.currentTarget.style.transform = 'scale(1.02)'
                e.currentTarget.style.borderColor = '#FF3C3C'
              }}
              onMouseLeave = {(e) => {
                e.currentTarget.style.backgroundColor = 'white'
                e.currentTarget.style.color = '#FF3C3C'
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.borderColor = '#FF3C3C'
              }}
            >
              ЗАБЫЛ ПАРОЛЬ
            </button>
          </form>
        </div>
      </div>

      {/* Модальное окно восстановления пароля */}
      {showResetModal && (
        <div className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className = "bg-white rounded-[20px] p-4 md:p-6 max-w-md w-full md:max-w-lg border-4 border-[#0808E4] relative">
            {/* Кнопка закрытия */}
            <button
              onClick = {closeResetModal}
              className = "absolute top-4 right-4 text-gray-500 hover:text-gray-700 text-2xl md:text-3xl"
            >
              ×
            </button>

            {resetStep === 'select' && (
              <>
                <h2 className = "text-xl md:text-2xl font-bold text-center mb-4 md:mb-6" style = {{ color: '#0808E4', fontFamily: 'Widock TRIAL, sans-serif' }}>
                  Восстановление пароля
                </h2>
                <p className = "text-center mb-4 md:mb-6 text-gray-600 text-sm md:text-base">
                  Выберите способ восстановления пароля
                </p>
                <div className = "space-y-3 md:space-y-4">
                  <button
                    onClick = {() => setResetStep('email')}
                    className = "w-full font-semibold py-3 md:py-4 px-4 md:px-6 rounded-[10px] bg-[#0808E4] text-white hover:bg-[#0606b4] transition-all text-sm md:text-base"
                    style = {{ fontFamily: 'Montserrat' }}
                  >
                    Восстановить через Email
                  </button>
                  <button
                    onClick = {() => setResetStep('vkbot')}
                    className = "w-full font-semibold py-3 md:py-4 px-4 md:px-6 rounded-[10px] bg-[#BEE500] text-white hover:bg-[#a8c900] transition-all text-sm md:text-base"
                    style = {{ fontFamily: 'Montserrat' }}
                  >
                    Восстановить через VK-бота
                  </button>
                </div>
              </>
            )}

            {resetStep === 'vkbot' && (
              <>
                <h2 className = "text-xl md:text-2xl font-bold text-center mb-4 md:mb-6" style = {{ color: '#0808E4', fontFamily: 'Widock TRIAL, sans-serif' }}>
                  Восстановление через VK-бота
                </h2>
                <p className = "text-center mb-3 md:mb-4 text-gray-600 text-sm md:text-base">
                  Перейдите к нашему VK-боту и нажмите кнопку "Восстановить пароль"
                </p>
                <div className = "bg-blue-50 border-2 border-blue-200 rounded-lg p-3 md:p-4 mb-3 md:mb-4">
                  <p className = "text-center text-blue-800 font-semibold mb-2 text-sm md:text-base">
                    Ссылка на бота:
                  </p>
                  <a 
                    href = "https://vk.com/im/convo/-227705075?entrypoint=list_all" 
                    target = "_blank" 
                    rel = "noopener noreferrer"
                    className = "text-blue-600 hover:text-blue-800 underline text-center block text-sm md:text-base"
                  >
                    https://vk.com/im/convo/-227705075?entrypoint=list_all
                  </a>
                </div>
                <p className = "text-center text-xs md:text-sm text-gray-500 mb-3 md:mb-4">
                  Бот пришлет вам ссылку для восстановления пароля
                </p>
                <button
                  onClick = {closeResetModal}
                  className = "w-full font-semibold py-3 md:py-4 px-4 md:px-6 rounded-[10px] bg-[#BEE500] text-white hover:bg-[#a8c900] transition-all text-sm md:text-base"
                  style = {{ fontFamily: 'Montserrat' }}
                >
                  Понятно
                </button>
              </>
            )}

            {resetStep === 'email' && (
              <>
                <h2 className = "text-xl md:text-2xl font-bold text-center mb-4 md:mb-6" style = {{ color: '#0808E4', fontFamily: 'Widock TRIAL, sans-serif' }}>
                  Восстановление пароля
                </h2>
                <p className = "text-center mb-4 md:mb-6 text-gray-600 text-sm md:text-base">
                  Введите ваш email, и мы отправим инструкции по восстановлению
                </p>
                <div className = "space-y-3 md:space-y-4">
                  <div>
                    <label className = "block mb-2 font-semibold text-sm md:text-base" style = {{ fontFamily: 'Montserrat' }}>
                      Email
                    </label>
                    <input
                      type = "email"
                      value={resetEmail}
                      onChange = {(e) => setResetEmail(e.target.value)}
                      placeholder = "example@mail.ru"
                      className = "w-full h-10 md:h-12 px-3 md:px-4 rounded-[10px] border-2 border-[#8484F2] bg-[#EFEFEF] outline-none text-sm md:text-base"
                      style = {{ fontFamily: 'Montserrat' }}
                    />
                  </div>
                  <button
                    onClick = {handleResetViaEmail}
                    className = "w-full font-semibold py-3 md:py-4 px-4 md:px-6 rounded-[10px] bg-[#0808E4] text-white hover:bg-[#0606b4] transition-all text-sm md:text-base"
                    style = {{ fontFamily: 'Montserrat' }}
                  >
                    Отправить инструкции
                  </button>
                </div>
              </>
            )}

            {resetStep === 'success' && (
              <>
                <h2 className="text-xl md:text-2xl font-bold text-center mb-4 md:mb-6" style={{ color: '#0808E4', fontFamily: 'Widock TRIAL, sans-serif' }}>
                  ✓ Инструкции отправлены
                </h2>
                <p className = "text-center mb-4 md:mb-6 text-gray-600 text-sm md:text-base">
                  Проверьте ваш email и следуйте инструкциям для восстановления пароля.
                </p>
                <button
                  onClick = {closeResetModal}
                  className = "w-full font-semibold py-3 md:py-4 px-4 md:px-6 rounded-[10px] bg-[#BEE500] text-white hover:bg-[#a8c900] transition-all text-sm md:text-base"
                  style = {{ fontFamily: 'Montserrat' }}
                >
                  Понятно
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Login
