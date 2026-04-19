import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import backgroundImage from '../assets/background.png'
import grafity1 from '../assets/grafity1.png'
import grafity2 from '../assets/grafity2.png'
import blueLine from '../assets/blue_line.png'
import textVerify from '../assets/TextVerify.png'
import copyIcon from '../assets/copy.png'

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

const API_URL = getApiUrl()

// Функция форматирования номера телефона с маской
const formatPhoneNumber = (value) => {
  const digits = value.replace(/\D/g, '');
  const limitedDigits = digits.slice(0, 11);
  
  if (limitedDigits.length === 0) {
    return '';
  } else if (limitedDigits.length === 1) {
    return '+7';
  } else if (limitedDigits.length < 4) {
    return `+7 (${limitedDigits.slice(1)}`;
  } else if (limitedDigits.length < 7) {
    return `+7 (${limitedDigits.slice(1, 4)}) ${limitedDigits.slice(4)}`;
  } else if (limitedDigits.length < 9) {
    return `+7 (${limitedDigits.slice(1, 4)}) ${limitedDigits.slice(4, 7)}-${limitedDigits.slice(7)}`;
  } else {
    return `+7 (${limitedDigits.slice(1, 4)}) ${limitedDigits.slice(4, 7)}-${limitedDigits.slice(7, 9)}-${limitedDigits.slice(9, 11)}`;
  }
};

const Registration = () => {
  // Функция для получения текущего года
  const getCurrentYear = () => {
    return new Date().getFullYear()
  }

  const [formData, setFormData] = useState({
    lastName: '',
    firstName: '',
    middleName: '',
    phoneNumber: '',
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
    showParentFields: false,
    // Согласие на обработку персональных данных
    agreement: false,
    // Подтверждение возраста/ответственности
    ageConfirmation: false,
    // Согласие на маркетинговые рассылки
    marketingConsent: false,
    // Согласие на обработку персональных данных
    dataProcessingConsent: false,
    // Образовательная организация
    school: ''
  })

  const [errors, setErrors] = useState({})
  const [showMessage, setShowMessage] = useState({ show: false, text: '', type: '' })
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [verificationToken, setVerificationToken] = useState('')
  const [copyNotification, setCopyNotification] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const [showAgeConfirmModal, setShowAgeConfirmModal] = useState(false)
  const [pendingAgeConfirm, setPendingAgeConfirm] = useState(false)
  const [showMarketingModal, setShowMarketingModal] = useState(false)
  const [pendingMarketing, setPendingMarketing] = useState(false)
  const [showDataProcessingModal, setShowDataProcessingModal] = useState(false)
  const [pendingDataProcessing, setPendingDataProcessing] = useState(false)
  const [dataProcessingScrolled, setDataProcessingScrolled] = useState(false)
  const [dataProcessingHover, setDataProcessingHover] = useState(false)
  const dataProcessingRef = useRef(null)
  const navigate = useNavigate()

  // Проверка интернет-подключения
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
      setShowMessage({ show: false, text: '', type: '' })
    }
    
    const handleOffline = () => {
      setIsOnline(false)
      setShowMessage({ 
        show: true, 
        text: 'Соединение с интернетом потеряно. Проверьте подключение.', 
        type: 'error' 
      })
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Функция проверки интернет-подключения перед запросом
  const checkInternetConnection = () => {
    if (!navigator.onLine) {
      setShowMessage({ 
        show: true, 
        text: 'Отсутствует подключение к интернету. Проверьте соединение и попробуйте снова.', 
        type: 'error' 
      })
      return false
    }
    return true
  }

  // Проверка возраста при загрузке компонента и при изменении даты
  useEffect(() => {
    console.log('useEffect сработал, дата рождения:', formData.birthDate)
    if (formData.birthDate && !errors.birthDate) {
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
      today.setHours(0, 0, 0, 0)

      // Проверка: дата не должна быть в будущем
      if (birthDate > today) {
        setFormData(prev => ({ ...prev, showParentFields: false }))
        return
      }

      const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000))

      if (age < 18) {
        setFormData(prev => ({ ...prev, showParentFields: true }))
      } else {
        setFormData(prev => ({ ...prev, showParentFields: false }))
      }
    }
  }, [formData.birthDate, errors.birthDate]) 

  // Авто-скрытие сообщений через 3 секунды
  useEffect(() => {
    if (showMessage.show) {
      const timer = setTimeout(() => {
        setShowMessage({ show: false, text: '', type: '' })
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [showMessage.show])

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))

    // Очищаем ошибку при изменении поля
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }

    // Валидация для чекбокса согласия - показываем ошибку сразу при снятии галочки
    if (name === 'agreement' && !checked) {
      setErrors(prev => ({ ...prev, agreement: 'Необходимо согласие на обработку персональных данных' }))
    }

    // Обработка чекбокса подтверждения возраста - показываем модальное окно при попытке отметить
    if (name === 'ageConfirmation') {
      if (checked) {
        // Отменяем автоматическую установку галочки, показываем модальное окно
        setFormData(prev => ({ ...prev, ageConfirmation: false }))
        setPendingAgeConfirm(true)
        setShowAgeConfirmModal(true)
      } else {
        // При снятии галочки показываем ошибку
        setErrors(prev => ({ ...prev, ageConfirmation: 'Необходимо подтверждение' }))
      }
    }

    // Обработка чекбокса маркетингового согласия
    if (name === 'marketingConsent') {
      if (checked) {
        // Отменяем автоматическую установку галочки, показываем модальное окно
        setFormData(prev => ({ ...prev, marketingConsent: false }))
        setPendingMarketing(true)
        setShowMarketingModal(true)
      } else {
        // При снятии галочки показываем ошибку
        setErrors(prev => ({ ...prev, marketingConsent: 'Необходимо согласие' }))
      }
    }

    // Обработка чекбокса согласия на обработку персональных данных
    if (name === 'dataProcessingConsent') {
      if (checked) {
        // Отменяем автоматическую установку галочки, показываем модальное окно
        setFormData(prev => ({ ...prev, dataProcessingConsent: false }))
        setPendingDataProcessing(true)
        setShowDataProcessingModal(true)
      } else {
        // При снятии галочки показываем ошибку
        setErrors(prev => ({ ...prev, dataProcessingConsent: 'Необходимо согласие' }))
      }
    }

    // Валидация для даты рождения
    if (name === 'birthDate') {
      // Запрещаем ввод букв - только цифры и точки
      if (value && !/^[0-9\.]*$/.test(value)) {
        // Удаляем все символы кроме цифр и точек
        const cleanValue = value.replace(/[^0-9\.]/g, '')
        setFormData(prev => ({ ...prev, birthDate: cleanValue }))
        return
      }
      
      if (value.includes('.')) {
        const parts = value.split('.')
        
        // Проверяем день
        if (parts[0]) {
          const day = parseInt(parts[0])
          if (isNaN(day) || day < 1 || day > 31) {
            setErrors(prev => ({ ...prev, birthDate: 'День должен быть от 1 до 31' }))
            return
          }
        }
        
        // Проверяем месяц
        if (parts[1]) {
          const month = parseInt(parts[1])
          if (isNaN(month) || month < 1 || month > 12) {
            setErrors(prev => ({ ...prev, birthDate: 'Месяц должен быть от 1 до 12' }))
            return
          }
        }
        
        // Если все три части введены, сначала проверяем что дата не в будущем
        if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
          const day = parseInt(parts[0])
          const month = parseInt(parts[1]) - 1
          const year = parseInt(parts[2])
          const birthDate = new Date(year, month, day)
          const today = new Date()
          today.setHours(0, 0, 0, 0)

          // Проверяем что дата вообще существует (не 31 февраля)
          if (birthDate.getDate() !== day || birthDate.getMonth() !== month || birthDate.getFullYear() !== year) {
            setErrors(prev => ({ ...prev, birthDate: 'Введена некорректная дата' }))
            return
          }

          // Проверяем что дата не в будущем
          if (birthDate > today) {
            setErrors(prev => ({ ...prev, birthDate: 'Дата рождения не может быть в будущем' }))
            return
          }

          // Проверяем что год не слишком старый
          const minYear = 1906
          if (year < minYear) {
            setErrors(prev => ({ ...prev, birthDate: `Год должен быть от ${minYear} до ${today.getFullYear()}` }))
            return
          }

          setErrors(prev => ({ ...prev, birthDate: '' }))
        } else if (parts[2]) {
          // Если год введен но дата неполная, проверяем только год
          const year = parseInt(parts[2])
          const currentYear = new Date().getFullYear()
          const minYear = 1906
          if (isNaN(year) || year < minYear || year > currentYear) {
            setErrors(prev => ({ ...prev, birthDate: `Год должен быть от ${minYear} до ${currentYear}` }))
            return
          }
        } else {
          setErrors(prev => ({ ...prev, birthDate: '' }))
        }
      } else if (value) {
        setErrors(prev => ({ ...prev, birthDate: 'Введите дату в формате ДД.ММ.ГГГГ' }))
      } else {
        // Поле очищено - скрываем поля родителей
        setErrors(prev => ({ ...prev, birthDate: '' }))
        setFormData(prev => ({ ...prev, showParentFields: false }))
      }
    }

    // Валидация для класса/курса (только цифры, максимум 11)
    if (name === 'courseClass') {
      if (value.length > 2) {
        // Обрезаем до 2 символов
        const truncatedValue = value.slice(0, 2)
        setFormData(prev => ({ ...prev, courseClass: truncatedValue }))
        return
      }
      
      if (value && !/^[0-9]*$/.test(value)) {
        setErrors(prev => ({ ...prev, courseClass: 'Класс/курс может содержать только цифры' }))
      } else if (value && parseInt(value) > 11) {
        // Ограничиваем максимум 11
        setFormData(prev => ({ ...prev, courseClass: '11' }))
        setErrors(prev => ({ ...prev, courseClass: 'Максимальный класс/курс - 11' }))
      } else {
        setErrors(prev => ({ ...prev, courseClass: '' }))
      }
    }

    // Валидация для номера телефона с маской
    if (name === 'phoneNumber') {
      const formattedValue = formatPhoneNumber(value);
      setFormData(prev => ({ ...prev, phoneNumber: formattedValue }));
      
      const digitsOnly = formattedValue.replace(/\D/g, '');
      if (formattedValue && digitsOnly.length !== 11) {
        setErrors(prev => ({ ...prev, phoneNumber: 'Номер телефона должен содержать ровно 11 цифр' }))
      } else {
        setErrors(prev => ({ ...prev, phoneNumber: '' }))
      }
      return;
    }

    // Валидация для номера телефона родителя
    if (name === 'parentPhone') {
      const formattedValue = formatPhoneNumber(value);
      setFormData(prev => ({ ...prev, parentPhone: formattedValue }));
      
      const digitsOnly = formattedValue.replace(/\D/g, '');
      if (formattedValue && digitsOnly.length !== 11) {
        setErrors(prev => ({ ...prev, parentPhone: 'Номер телефона должен содержать ровно 11 цифр' }))
      } else {
        setErrors(prev => ({ ...prev, parentPhone: '' }))
      }
      return;
    }

    // Валидация для года выпуска
    if (name === 'graduationYear') {
      const currentYear = getCurrentYear()
      const year = parseInt(value)
      
      if (value && (isNaN(year) || year < currentYear - 5 || year > currentYear + 10)) {
        setErrors(prev => ({ ...prev, graduationYear: `Год должен быть от ${currentYear - 5} до ${currentYear + 10}` }))
      } else {
        setErrors(prev => ({ ...prev, graduationYear: '' }))
      }
    }
  }

  const validateForm = () => {
    const newErrors = {}

    // Проверка обязательных полей
    const requiredFields = ['lastName', 'firstName', 'middleName', 'phoneNumber', 'birthDate', 'graduationYear', 'courseClass', 'school', 'password', 'confirmPassword']
    requiredFields.forEach(key => {
      if (!formData[key]) {
        newErrors[key] = 'Это поле обязательно для заполнения'
      }
    })

    // Проверка согласия на обработку персональных данных
    if (!formData.agreement) {
      newErrors.agreement = 'Необходимо согласие на обработку персональных данных'
    }

    // Проверка подтверждения возраста/ответственности
    if (!formData.ageConfirmation) {
      newErrors.ageConfirmation = 'Необходимо подтверждение'
    }

    // Проверка маркетингового согласия
    if (!formData.marketingConsent) {
      newErrors.marketingConsent = 'Необходимо согласие'
    }

    // Проверка согласия на обработку персональных данных
    if (!formData.dataProcessingConsent) {
      newErrors.dataProcessingConsent = 'Необходимо согласие'
    }

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
      today.setHours(0, 0, 0, 0)

      // Проверка что дата не в будущем
      if (birthDate > today) {
        newErrors.birthDate = 'Дата рождения не может быть в будущем'
      } else {
        const age = Math.floor((today - birthDate) / (365.25 * 24 * 60 * 60 * 1000))

        if (age < 18) {
          if (!formData.parentLastName) newErrors.parentLastName = 'Это поле обязательно для заполнения'
          if (!formData.parentFirstName) newErrors.parentFirstName = 'Это поле обязательно для заполнения'
          if (!formData.parentMiddleName) newErrors.parentMiddleName = 'Это поле обязательно для заполнения'
          if (!formData.parentPhone) newErrors.parentPhone = 'Это поле обязательно для заполнения'
        }
      }
    }

    // Проверка совпадения паролей
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Пароли не совпадают'
    }

    // Валидация сложности пароля
    if (formData.password) {
      const password = formData.password
      
      // Минимальная длина 8 символов
      if (password.length < 8) {
        newErrors.password = 'Пароль должен содержать минимум 8 символов'
      } else {
        // Проверяем требования к сложности
        const hasUpperCase = /[A-Z]/.test(password)
        const hasLowerCase = /[a-z]/.test(password)
        const hasNumbers = /\d/.test(password)
        const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)
        
        let requirements = []
        
        if (!hasUpperCase) requirements.push('заглавную букву')
        if (!hasLowerCase) requirements.push('строчную букву')
        if (!hasNumbers) requirements.push('цифру')
        if (!hasSpecialChar) requirements.push('специальный символ (!@#$%^&* и т.д.)')
        
        // Должно быть выполнено минимум 3 из 4 требований
        const metRequirements = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length
        
        if (metRequirements < 3) {
          newErrors.password = `Пароль слишком простой. Добавьте: ${requirements.join(', ')}`
        }
      }
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

  const handleSubmit = async (e) => {
    e.preventDefault()
    const newErrors = validateForm()
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    // Проверка интернет-подключения
    if (!checkInternetConnection()) {
      return
    }

    // Проверка доступности сервера перед регистрацией
    try {
      const healthCheck = await fetch(`${API_URL}/health`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      })
      if (!healthCheck.ok) {
        setShowMessage({
          show: true,
          text: 'Сервер временно недоступен. Попробуйте позже.',
          type: 'error'
        })
        return
      }
    } catch (error) {
      console.error('Ошибка проверки доступности сервера:', error)
      setShowMessage({
        show: true,
        text: 'Сервер временно недоступен. Попробуйте позже.',
        type: 'error'
      })
      return
    }

    try {
      // Подготовка данных для отправки на сервер
      const registrationData = {
        lastName: formData.lastName,
        firstName: formData.firstName,
        middleName: formData.middleName,
        phoneNumber: formData.phoneNumber,
        email: formData.email || null,
        birthDate: formData.birthDate,
        graduationYear: formData.graduationYear,
        courseClass: formData.courseClass,
        password: formData.password,

        // Поля родителя, если есть
        parentLastName: formData.showParentFields ? formData.parentLastName : undefined,
        parentFirstName: formData.showParentFields ? formData.parentFirstName : undefined,
        parentMiddleName: formData.showParentFields ? formData.parentMiddleName : undefined,
        parentPhone: formData.showParentFields ? formData.parentPhone : undefined,

        // Образовательная организация
        school: formData.school || undefined
      }

      // Отправка данных на сервер
      const response = await fetch(`${API_URL}/registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(registrationData)
      })

      const result = await response.json()

      if (result.status === 'yea') {
        // Успешная регистрация, показываем модальное окно с токеном
        setVerificationToken(result.token || '')
        setShowVerificationModal(true)
        
        // Показываем сообщение об успехе
        setShowMessage({
          show: true,
          text: 'Регистрация прошла успешно! Скопируйте токен и подтвердите аккаунт через бота.',
          type: 'success'
        })
      } else {
        // Ошибка регистрации
        setShowMessage({
          show: true,
          text: result.message || 'Ошибка при регистрации',
          type: 'error'
        })
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

  const copyTokenToClipboard = () => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(verificationToken).then(() => {
        setCopyNotification(true)
        setTimeout(() => setCopyNotification(false), 2000)
      }).catch(() => {
        fallbackCopyTextToClipboard()
      })
    } else {
      fallbackCopyTextToClipboard()
    }
  }

  const fallbackCopyTextToClipboard = () => {
    const textArea = document.createElement('textarea')
    textArea.value = verificationToken
    textArea.style.position = 'fixed'
    textArea.style.left = '-999999px'
    textArea.style.top = '-999999px'
    document.body.appendChild(textArea)
    textArea.focus()
    textArea.select()
    
    try {
      document.execCommand('copy')
      setCopyNotification(true)
      setTimeout(() => setCopyNotification(false), 2000)
    } catch (err) {
      console.error('Не удалось скопировать текст: ', err)
    }
    
    document.body.removeChild(textArea)
  }

  const hideMessage = () => {
    setShowMessage({ show: false, text: '', type: '' })
  }

  // Обработка подтверждения в модальном окне возраста
  const handleAcceptAgeConfirm = () => {
    setFormData(prev => ({ ...prev, ageConfirmation: true }))
    setErrors(prev => ({ ...prev, ageConfirmation: '' }))
    setShowAgeConfirmModal(false)
    setPendingAgeConfirm(false)
  }

  // Обработка отклонения в модальном окне возраста
  const handleDeclineAgeConfirm = () => {
    setFormData(prev => ({ ...prev, ageConfirmation: false }))
    setErrors(prev => ({ ...prev, ageConfirmation: 'Необходимо подтверждение' }))
    setShowAgeConfirmModal(false)
    setPendingAgeConfirm(false)
  }

  // Обработка подтверждения в модальном окне маркетинга
  const handleAcceptMarketing = () => {
    setFormData(prev => ({ ...prev, marketingConsent: true }))
    setErrors(prev => ({ ...prev, marketingConsent: '' }))
    setShowMarketingModal(false)
    setPendingMarketing(false)
  }

  // Обработка отклонения в модальном окне маркетинга
  const handleDeclineMarketing = () => {
    setFormData(prev => ({ ...prev, marketingConsent: false }))
    setErrors(prev => ({ ...prev, marketingConsent: 'Необходимо согласие' }))
    setShowMarketingModal(false)
    setPendingMarketing(false)
  }

  // Обработка подтверждения в модальном окне согласия на обработку данных
  const handleAcceptDataProcessing = () => {
    setFormData(prev => ({ ...prev, dataProcessingConsent: true }))
    setErrors(prev => ({ ...prev, dataProcessingConsent: '' }))
    setShowDataProcessingModal(false)
    setPendingDataProcessing(false)
  }

  // Обработка отклонения в модальном окне согласия на обработку данных
  const handleDeclineDataProcessing = () => {
    setFormData(prev => ({ ...prev, dataProcessingConsent: false }))
    setErrors(prev => ({ ...prev, dataProcessingConsent: 'Необходимо согласие' }))
    setShowDataProcessingModal(false)
    setPendingDataProcessing(false)
    setDataProcessingScrolled(false)
  }

  // Обработка скролла в модальном окне согласия
  const handleDataProcessingScroll = (e) => {
    const element = e.target
    const scrollTop = element.scrollTop
    const scrollHeight = element.scrollHeight
    const clientHeight = element.clientHeight
    
    // Если прокручено до конца (с небольшим запасом в 20px)
    if (scrollTop + clientHeight >= scrollHeight - 20) {
      setDataProcessingScrolled(true)
    } else {
      // Если прокручено НЕ до конца - сбрасываем флаг
      setDataProcessingScrolled(false)
    }
  }

  // Прокрутка вниз при клике на "Прочитайте до конца"
  const handleScrollToBottom = () => {
    if (dataProcessingRef.current) {
      dataProcessingRef.current.scrollTo({
        top: dataProcessingRef.current.scrollHeight,
        behavior: 'smooth'
      })
    }
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
          <header className = "text-center mb-2">
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
          <form onSubmit={handleSubmit} className = "space-y-4 mt-4">
            {/* Поле: Фамилия */}
            <div>
              <label htmlFor = "lastName" className = "block mb-2" style = {{ color: '#000000', fontFamily: 'Montserrat', fontWeight: 'bold', lineHeight: '150%', letterSpacing: '5%', fontSize: '18px' }}>
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

            {/* Поле: Номер телефона */}
            <div>
              <label htmlFor = "phoneNumber" className = "block mb-2" style = {{ color: '#000000', fontFamily: 'Montserrat', fontWeight: 'bold', lineHeight: '150%', letterSpacing: '5%', fontSize: '18px' }}>
                Номер телефона
              </label>
              <input
                type = "tel"
                id = "phoneNumber"
                name = "phoneNumber"
                value = {formData.phoneNumber}
                onChange = {handleChange}
                placeholder = "+7 (999) 123-45-67"
                className = {`w-full h-12 px-4 rounded-xl transition-all duration-200 ${
                  errors.phoneNumber 
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
                autoComplete = "tel"
              />
              {errors.phoneNumber && (
                <p className = "mt-1 text-sm text-red-500">{errors.phoneNumber}</p>
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
                {errors.birthDate && (
                  <p className = "mt-1 text-sm text-red-500">{errors.birthDate}</p>
                )}

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

            {/* Поле: Образовательная организация */}
            <div>
              <label htmlFor = "school" className = "block mb-2" style = {{ color: '#000000', fontFamily: 'Montserrat', fontWeight: 'bold', lineHeight: '150%', letterSpacing: '5%', fontSize: '18px' }}>
                Образовательная организация
              </label>
              <input
                type = "text"
                id = "school"
                name = "school"
                value = {formData.school}
                onChange = {handleChange}
                placeholder = "Введите название школы или организации"
                className = {`w-full h-12 px-4 rounded-xl transition-all duration-200 ${
                  errors.school
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
              {errors.school && (
                <p className = "mt-1 text-sm text-red-500">{errors.school}</p>
              )}
              <p className="mt-1 text-xs text-gray-500" style={{ fontFamily: 'Montserrat, sans-serif' }}>
                Например: КГПИ КемГУ, СибГИУ, МБОУ СОШ №18
              </p>
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
              {formData.password && !errors.password && (
                <div className = "mt-2">
                  <div className = "flex items-center space-x-2">
                    <span className = "text-xs text-gray-600">Сложность пароля:</span>
                    <div className = "flex space-x-1">
                      {(() => {
                        const hasUpperCase = /[A-Z]/.test(formData.password)
                        const hasLowerCase = /[a-z]/.test(formData.password)
                        const hasNumbers = /\d/.test(formData.password)
                        const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(formData.password)
                        
                        const metRequirements = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar].filter(Boolean).length
                        
                        return (
                          <>
                            <div className=  {`w-2 h-2 rounded-full ${metRequirements >= 1 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            <div className = {`w-2 h-2 rounded-full ${metRequirements >= 2 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            <div className = {`w-2 h-2 rounded-full ${metRequirements >= 3 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                            <div className = {`w-2 h-2 rounded-full ${metRequirements >= 4 ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Минимум 8 символов, включая 3 из 4: заглавные, строчные, цифры, символы
                  </p>
                </div>
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

            {/* Чекбокс согласия на обработку персональных данных (основной) */}
            <div className="mt-4">
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  name="dataProcessingConsent"
                  checked={formData.dataProcessingConsent}
                  onChange={handleChange}
                  className="mt-1 mr-3 cursor-pointer"
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: '#0808E4'
                  }}
                />
                <span style={{
                  color: '#000000',
                  fontFamily: 'Montserrat',
                  fontSize: '14px',
                  lineHeight: '150%'
                }}>
                  {formData.showParentFields ? (
                    <>
                      <span>Я даю согласие на обработку персональных данных несовершеннолетнего и своих данных как представителя на условиях и для целей, определенных в Согласии на обработку персональных данных в соответствии с Политикой в отношении обработки персональных данных работников и обучающихся.</span>
                      <span style={{ color: '#FF0000' }} title="Обязательное поле"> *</span>
                    </>
                  ) : (
                    <>
                      <span>Я даю согласие на обработку моих персональных данных на условиях и для целей, определенных в Согласии на обработку персональных данных в соответствии с Политикой в отношении обработки персональных данных работников и обучающихся.</span>
                      <span style={{ color: '#FF0000' }} title="Обязательное поле"> *</span>
                    </>
                  )}
                </span>
              </label>
              {errors.dataProcessingConsent && (
                <p className="mt-1 text-sm text-red-500">{errors.dataProcessingConsent}</p>
              )}
            </div>

            {/* Чекбокс согласия с политикой обработки персональных данных */}
            <div className="mt-4">
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  name="agreement"
                  checked={formData.agreement}
                  onChange={handleChange}
                  className="mt-1 mr-3 cursor-pointer"
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: '#0808E4'
                  }}
                />
                <span style={{
                  color: '#000000',
                  fontFamily: 'Montserrat',
                  fontSize: '14px',
                  lineHeight: '150%'
                }}>
                  <a
                    href="https://кгпи.рф/media/filer_public/34/32/3432e323-a6e2-46e1-a55c-70336d161768/politika_obrabotki_pdn_ot_26112025.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: '#0808E4',
                      textDecoration: 'underline'
                    }}
                  >
                    Я согласен с политикой в отношении обработки персональных данных Оператора.
                  </a>
                  <span style={{ color: '#FF0000' }} title="Обязательное поле"> *</span>
                </span>
              </label>
              {errors.agreement && (
                <p className="mt-1 text-sm text-red-500">{errors.agreement}</p>
              )}
            </div>

            {/* Чекбокс подтверждения возраста/ответственности */}
            <div className="mt-4">
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  name="ageConfirmation"
                  checked={formData.ageConfirmation}
                  onChange={handleChange}
                  className="mt-1 mr-3 cursor-pointer"
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: '#0808E4'
                  }}
                />
                <span style={{
                  color: '#000000',
                  fontFamily: 'Montserrat',
                  fontSize: '14px',
                  lineHeight: '150%'
                }}>
                  {formData.showParentFields ? (
                    <>
                      <span>Я подтверждаю, что являюсь законным представителем несовершеннолетнего и несу полную ответственность за достоверность предоставленных данных.</span>
                      <span style={{ color: '#FF0000' }} title="Обязательное поле"> *</span>
                    </>
                  ) : (
                    <>
                      <span>Я подтверждаю, что мне есть 18 лет и несу полную ответственность за достоверность предоставленных данных.</span>
                      <span style={{ color: '#FF0000' }} title="Обязательное поле"> *</span>
                    </>
                  )}
                </span>
              </label>
              {errors.ageConfirmation && (
                <p className="mt-1 text-sm text-red-500">{errors.ageConfirmation}</p>
              )}
            </div>

            {/* Чекбокс маркетингового согласия */}
            <div className="mt-4">
              <label className="flex items-start cursor-pointer">
                <input
                  type="checkbox"
                  name="marketingConsent"
                  checked={formData.marketingConsent}
                  onChange={handleChange}
                  className="mt-1 mr-3 cursor-pointer"
                  style={{
                    width: '18px',
                    height: '18px',
                    accentColor: '#0808E4'
                  }}
                />
                <span style={{
                  color: '#000000',
                  fontFamily: 'Montserrat',
                  fontSize: '14px',
                  lineHeight: '150%'
                }}>
                  {formData.showParentFields ? (
                    <>
                      <span>Я выражаю отдельное согласие на обработку указанных мной персональных данных несовершеннолетнего (e-mail, телефон) в целях направления на указанные контакты рекламной и информационной рассылки о мероприятиях и услугах Оператора. Данное согласие действует до его отзыва мной.</span>
                      <span style={{ color: '#FF0000' }} title="Обязательное поле"> *</span>
                    </>
                  ) : (
                    <>
                      <span>Я выражаю отдельное согласие на обработку указанных мною персональных данных (e-mail, телефон) в целях направления на указанные контакты рекламной и информационной рассылки о мероприятиях и услугах Оператора. Данное согласие действует до его отзыва мною.</span>
                      <span style={{ color: '#FF0000' }} title="Обязательное поле"> *</span>
                    </>
                  )}
                </span>
              </label>
              {errors.marketingConsent && (
                <p className="mt-1 text-sm text-red-500">{errors.marketingConsent}</p>
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
                padding: '14px 24px',
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
                copyTokenToClipboard()
              }}
              onTouchStart={() => {
                copyTokenToClipboard()
              }}
              style = {{
                border: '2px solid #BEE500',
                borderRadius: '10px',
                padding: '15px',
                backgroundColor: 'white',
                width: '100%',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                position: 'relative',
                WebkitUserSelect: 'none',
                userSelect: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
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
                userSelect: 'all',
                flex: 1,
                marginRight: '10px'
              }}>
                {verificationToken}
              </p>
              <img 
                src={copyIcon} 
                alt="Копировать" 
                style={{
                  width: '40px',
                  height: '58px',
                  opacity: 0.6,
                  transition: 'opacity 0.2s ease'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.6'}
              />
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
                navigate('/login')
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
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Модальное окно подтверждения возраста/ответственности */}
      {showAgeConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[20px] px-6 py-6 w-full mx-4 relative" style={{ border: '3px solid #0808E4', maxWidth: formData.showParentFields ? '650px' : '600px', maxHeight: '250px'}}>
            {/* Кнопка закрытия (крестик) */}
            <button
              onClick={handleDeclineAgeConfirm}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '2px solid #8484F2',
                backgroundColor: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                color: '#0808E4',
                padding: 0
              }}
              title="Закрыть"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F0F0FF'
                e.currentTarget.style.borderColor = '#0808E4'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white'
                e.currentTarget.style.borderColor = '#8484F2'
              }}
            >
              ×
            </button>

            {/* Заголовок (обрезанный) */}
            <h2 className="mb-2" style={{
              textAlign: 'left',
              color: '#000000',
              fontFamily: 'Montserrat',
              fontSize: '15px',
              lineHeight: '150%',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              padding: '0 10px'
            }}>
              {formData.showParentFields ? (
                'Я подтверждаю, что являюсь законным представителем несовершеннолетнего и несу полную о'
              ) : (
                'Я подтверждаю, что мне есть 18 лет и несу полную о'
              )}
            </h2>

            {/* Синяя линия под заголовком */}
            <div style={{
              width: '100%',
              height: '2px',
              backgroundColor: '#0808E4',
              marginBottom: '16px'
            }} />

            {/* Полный текст подтверждения */}
            <div className="mb-6" style={{
              color: '#000000',
              fontFamily: 'Montserrat',
              fontSize: '14px',
              lineHeight: '150%',
              padding: '0 12px 12px'
            }}>
              {formData.showParentFields ? (
                <p>Я подтверждаю, что являюсь законным представителем несовершеннолетнего и несу полную ответственность за достоверность предоставленных данных.</p>
              ) : (
                <p>Я подтверждаю, что мне есть 18 лет и несу полную ответственность за достоверность предоставленных данных.</p>
              )}
            </div>

            {/* Кнопки */}
            <div className="flex justify-center gap-4" style={{ padding: '2px 0 0' }}>
              <button
                type="button"
                onClick={handleAcceptAgeConfirm}
                className="font-semibold transition-all duration-300"
                style={{
                  backgroundColor: '#0808E4',
                  border: '2px solid #0808E4',
                  borderRadius: '10px',
                  color: 'white',
                  fontFamily: 'Montserrat',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  padding: '12px 24px',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#0606B4'
                  e.currentTarget.style.borderColor = '#0606B4'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#0808E4'
                  e.currentTarget.style.borderColor = '#0808E4'
                }}
              >
                Принимаю
              </button>
              <button
                type="button"
                onClick={handleDeclineAgeConfirm}
                className="font-semibold transition-all duration-300"
                style={{
                  backgroundColor: 'white',
                  border: '2px solid #8484F2',
                  borderRadius: '10px',
                  color: '#0808E4',
                  fontFamily: 'Montserrat',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  padding: '12px 24px',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F0F0FF'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white'
                }}
              >
                Не принимаю
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно маркетингового согласия */}
      {showMarketingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[20px] px-6 py-6 w-full mx-4 relative" style={{ border: '3px solid #0808E4', maxWidth: '500px' }}>
            {/* Кнопка закрытия (крестик) */}
            <button
              onClick={handleDeclineMarketing}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: '2px solid #8484F2',
                backgroundColor: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                color: '#0808E4',
                padding: 0
              }}
              title="Закрыть"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F0F0FF'
                e.currentTarget.style.borderColor = '#0808E4'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white'
                e.currentTarget.style.borderColor = '#8484F2'
              }}
            >
              ×
            </button>

            {/* Кнопки */}
            <div className="flex justify-center gap-4" style={{ padding: '4px 0 0' }}>
              <button
                type="button"
                onClick={handleAcceptMarketing}
                className="font-semibold transition-all duration-300"
                style={{
                  backgroundColor: '#0808E4',
                  border: '2px solid #0808E4',
                  borderRadius: '10px',
                  color: 'white',
                  fontFamily: 'Montserrat',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  padding: '12px 24px',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#0606B4'
                  e.currentTarget.style.borderColor = '#0606B4'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#0808E4'
                  e.currentTarget.style.borderColor = '#0808E4'
                }}
              >
                Принимаю
              </button>
              <button
                type="button"
                onClick={handleDeclineMarketing}
                className="font-semibold transition-all duration-300"
                style={{
                  backgroundColor: 'white',
                  border: '2px solid #8484F2',
                  borderRadius: '10px',
                  color: '#0808E4',
                  fontFamily: 'Montserrat',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  padding: '12px 24px',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F0F0FF'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white'
                }}
              >
                Не принимаю
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно согласия на обработку персональных данных */}
      {showDataProcessingModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-[20px] px-6 py-6 w-full mx-4 relative" style={{ border: '3px solid #0808E4', maxWidth: '650px', maxHeight: '80vh', overflow: 'auto' }}>
            {/* Кнопка закрытия (крестик) */}
            <button
              onClick={handleDeclineDataProcessing}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                width: '28px',
                height: '28px',
                borderRadius: '50%',
                border: '2px solid #8484F2',
                backgroundColor: 'white',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                color: '#0808E4',
                padding: 0
              }}
              title="Закрыть"
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#F0F0FF'
                e.currentTarget.style.borderColor = '#0808E4'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'white'
                e.currentTarget.style.borderColor = '#8484F2'
              }}
            >
              ×
            </button>

            {/* Заголовок */}
            <h2 style={{
              color: '#000000',
              fontFamily: 'Montserrat',
              fontWeight: 'bold',
              fontSize: '16px',
              lineHeight: '150%',
              textAlign: 'left',
              padding: '0 40px 8px 0',
              borderBottom: '2px solid #0808E4',
              marginBottom: '16px'
            }}>
              Согласие на обработку персональных данных
            </h2>

            {/* Текст соглашения */}
            <div 
              ref={dataProcessingRef}
              className="mb-4" 
              onScroll={handleDataProcessingScroll}
              style={{
                color: '#000000',
                fontFamily: 'Montserrat',
                fontSize: '13px',
                lineHeight: '150%',
                padding: '0 12px 12px',
                maxHeight: '45vh',
                overflow: 'auto'
              }}
            >
              <p style={{ marginBottom: '12px', fontSize: '14px' }}>Согласие на обработку персональных данных</p>
              <p style={{ marginBottom: '12px' }}>Настоящим я</p>
              {formData.showParentFields ? (
                <p style={{ marginBottom: '12px' }}>являясь законным представителем несовершеннолетнего, даю согласие на обработку его персональных данных и своих данных как представителя</p>
              ) : (
                <p style={{ marginBottom: '12px' }}>даю согласие на обработку своих персональных данных</p>
              )}
              <p style={{ marginBottom: '12px' }}>федеральному государственному бюджетному образовательному учреждению высшего образования «Кемеровский государственный университет» (КемГУ) (ОГРН 1034205005801, ИНН 4207017537), зарегистрированному по адресу: 650000, Россия, Кемеровская область – Кузбасс, г. Кемерово, ул. Красная, д. 6 (далее – Оператор), на обработку своих персональных данных на следующих условиях:</p>
              
              <p style={{ marginBottom: '8px' }}>1. Перечень обрабатываемых персональных данных:</p>
              {formData.showParentFields ? (
                <p style={{ marginBottom: '8px', paddingLeft: '12px' }}>Статус регистрирующегося;<br/>Фамилия, имя, отчество;<br/>E-mail;<br/>Фамилия, имя, отчество несовершеннолетнего;<br/>Наименование образовательной организации;<br/>Населенный пункт;<br/>Класс/курс.</p>
              ) : (
                <p style={{ marginBottom: '8px', paddingLeft: '12px' }}>Статус регистрирующегося;<br/>Фамилия, имя, отчество;<br/>E-mail;<br/>Наименование образовательной организации;<br/>Населенный пункт;<br/>Класс/курс.</p>
              )}
              
              <p style={{ marginBottom: '8px' }}>2. Цели обработки персональных данных:</p>
              <p style={{ marginBottom: '8px', paddingLeft: '12px' }}>регистрация и участие в мероприятии;<br/>проведение опроса/анкетирования;<br/>отправка наградных документов, информационных и рекламных материалов;<br/>обработка запросов и обращений.</p>
              
              <p style={{ marginBottom: '8px' }}>3. Перечень действий с персональными данными:</p>
              <p style={{ marginBottom: '8px', paddingLeft: '12px' }}>Совершение любых действий, необходимых для достижения целей обработки, включая: сбор, запись, систематизацию, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, обезличивание, удаление, уничтожение данных.</p>
              
              <p style={{ marginBottom: '8px' }}>4. Способы обработки:</p>
              <p style={{ marginBottom: '8px', paddingLeft: '12px' }}>Обработка может осуществляться как с использованием средств автоматизации, так и без их использования.</p>
              
              <p style={{ marginBottom: '8px' }}>5. Срок действия согласия:</p>
              <p style={{ marginBottom: '8px', paddingLeft: '12px' }}>Согласие действует в течение 5 лет/месяцев с момента его предоставления. По истечении указанного срока согласие считается автоматически отозванным, а Оператор обязан уничтожить мои персональные данные, если иное не предусмотрено законодательством РФ.</p>
              
              <p style={{ marginBottom: '8px' }}>6. Обработка персональных данных третьими лицами:</p>
              <p style={{ marginBottom: '8px', paddingLeft: '12px' }}>Я осведомлен(а), что Оператор вправе поручить обработку моих персональных данных третьим лицам, в том числе ООО «1С-Битрикс» (ОГРН 5077746476209), при условии соблюдения ими конфиденциальности и обеспечения безопасности данных.</p>
              
              <p style={{ marginBottom: '8px' }}>7. Права субъекта персональных данных:</p>
              <p style={{ paddingLeft: '12px' }}>Мне разъяснены мои права, предусмотренные ст. 14 Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных», в том числе право на отзыв настоящего согласия путем направления письменного заявления по адресу Оператора или на электронную почту: opo@khpi.ru.</p>
            </div>

            {/* Подсказка прокрутки */}
            {!dataProcessingScrolled && (
              <div 
                onClick={handleScrollToBottom}
                onMouseEnter={() => setDataProcessingHover(true)}
                onMouseLeave={() => setDataProcessingHover(false)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '8px 0',
                  marginBottom: '12px',
                  cursor: 'pointer',
                  backgroundColor: dataProcessingHover ? '#F0F0FF' : 'transparent',
                  borderRadius: '8px',
                  transition: 'background-color 0.2s ease'
                }}
              >
                <p style={{
                  color: dataProcessingHover ? '#0606B4' : '#0808E4',
                  fontFamily: 'Montserrat',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  marginBottom: '4px',
                  transition: 'color 0.2s ease'
                }}>Прочитайте до конца</p>
                <div style={{ display: 'flex', gap: '2px' }}>
                  <div style={{
                    width: 0,
                    height: 0,
                    borderLeft: '4px solid transparent',
                    borderRight: '4px solid transparent',
                    borderTop: `6px solid ${dataProcessingHover ? '#0606B4' : '#0808E4'}`,
                    transition: 'border-top-color 0.2s ease'
                  }}></div>
                  <div style={{
                    width: 0,
                    height: 0,
                    borderLeft: '4px solid transparent',
                    borderRight: '4px solid transparent',
                    borderTop: `6px solid ${dataProcessingHover ? '#0606B4' : '#0808E4'}`,
                    transition: 'border-top-color 0.2s ease'
                  }}></div>
                  <div style={{
                    width: 0,
                    height: 0,
                    borderLeft: '4px solid transparent',
                    borderRight: '4px solid transparent',
                    borderTop: `6px solid ${dataProcessingHover ? '#0606B4' : '#0808E4'}`,
                    transition: 'border-top-color 0.2s ease'
                  }}></div>
                </div>
              </div>
            )}

            {/* Кнопки */}
            <div className="flex justify-center gap-4" style={{ 
              padding: '4px 0 0',
              opacity: dataProcessingScrolled ? 1 : 0.3,
              pointerEvents: dataProcessingScrolled ? 'auto' : 'none',
              transition: 'opacity 0.3s ease'
            }}>
              <button
                type="button"
                onClick={handleAcceptDataProcessing}
                className="font-semibold transition-all duration-300"
                style={{
                  backgroundColor: '#0808E4',
                  border: '2px solid #0808E4',
                  borderRadius: '10px',
                  color: 'white',
                  fontFamily: 'Montserrat',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  padding: '12px 24px',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#0606B4'
                  e.currentTarget.style.borderColor = '#0606B4'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#0808E4'
                  e.currentTarget.style.borderColor = '#0808E4'
                }}
              >
                Принимаю
              </button>
              <button
                type="button"
                onClick={handleDeclineDataProcessing}
                className="font-semibold transition-all duration-300"
                style={{
                  backgroundColor: 'white',
                  border: '2px solid #8484F2',
                  borderRadius: '10px',
                  color: '#0808E4',
                  fontFamily: 'Montserrat',
                  fontWeight: 'bold',
                  fontSize: '14px',
                  padding: '12px 24px',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#F0F0FF'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white'
                }}
              >
                Не принимаю
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Registration
