import React, { useState, useEffect } from 'react'
import backgroundImage from '../assets/background.png'
import grafity1 from '../assets/grafity1.png'
import grafity2 from '../assets/grafity2.png'
import blueLine from '../assets/blue_line.png'
import textVerify from '../assets/TextVerify.png'

const Registration = () => {
  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    middleName: '',
    email: '',
    birthDate: '',
    graduationYear: '',
    courseClass: '',
    password: '',
    confirmPassword: '',
    // Поля для родителей, если возраст < 18)
    parentLastName: '',
    parentFirstName: '',
    parentMiddleName: '',
    parentPhone: '',
    showParentFields: false
  })

  const [errors, setErrors] = useState({})
  const [showMessage, setShowMessage] = useState({ show: false, text: '', type: '' })
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [verificationToken, setVerificationToken] = useState('')
  const [copyNotification, setCopyNotification] = useState(false)

  // Проверка возраста при загрузке компонента и при изменении даты
  useEffect(() => {
    console.log('useEffect сработал, дата рождения:', formData.birthDate)
    if (formData.birthDate) {
      let birthDate
      if (formData.birthDate.includes('.')) {
        // Формат ДД.ММ.ГГГГ
        const parts = formData.birthDate.split('.')
        if (parts.length === 3) {
          const day = parseInt(parts[0])
          const month = parseInt(parts[1]) - 1 
          const year = parseInt(parts[2])
          birthDate = new Date(year, month, day)
        }
      } else {
        // Стандартный формат
        birthDate = new Date(formData.birthDate)
      }
      
      const today = new Date()
      const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000))

      if (age < 18) {
        setFormData(prev => ({ ...prev, showParentFields: true }))
      } else {
        setFormData(prev => ({ ...prev, showParentFields: false }))
      }
    }
  }, [formData.birthDate]) 

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))

    // Очищаем ошибку при изменении поля
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const validateForm = () => {
    const newErrors = {}

    // Проверка обязательных полей, кроме email
    const requiredFields = ['lastName', 'firstName', 'middleName', 'birthDate', 'graduationYear', 'courseClass', 'password', 'confirmPassword']
    requiredFields.forEach(key => {
      if (!formData[key]) {
        newErrors[key] = 'Это поле обязательно для заполнения'
      }
    })

    // Валидация email
    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Введите корректный email'
    }

    // Валидация возраста и добавление полей родителей
    if (formData.birthDate) {
      let birthDate
      if (formData.birthDate.includes('.')) {
        const parts = formData.birthDate.split('.')
        if (parts.length === 3) {
          const day = parseInt(parts[0])
          const month = parseInt(parts[1]) - 1 
          const year = parseInt(parts[2])
          birthDate = new Date(year, month, day)
        }
      } else {
        birthDate = new Date(formData.birthDate)
      }
      
      const today = new Date()
      const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000))

      if (age < 18) {
        if (!formData.parentLastName) newErrors.parentLastName = 'Это поле обязательно для заполнения'
        if (!formData.parentFirstName) newErrors.parentFirstName = 'Это поле обязательно для заполнения'
        if (!formData.parentMiddleName) newErrors.parentMiddleName = 'Это поле обязательно для заполнения'
        if (!formData.parentPhone) newErrors.parentPhone = 'Это поле обязательно для заполнения'
      }
    }

    // Проверка совпадения паролей
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают'
    }

    // Проверка возраста
    if (formData.birthDate) {
      const birthDate = new Date(formData.birthDate)
      const today = new Date()
      const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000))
      if (age < 18) {
        // Показываем поля для родителей сразу
        setFormData(prev => ({ ...prev, showParentFields: true }))
      } else {
        // Скрываем поля для родителей
        setFormData(prev => ({ ...prev, showParentFields: false }))
      }
    }

    return newErrors
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const newErrors = validateForm()
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Показываем модальное окно верификации
    setVerificationToken('TOKEN-12345-ABCDE') // Временный токен, будет заменен на реальный с сервера
    setShowVerificationModal(true)
  }

  const hideMessage = () => {
    setShowMessage({ show: false, text: '', type: '' })
  }

  const today = new Date()
  const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate()).toISOString().split('T')[0]

  return (
    <div 
      className = "min-h-screen flex items-center justify-center p-4"
      style = {{
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
          className={`fixed top-4 right-4 p-4 rounded-lg text-white font-medium z-50 max-w-sm animate-slide-in-right ${
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
       <div className = "bg-white rounded-[20px] overflow-hidden relative animate-slide-up" style={{ width: '100%', maxWidth: '580px', border: '4px solid #0808E4', margin: '0 auto' }}>    
        <div className = "p-6 md:p-10 md:pt-12 md:pb-6">
          {/* Заголовки организации */}
          <header className = "text-center mb-4">
            <h1 className = "text-2xl md:text-3xl mb-1" style = {{ color: '#0808E4', fontFamily: 'Widock TRIAL, sans-serif', fontWeight: 'bold', lineHeight: '150%', letterSpacing: '0.05em' }}>
              ЛИГА АБИТУРИЕНТОВ
            </h1>
            <h1 className = "text-2xl md:text-3xl mb-1" style = {{ color: '#0808E4', fontFamily: 'Widock TRIAL, sans-serif', fontWeight: 'bold', lineHeight: '150%', letterSpacing: '0.05em' }}>
              КГПИ КЕМГУ
            </h1>
            <h1 className = "text-xl md:text-3xl mb-1" style = {{ color: '#BEE500', fontFamily: 'Widock TRIAL, sans-serif', fontWeight: 'bold', lineHeight: '150%', letterSpacing: '0.05em' }}>
            РЕГИСТРАЦИЯ
            </h1>
          </header>       

          {/* Форма */}
          <form onSubmit={handleSubmit} className = "space-y-4">
            {/* Поле: Фамилия */}
            <div>
              <label htmlFor = "lastName" className = "block mb-2" style = {{ color: '#000000', fontFamily: 'Montserrat', fontWeight: 'bold', lineHeight: '150%', letterSpacing: '2%', fontSize: '16px' }}>
                Фамилия
              </label>
              <input
                type = "text"
                id = "lastName"
                name = "lastName"
                value = {formData.lastName}
                onChange = {handleChange}
                placeholder = "Введите фамилию"
                className = {`w-full h-12 px-4 rounded-xl transition-all duration-200 ${
                  errors.lastName 
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
                autoComplete = "family-name"
              />
              {errors.lastName && (
                <p className = "mt-1 text-sm text-red-500">{errors.lastName}</p>
              )}
            </div>

            {/* Поле: Имя */}
            <div>
              <label htmlFor = "firstName" className = "block mb-2" style = {{ color: '#000000', fontFamily: 'Montserrat', fontWeight: 'bold', lineHeight: '150%', letterSpacing: '5%', fontSize: '18px' }}>
                Имя
              </label>
              <input
                type = "text"
                id = "firstName"
                name = "firstName"
                value = {formData.firstName}
                onChange = {handleChange}
                placeholder = "Введите имя"
                className = {`w-full h-12 px-4 rounded-xl transition-all duration-200 ${
                  errors.firstName 
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
                autoComplete = "given-name"
              />
              {errors.firstName && (
                <p className = "mt-1 text-sm text-red-500">{errors.firstName}</p>
              )}
            </div>

            {/* Поле: Отчество */}
            <div>
              <label htmlFor = "middleName" className = "block mb-2" style = {{ color: '#000000', fontFamily: 'Montserrat', fontWeight: 'bold', lineHeight: '150%', letterSpacing: '5%', fontSize: '18px' }}>
                Отчество
              </label>
              <input
                type = "text"
                id = "middleName"
                name = "middleName"
                value = {formData.middleName}
                onChange = {handleChange}
                placeholder = "Введите отчество"
                className = {`w-full h-12 px-4 rounded-xl transition-all duration-200 ${
                  errors.middleName 
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
                autoComplete = "additional-name"
              />
              {errors.middleName && (
                <p className = "mt-1 text-sm text-red-500">{errors.middleName}</p>
              )}
            </div>

            {/* Поле: Адрес эл. почты */}
            <div>
              <label htmlFor = "email" className = "block mb-2" style = {{ color: '#000000', fontFamily: 'Montserrat', fontWeight: 'bold', lineHeight: '150%', letterSpacing: '5%', fontSize: '18px' }}>
                Адрес эл. почты
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

            {/* Поле: Дата рождения */}
            <div>
              <div style = {{
                backgroundColor: '#DADAFB',
                borderRadius: '10px',
                padding: '15px 10px',
                width: '100%'
              }}>
                <label htmlFor = "birthDate" className = "block mb-2" style = {{ color: '#000000', fontFamily: 'Montserrat', fontWeight: 'bold', lineHeight: '150%', letterSpacing: '5%', fontSize: '18px' }}>
                  Дата рождения
                </label>
                <input
                  type = "text"
                  id = "birthDate"
                  name = "birthDate"
                  value = {formData.birthDate}
                  onChange = {handleChange}
                  placeholder = "ДД.ММ.ГГГГ"
                  className = {`w-full h-12 px-4 rounded-xl transition-all duration-200 ${
                    errors.birthDate 
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
                />

                {/* Поля для родителей (если возраст < 18) */}
                {formData.showParentFields && (
                  <div className = "mt-4">
                    <h2 className = "text-xl mb-0,2 text-center" style={{ 
                      color: '#000000', 
                      fontFamily: 'Montserrat', 
                      fontWeight: 'bold',
                      lineHeight: '150%',
                      letterSpacing: '0.05em'
                    }}>
                      Данные родителя
                    </h2>

                    <h2 className = "text-xl mb-4 text-center" style={{ 
                      color: '#000000', 
                      fontFamily: 'Montserrat', 
                      fontWeight: 'bold',
                      lineHeight: '150%',
                      letterSpacing: '0.05em'
                    }}>
                      (законного представителя)
                    </h2>
                    
                    {/* Поле: Фамилия родителя */}
                    <div className = "mb-4">
                      <label htmlFor = "parentLastName" className = "block mb-2" style = {{ color: '#000000', fontFamily: 'Montserrat', fontWeight: 'bold', lineHeight: '150%', letterSpacing: '5%', fontSize: '18px' }}>
                        Фамилия
                      </label>
                      <input
                        type = "text"
                        id = "parentLastName"
                        name = "parentLastName"
                        value = {formData.parentLastName}
                        onChange = {handleChange}
                        placeholder = "Введите фамилию родителя"
                        className = {`w-full h-12 px-4 rounded-xl transition-all duration-200 ${
                          errors.parentLastName 
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
                      />
                      {errors.parentLastName && (
                        <p className = "mt-1 text-sm text-red-500">{errors.parentLastName}</p>
                      )}
                    </div>

                    {/* Поле: Имя родителя */}
                    <div className = "mb-4">
                      <label htmlFor = "parentFirstName" className = "block mb-2" style = {{ color: '#000000', fontFamily: 'Montserrat', fontWeight: 'bold', lineHeight: '150%', letterSpacing: '5%', fontSize: '18px' }}>
                        Имя
                      </label>
                      <input
                        type = "text"
                        id = "parentFirstName"
                        name = "parentFirstName"
                        value = {formData.parentFirstName}
                        onChange = {handleChange}
                        placeholder = "Введите имя родителя"
                        className = {`w-full h-12 px-4 rounded-xl transition-all duration-200 ${
                          errors.parentFirstName 
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
                      />
                      {errors.parentFirstName && (
                        <p className = "mt-1 text-sm text-red-500">{errors.parentFirstName}</p>
                      )}
                    </div>

                    {/* Поле: Отчество родителя */}
                    <div className = "mb-4">
                      <label htmlFor = "parentMiddleName" className = "block mb-2" style = {{ color: '#000000', fontFamily: 'Montserrat', fontWeight: 'bold', lineHeight: '150%', letterSpacing: '5%', fontSize: '18px' }}>
                        Отчество
                      </label>
                      <input
                        type = "text"
                        id = "parentMiddleName"
                        name = "parentMiddleName"
                        value = {formData.parentMiddleName}
                        onChange = {handleChange}
                        placeholder = "Введите отчество родителя"
                        className = {`w-full h-12 px-4 rounded-xl transition-all duration-200 ${
                          errors.parentMiddleName 
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
                      />
                      {errors.parentMiddleName && (
                        <p className = "mt-1 text-sm text-red-500">{errors.parentMiddleName}</p>
                      )}
                    </div>

                    {/* Поле: Номер телефона родителя */}
                    <div className = "mb-4">
                      <label htmlFor = "parentPhone" className = "block mb-2" style = {{ color: '#000000', fontFamily: 'Montserrat', fontWeight: 'bold', lineHeight: '150%', letterSpacing: '5%', fontSize: '18px' }}>
                        Номер телефона
                      </label>
                      <input
                        type = "tel"
                        id = "parentPhone"
                        name = "parentPhone"
                        value = {formData.parentPhone}
                        onChange = {handleChange}
                        placeholder = "+7 (999) 999-99-99"
                        className = {`w-full h-12 px-4 rounded-xl transition-all duration-200 ${
                          errors.parentPhone 
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
                      />
                      {errors.parentPhone && (
                        <p className = "mt-1 text-sm text-red-500">{errors.parentPhone}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {errors.birthDate && (
                <p className = "mt-1 text-sm text-red-500">{errors.birthDate}</p>
              )}
            </div>

            {/* Поле: Класс/курс */}
            <div>
              <label htmlFor = "courseClass" className = "block mb-2" style = {{ color: '#000000', fontFamily: 'Montserrat', fontWeight: 'bold', lineHeight: '150%', letterSpacing: '5%', fontSize: '18px' }}>
                Класс/курс
              </label>
              <input
                type = "text"
                id = "courseClass"
                name = "courseClass"
                value = {formData.courseClass}
                onChange = {handleChange}
                placeholder = "11"
                className = {`w-full h-12 px-4 rounded-xl transition-all duration-200 ${
                  errors.courseClass 
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
              />
              {errors.courseClass && (
                <p className = "mt-1 text-sm text-red-500">{errors.courseClass}</p>
              )}
            </div>

            {/* Поле: Год выпуска */}
            <div>
              <label htmlFor = "graduationYear" className = "block mb-2" style = {{ color: '#000000', fontFamily: 'Montserrat', fontWeight: 'bold', lineHeight: '150%', letterSpacing: '5%', fontSize: '18px' }}>
                Год выпуска
              </label>
              <input
                type = "number"
                id = "graduationYear"
                name = "graduationYear"
                value = {formData.graduationYear}
                onChange = {handleChange}
                placeholder = "2023"
                min = "2000"
                max = "2030"
                className = {`w-full h-12 px-4 rounded-xl transition-all duration-200 ${
                  errors.graduationYear 
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
              />
              {errors.graduationYear && (
                <p className = "mt-1 text-sm text-red-500">{errors.graduationYear}</p>
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
                autoComplete = "new-password"
                minLength = "6"
              />
              {errors.password && (
                <p className = "mt-1 text-sm text-red-500">{errors.password}</p>
              )}
            </div>

            {/* Поле: Подтвердите пароль */}
            <div>
              <label htmlFor = "confirmPassword" className = "block mb-2" style = {{ color: '#000000', fontFamily: 'Montserrat', fontWeight: 'bold', lineHeight: '150%', letterSpacing: '5%', fontSize: '18px' }}>
                Подтвердите пароль
              </label>
              <input
                type = "password"
                id = "confirmPassword"
                name = "confirmPassword"
                value = {formData.confirmPassword}
                onChange = {handleChange}
                placeholder = "Подтвердите пароль"
                className = {`w-full h-12 px-4 rounded-xl transition-all duration-200 ${
                  errors.confirmPassword 
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
                autoComplete = "new-password"
                minLength = "6"
              />
              {errors.confirmPassword && (
                <p className = "mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
              )}
            </div>

            {/* Кнопка отправки */}
            <button
              type = "submit"
              className = "w-full font-semibold transition-all duration-300 mt-6 group"
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
                padding: '10px 16px',
                cursor: 'pointer',
                transition: 'all 0.3s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#BEE500'
                e.currentTarget.style.color = 'white'
                e.currentTarget.style.transform = 'scale(1.02)'
                e.currentTarget.style.borderColor = '#BEE500'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white'
                e.currentTarget.style.color = '#C9E410'
                e.currentTarget.style.transform = 'scale(1)'
                e.currentTarget.style.borderColor = '#BEE500'
              }}
            >
              Зарегистрироваться
            </button>
          </form>
        </div>
      </div>

      {/* Модальное окно верификации */}
      {showVerificationModal && (
        <div className = "fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className = "bg-white rounded-[20px] px-3 py-6 max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto" style={{ border: '3px solid #C9E410' }}>
            {/* Заголовок верификации - используем изображение, т.к. текст сложно настроить так, чтобы не было огромного пустого места */}
            <div className = "text-center mb-4">
              <img src={textVerify} alt = "ВЕРИФИКАЦИЯ ЧЕРЕЗ БОТА" style = {{ maxWidth: '100%', height: 'auto' }} />
            </div>

            {/* Текст инструкции */}
            <h2 className = "text-center mb-2" style = {{ 
              color: '#000000', 
              fontFamily: 'Montserrat', 
              fontWeight: 'bold',
              lineHeight: '150%',
              letterSpacing: '0.05em'
            }}>
              Для подтверждения вашего аккаунта, пожалуйста, следуйте инструкциям ниже.
            </h2>

            {/* Синяя линия */}
            <div className = "flex justify-center mb-6">
              <img src = {blueLine} alt = "Линия" style = {{ width: 'calc(100% - 30px)', height: 'auto' }} />
            </div>

            {/* Инструкция */}
            <div className = "mb-6" style = {{ color: '#000000', fontFamily: 'Montserrat', fontWeight: '600', lineHeight: '150%' }}>
              <p className = "mb-2">1. Скопируйте токен подтверждения из поля ниже;</p>
              <p className = "mb-2">2. Перейдите по ссылке на ВК бота: <a href = "https://clck.ru/3SfdWf" target="_blank" rel="noopener noreferrer" style={{ color: '#0808E4', textDecoration: 'underline' }}>https://clck.ru/3SfdWf</a></p>
              <p className = "mb-2">3. Введите токен в чате с ботом.</p>
            </div>

            {/* Поле с токеном */}
            <div 
              onClick={() => {
                navigator.clipboard.writeText(verificationToken)
                setCopyNotification(true)
                setTimeout(() => setCopyNotification(false), 2000)
              }}
              style = {{
                border: '2px solid #BEE500',
                borderRadius: '10px',
                padding: '15px',
                backgroundColor: 'white',
                width: '100%',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative'
              }}
              onMouseEnter = {(e) => {
                e.currentTarget.style.backgroundColor = '#F8F8F8'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white'
              }}
            >
              <p style = {{ 
                color: '#000000', 
                fontFamily: 'Montserrat',
                fontSize: '16px',
                wordBreak: 'break-all',
                userSelect: 'all'
              }}>
                {verificationToken}
              </p>
              {copyNotification && (
                <div style={{
                  position: 'absolute',
                  top: '-30px',
                  right: '10px',
                  backgroundColor: '#4CAF50',
                  color: 'white',
                  padding: '5px 10px',
                  borderRadius: '5px',
                  fontSize: '12px',
                  fontFamily: 'Montserrat',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                }}>
                  Скопировано!
                </div>
              )}
            </div>

            {/* Кнопка продолжить без верификации */}
            <button
              onClick = {() => {
                setShowVerificationModal(false)
                // Логика для перехода на следующую страницу
              }}
              className = "mx-auto font-semibold transition-all duration-300 mt-6"
              style = {{
                backgroundColor: 'white',
                border: '3px solid #FF5959',
                borderRadius: '10px',
                color: '#FF5959',
                fontFamily: 'Widock TRIAL, sans-serif',
                fontWeight: 'bold',
                lineHeight: '150%',
                letterSpacing: '0.05em',
                fontSize: '10px',
                padding: '12px 20px',
                cursor: 'pointer',
                display: 'block'
              }}
            >
              Продолжить без верификации
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Registration
