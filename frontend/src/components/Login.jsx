import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import backgroundImage from '../assets/background.png'
import grafity1 from '../assets/grafity1.png'
import grafity2 from '../assets/grafity2.png'

const API_URL = `http://${window.location.hostname}:3000`

const Login = () => {
  const navigate = useNavigate()
  
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  })

  const [errors, setErrors] = useState({})
  const [showMessage, setShowMessage] = useState({ show: false, text: '', type: '' })

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
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Введите корректный email'
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

        // Переход на страницу портфолио
        setTimeout(() => {
          navigate(`/portfolio?login=${result.user.login}`)
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
    // Заглушка для функции восстановления пароля
    setShowMessage({
      show: true,
      text: 'Функция восстановления пароля в разработке',
      type: 'info'
    })
  }

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
                Логин (Email)
              </label>
              <input
                type = "email"
                id = "email"
                name = "email"
                value = {formData.email}
                onChange = {handleChange}
                placeholder = "example@mail.ru"
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
    </div>
  )
}

export default Login
