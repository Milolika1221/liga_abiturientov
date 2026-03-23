import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
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

const ResetPassword = () => {
  const navigate = useNavigate()
  const location = useLocation()
  
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [errors, setErrors] = useState({})
  const [showMessage, setShowMessage] = useState({ show: false, text: '', type: '' })
  const [isSuccess, setIsSuccess] = useState(false)
  const [token, setToken] = useState('')

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    const tokenParam = params.get('token')
    if (tokenParam) {
      setToken(tokenParam)
    } else {
      setShowMessage({
        show: true,
        text: 'Неверная или устаревшая ссылка для сброса пароля',
        type: 'error'
      })
    }
  }, [location])

  const validateForm = () => {
    const newErrors = {}
    
    if (!newPassword) {
      newErrors.newPassword = 'Введите новый пароль'
    } else if (newPassword.length < 8) {
      newErrors.newPassword = 'Пароль должен содержать минимум 8 символов'
    } else {
      // Проверяем требования к сложности
      const hasUpperCase = /[A-Z]/.test(newPassword)
      const hasLowerCase = /[a-z]/.test(newPassword)
      const hasNumbers = /\d/.test(newPassword)
      const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)
      
      let requirements = []
      
      if (!hasUpperCase) requirements.push('заглавную букву')
      if (!hasLowerCase) requirements.push('строчную букву')
      if (!hasNumbers) requirements.push('цифру')
      if (!hasSpecialChar) requirements.push('специальный символ (!@#$%^&* и т.д.)')
      
      // Должно быть выполнено минимум 3 из 4 требований
      const metRequirements = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length
      
      if (metRequirements < 3) {
        newErrors.newPassword = `Пароль слишком простой. Добавьте: ${requirements.join(', ')}`
      }
    }
    
    if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают'
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
      const response = await fetch(`${API_URL}/confirm-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          token: token,
          newPassword: newPassword
        })
      })

      const result = await response.json()

      if (result.status === 'yea') {
        setIsSuccess(true)
        setShowMessage({
          show: true,
          text: 'Пароль успешно изменен!',
          type: 'success'
        })
        
        setTimeout(() => {
          navigate('/login')
        }, 2000)
      } else {
        setShowMessage({
          show: true,
          text: result.message || 'Ошибка при сбросе пароля',
          type: 'error'
        })
      }
    } catch (error) {
      console.error('Ошибка при сбросе пароля:', error)
      setShowMessage({
        show: true,
        text: 'Ошибка соединения с сервером. Попробуйте позже.',
        type: 'error'
      })
    }
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
              : 'bg-gradient-to-r from-green-500 to-green-600'
          }`}
          onClick = {hideMessage}
        >
          {showMessage.text}
        </div>
      )}

      {/* Карточка формы */}
      <div className = "bg-white rounded-[20px] overflow-hidden relative animate-slide-up" style = {{ width: '100%', maxWidth: '580px', minHeight: '600px', border: '4px solid #0808E4', margin: '0 auto' }}>    
        <div className = "p-6 md:p-10 md:pt-12 md:pb-6 flex flex-col h-full">
          {/* Заголовки организации */}
          <header className = "text-center mb-2">
            <h1 className = "text-2xl md:text-3xl mb-1" style = {{ color: '#0808E4', fontFamily: 'Widock TRIAL, sans-serif', fontWeight: 'bold', lineHeight: '150%', letterSpacing: '0.05em' }}>
              ЛИГА АБИТУРИЕНТОВ
            </h1>
            <h1 className = "text-2xl md:text-3xl mb-1" style = {{ color: '#0808E4', fontFamily: 'Widock TRIAL, sans-serif', fontWeight: 'bold', lineHeight: '150%', letterSpacing: '0.05em' }}>
              КГПИ КЕМГУ
            </h1>
            <h1 className = "text-xl md:text-3xl mb-1" style = {{ color: '#BEE500', fontFamily: 'Widock TRIAL, sans-serif', fontWeight: 'bold', lineHeight: '150%', letterSpacing: '0.05em' }}>
              ВОССТАНОВЛЕНИЕ ПАРОЛЯ
            </h1>
          </header>       

          {isSuccess ? (
            <div className = "flex flex-col items-center justify-center flex-grow">
              <div className = "text-center">
                <div className = "text-6xl mb-4">✓</div>
                <h2 className = "text-2xl font-bold mb-4" style={{ color: '#0808E4', fontFamily: 'Widock TRIAL, sans-serif' }}>
                  Пароль изменен!
                </h2>
                <p className = "text-gray-600 mb-6">
                  Вы будете перенаправлены на страницу входа...
                </p>
                <button
                  onClick = {() => navigate('/login')}
                  className = "font-semibold py-3 px-8 rounded-[10px] bg-[#0808E4] text-white hover:bg-[#0606b4] transition-all"
                  style = {{ fontFamily: 'Montserrat' }}
                >
                  Войти в систему
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit = {handleSubmit} className = "space-y-6 flex flex-col flex-grow justify-center mt-4">
              {/* Поле: Новый пароль */}
              <div>
                <label htmlFor = "newPassword" className = "block mb-2" style = {{ color: '#000000', fontFamily: 'Montserrat', fontWeight: 'bold', lineHeight: '150%', letterSpacing: '5%', fontSize: '18px' }}>
                  Новый пароль
                </label>
                <input
                  type = "password"
                  id = "newPassword"
                  value = {newPassword}
                  onChange = {(e) => {
                    setNewPassword(e.target.value)
                    if (errors.newPassword) {
                      setErrors(prev => ({ ...prev, newPassword: '' }))
                    }
                  }}
                  placeholder = "Минимум 8 символов"
                  className = {`w-full h-12 px-4 rounded-xl transition-all duration-200 ${
                    errors.newPassword ? 'border-red-500' : ''
                  }`}
                  style = {{
                    fontFamily: 'Montserrat',
                    border: '2px solid #8484F2',
                    backgroundColor: '#EFEFEF',
                    borderRadius: '10px',
                    outline: 'none'
                  }}
                />
                {errors.newPassword && (
                  <p className = "mt-1 text-sm text-red-500">{errors.newPassword}</p>
                )}
                {newPassword && !errors.newPassword && (
                  <div className = "mt-2">
                    <div className = "flex items-center space-x-2">
                      <span className = "text-xs text-gray-600">Сложность пароля:</span>
                      <div className = "flex space-x-1">
                        {(() => {
                          const hasUpperCase = /[A-Z]/.test(newPassword)
                          const hasLowerCase = /[a-z]/.test(newPassword)
                          const hasNumbers = /\d/.test(newPassword)
                          const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPassword)
                          
                          const metRequirements = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length
                          
                          return (
                            <>
                              <div className = {`w-2 h-2 rounded-full ${metRequirements >= 1 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                              <div className = {`w-2 h-2 rounded-full ${metRequirements >= 2 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                              <div className = {`w-2 h-2 rounded-full ${metRequirements >= 3 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                              <div className = {`w-2 h-2 rounded-full ${metRequirements >= 4 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            </>
                          )
                        })()}
                      </div>
                    </div>
                    <p className = "text-xs text-gray-500 mt-1">
                      Минимум 8 символов, включая 3 из 4: заглавные, строчные, цифры, символы
                    </p>
                  </div>
                )}
              </div>

              {/* Поле: Подтверждение пароля */}
              <div>
                <label htmlFor = "confirmPassword" className = "block mb-2" style = {{ color: '#000000', fontFamily: 'Montserrat', fontWeight: 'bold', lineHeight: '150%', letterSpacing: '5%', fontSize: '18px' }}>
                  Подтвердите пароль
                </label>
                <input
                  type = "password"
                  id = "confirmPassword"
                  value = {confirmPassword}
                  onChange = {(e) => {
                    setConfirmPassword(e.target.value)
                    if (errors.confirmPassword) {
                      setErrors(prev => ({ ...prev, confirmPassword: '' }))
                    }
                  }}
                  placeholder = "Повторите пароль"
                  className = {`w-full h-12 px-4 rounded-xl transition-all duration-200 ${
                    errors.confirmPassword ? 'border-red-500' : ''
                  }`}
                  style={{
                    fontFamily: 'Montserrat',
                    border: '2px solid #8484F2',
                    backgroundColor: '#EFEFEF',
                    borderRadius: '10px',
                    outline: 'none'
                  }}
                />
                {errors.confirmPassword && (
                  <p className = "mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Кнопка СОХРАНИТЬ */}
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
                СОХРАНИТЬ ПАРОЛЬ
              </button>

              {/* Кнопка НАЗАД */}
              <button
                type = "button"
                onClick = {() => navigate('/login')}
                className = "w-full font-semibold py-2 text-gray-500 hover:text-gray-700 transition-all"
                style = {{ fontFamily: 'Montserrat' }}
              >
                ← Вернуться к входу
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}

export default ResetPassword
