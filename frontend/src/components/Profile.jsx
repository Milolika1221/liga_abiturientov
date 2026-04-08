import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import '../styles/ProfileStyles.css';
import avatar from '../assets/user-image-l@2x.png'
import documentplaceholder from '../assets/elementor-placeholder-image.png'
import khpi from '../assets/logo_of_1x.png'
import LA from '../assets/Лого ЛА (без кгпи кемгу).png'
import LA2 from '../assets/Лого ЛА.png'
import lol from '../assets/Lol.png'
import msg from '../assets/Message_alt_fill.png'
import book from '../assets/Book_check_fill.png'
import chart from '../assets/Chart_fill.png'
import paper from '../assets/Paper_alt_fill.png'
import mortar from '../assets/Mortarboard_fill.png'
import uploadIcon from '../assets/126477.png'
import textVerify from '../assets/TextVerify.png'
import blueLine from '../assets/blue_line.png'
import copyIcon from '../assets/copy.png'

// Определяем API_URL в зависимости от того, где запущено приложение
const getApiUrl = () => {
  const hostname = window.location.hostname;
  const port = window.location.port;
  
  // Если это localhost - используем localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }
  
  // Если это IP адрес или любой другой хост - используем текущий хост
  // Это позволит работать с динамическими IP и ngrok
  return `http://${hostname}:3000`;
};

const API_URL = getApiUrl();

const getFileType = (filePath) => {
  if (!filePath) return 'unknown';
  const extension = filePath.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png'].includes(extension)) return 'image';
  if (extension === 'pdf') return 'pdf';
  return 'unknown';
};

const getFileUrl = (filePath) => {
  if (!filePath) return null;
  if (filePath.startsWith('http')) return filePath;
  return `${API_URL}${filePath}`;
};

const getThumbnailUrl = (filePath, width, height) => {
  if (!filePath) return null;
  if (filePath.startsWith('http')) return filePath;
  const previewWidth = width || 800;
  const previewHeight = height || 800;
  return `${API_URL}/thumbnail?file=${encodeURIComponent(filePath)}&width=${previewWidth}&height=${previewHeight}`;
};

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

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

const DocumentPreview = React.memo(({ filePath }) => {
  const fileType = getFileType(filePath);
  const fileUrl = getFileUrl(filePath);
  const thumbUrl = getThumbnailUrl(filePath, 800, 800);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    setIsLoading(true);
  }, [filePath]);

  if (fileType === 'image' && thumbUrl) {
    return (
      <div className="document__preview-wrapper">
        {isLoading && (
          <img 
            src={documentplaceholder} 
            alt="Loading..." 
            className="document__image" 
            fetchpriority="high"
            style={{ position: 'absolute', top: 0, left: 0 }}
          />
        )}
        <img 
          src={thumbUrl} 
          alt="Document" 
          className="document__image" 
          onLoad={() => setIsLoading(false)}
          loading="eager"
          decoding="async"
          fetchpriority="high"
          style={{ opacity: isLoading ? 0 : 1, transition: 'opacity 0.2s' }}
        />
        <div className="document__preview-overlay" />
      </div>
    );
  }

  if (fileType === 'pdf' && fileUrl) {
    return (
      <div className="document__preview-wrapper document__preview-wrapper--pdf">
        {isLoading && (
          <img 
            src={documentplaceholder} 
            alt="Loading..." 
            className="document__image" 
            style={{ position: 'absolute', top: 0, left: 0, zIndex: 1 }}
          />
        )}
        <iframe
          src={`${fileUrl}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&view=FitH`}
          className="document__pdf-preview"
          title="PDF Preview"
          onLoad={() => setIsLoading(false)}
          style={{ opacity: isLoading ? 0 : 1 }}
        />
        <div className="document__preview-overlay" />
      </div>
    );
  }

  return (
    <div className="document__preview-wrapper">
      <img src={documentplaceholder} alt="Document" className="document__image" />
      <div className="document__preview-overlay" />
    </div>
  );
}, (prevProps, nextProps) => prevProps.filePath === nextProps.filePath);

const Profile = () => {

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const categoriesRef = React.useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  // Состояния для модального окна просмотра документов
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [isDocumentModalOpen, setIsDocumentModalOpen] = useState(false);

  // Состояния для модального окна загрузки документов
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [documentTitle, setDocumentTitle] = useState('');
  const [receiptDate, setReceiptDate] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadErrors, setUploadErrors] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [uploadGlobalError, setUploadGlobalError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef(null);

  // Состояния для модального окна подтверждения аккаунта
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [isAlreadyVerifiedModalOpen, setIsAlreadyVerifiedModalOpen] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');
  const [copyNotification, setCopyNotification] = useState(false);
  const [isGeneratingToken, setIsGeneratingToken] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    full_name: '',
    school: '',
    class_course: '',
    email: '',
    phone_number: ''
  });
  const [editErrors, setEditErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [editSuccess, setEditSuccess] = useState(false);

  // Состояние для данных профиля с сервера
  const [profileData, setProfileData] = useState(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [userPosition, setUserPosition] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userDocuments, setUserDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    localStorage.removeItem('sessionTime');
    navigate('/login');
  };

  // Открыть модальное окно просмотра документа
  const openDocumentModal = useCallback((doc) => {
    setSelectedDocument(doc);
    setIsDocumentModalOpen(true);
    document.body.style.overflow = 'hidden';
  }, []);

  // Закрыть модальное окно просмотра документа
  const closeDocumentModal = () => {
    setIsDocumentModalOpen(false);
    setSelectedDocument(null);
    document.body.style.overflow = 'auto';
  };

  // Валидирует форму загрузки документа (название, дата, файл)
  const validateUploadForm = () => {
    const errors = {};

    if (!documentTitle.trim()) {
      errors.title = 'Введите название документа';
    } else if (documentTitle.trim().length < 2) {
      errors.title = 'Название должно содержать минимум 2 символа';
    } else if (documentTitle.trim().length > 45) {
      errors.title = 'Название должно содержать не более 45 символов';
    }

    if (!receiptDate) {
      errors.date = 'Выберите дату получения';
    } else {
      // Создаем даты в UTC для корректного сравнения без учета часовых поясов
      const selectedDate = new Date(receiptDate + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate.getTime() > today.getTime()) {
        errors.date = 'Дата не может быть в будущем';
      }
    }

    if (!selectedFile) {
      errors.file = 'Выберите файл для загрузки';
    } else {
      const validFormats = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!validFormats.includes(selectedFile.type)) {
        errors.file = 'Поддерживаемые форматы: JPEG, JPG, PNG, PDF';
      }
      if (selectedFile.size > 15 * 1024 * 1024) {
        errors.file = 'Размер файла не должен превышать 15 МБ';
      }
    }

    setUploadErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const openUploadModal = () => {
    setIsUploadModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeUploadModal = () => {
    if (isUploading) return;
    setIsUploadModalOpen(false);
    resetUploadForm();
    document.body.style.overflow = 'auto';
  };

  const resetUploadForm = () => {
    setDocumentTitle('');
    setReceiptDate('');
    setSelectedFile(null);
    setUploadErrors({});
    setUploadSuccess(false);
    setUploadGlobalError('');
    setIsDragging(false);
  };

  // Обрабатывает выбор файла (валидация формата и размера)
  const handleFileSelect = (file) => {
    setUploadGlobalError('');
    if (file) {
      const validFormats = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      if (!validFormats.includes(file.type)) {
        setUploadErrors(prev => ({ ...prev, file: 'Поддерживаемые форматы: JPEG, JPG, PNG, PDF' }));
        return;
      }
      if (file.size > 15 * 1024 * 1024) {
        setUploadErrors(prev => ({ ...prev, file: 'Размер файла не должен превышать 15 МБ' }));
        return;
      }
      setSelectedFile(file);
      setUploadErrors(prev => ({ ...prev, file: null }));
    }
  };

  // Обрабатывает выбор файла через input
  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    handleFileSelect(file);
  };


  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Отправляет документ на сервер
  const handleUploadSubmit = async () => {
    if (!validateUploadForm()) return;

    setIsUploading(true);
    setUploadGlobalError('');

    try {
      // Создаем FormData для отправки файла
      const formData = new FormData();
      formData.append('document_name', documentTitle);
      formData.append('category_id', null);
      formData.append('received_date', receiptDate);
      formData.append('file', selectedFile);

      const response = await fetch(`${API_URL}/documents/upload`, {
        method: 'POST',
        headers: {
          'x-user-id': profileData.user_id
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Ошибка при загрузке документа на сервер');
      }

      const newDocument = {
        document_id: data.documentId,
        document_name: documentTitle,
        status: 'На рассмотрении',
        points: 0,
        category_id: null,
        comment: null,
        received_date: receiptDate,
        file_path: data.file_path
      };

      setUserDocuments(prevDocs => [newDocument, ...prevDocs]);

      setUploadSuccess(true);
      setTimeout(() => {
        closeUploadModal();
      }, 2000);

    } catch (err) {
      console.error('Ошибка отправки документа:', err);
      setUploadGlobalError(err.message || 'Не удалось отправить документ. Попробуйте позже.');
    } finally {
      setIsUploading(false);
    }
  };

  // Открыть модальное окно редактирования профиля
  const openEditModal = () => {
    setEditFormData({
      full_name: profileData?.full_name || '',
      school: profileData?.school || '',
      class_course: profileData?.class_course || '',
      email: profileData?.email || '',
      phone_number: formatPhoneNumber(profileData?.phone_number || '')
    });
    setEditErrors({});
    setEditSuccess(false);
    setIsEditModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  // Закрыть модальное окно редактирования профиля
  const closeEditModal = () => {
    if (isSaving) return;
    setIsEditModalOpen(false);
    document.body.style.overflow = 'auto';
  };

  // Валидация формы редактирования профиля
  const validateEditForm = () => {
    const errors = {};
    if (!editFormData.full_name.trim()) {
      errors.full_name = 'Введите ФИО';
    } else if (editFormData.full_name.trim().length < 3) {
      errors.full_name = 'ФИО должно содержать минимум 3 символа';
    }

    if (!editFormData.class_course) {
      errors.class_course = 'Введите класс/курс';
    } else if (isNaN(editFormData.class_course) || editFormData.class_course < 1 || editFormData.class_course > 11) {
      errors.class_course = 'Класс/курс должен быть числом от 1 до 11';
    }
    if (!editFormData.email.trim()) {
      errors.email = 'Введите email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editFormData.email)) {
      errors.email = 'Введите корректный email';
    }
    if (!editFormData.phone_number.trim()) {
      errors.phone_number = 'Введите номер телефона';
    } else {
      const digitsOnly = editFormData.phone_number.replace(/\D/g, '');
      if (digitsOnly.length !== 11) {
        errors.phone_number = 'Номер телефона должен содержать ровно 11 цифр';
      }
    }
    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validateFieldOnChange = (name, value) => {
    let error = null;
    
    if (name === 'email') {
      if (!value.trim()) {
        error = 'Введите email';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        error = 'Введите корректный email (например: user@example.com)';
      }
    }
    
    if (name === 'phone_number') {
      const digitsOnly = value.replace(/\D/g, '');
      if (!value.trim()) {
        error = 'Введите номер телефона';
      } else if (digitsOnly.length !== 11) {
        error = 'Номер телефона должен содержать ровно 11 цифр';
      }
    }
    
    setEditErrors(prev => ({ ...prev, [name]: error }));
  };

  // Сохранить изменения профиля
  const handleSaveProfile = async () => {
    // Проверяем есть ли активные ошибки валидации
    if (editErrors.email || editErrors.phone_number) {
      return;
    }
    if (!validateEditForm()) return;
    if (!profileData?.user_id) return;

    setIsSaving(true);
    try {
      const response = await fetch(`${API_URL}/profile/${profileData.user_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': profileData.user_id
        },
        body: JSON.stringify({
          full_name: editFormData.full_name.trim(),
          school: editFormData.school.trim(),
          class_course: parseInt(editFormData.class_course),
          email: editFormData.email.trim(),
          phone_number: editFormData.phone_number.trim()
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Ошибка при сохранении профиля');
      }

      // Обновляем локальные данные профиля
      setProfileData(prev => ({
        ...prev,
        full_name: data.user.full_name,
        school: data.user.school,
        class_course: data.user.class_course,
        email: data.user.email,
        phone_number: data.user.phone_number
      }));

      setEditSuccess(true);
      setTimeout(() => {
        closeEditModal();
      }, 1500);
    } catch (err) {
      console.error('Ошибка сохранения профиля:', err);
      setEditErrors(prev => ({ ...prev, global: err.message || 'Не удалось сохранить изменения' }));
      setIsSaving(false);
    }
  };

  // Обработчик нажатия кнопки подтверждения аккаунта
  const handleVerifyButtonClick = async () => {
    // Если пользователь уже подтвержден, показываем модальное окно
    if (profileData?.is_verified) {
      setIsAlreadyVerifiedModalOpen(true);
      document.body.style.overflow = 'hidden';
      return;
    }

    // Открываем модальное окно и генерируем токен
    setVerifyError('');
    setVerificationToken('');
    openVerifyModal();
    
    // Генерируем токен
    await generateVerificationToken();
  };

  // Закрыть модальное окно "уже подтвержден"
  const closeAlreadyVerifiedModal = () => {
    setIsAlreadyVerifiedModalOpen(false);
    document.body.style.overflow = 'auto';
  };

  // Открыть модальное окно подтверждения аккаунта
  const openVerifyModal = () => {
    setIsVerifyModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  // Закрыть модальное окно подтверждения аккаунта
  const closeVerifyModal = () => {
    if (isGeneratingToken) return;
    setIsVerifyModalOpen(false);
    document.body.style.overflow = 'auto';
  };

  // Генерация токена верификации
  const generateVerificationToken = async () => {
    setIsGeneratingToken(true);
    setVerifyError('');
    
    try {
      const currentUserId = localStorage.getItem('userId');
      const response = await fetch(`${API_URL}/generate-verification-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUserId
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Ошибка при генерации токена');
      }

      setVerificationToken(data.token);
    } catch (err) {
      console.error('Ошибка генерации токена:', err);
      setVerifyError(err.message || 'Не удалось сгенерировать токен. Попробуйте позже.');
    } finally {
      setIsGeneratingToken(false);
    }
  };

  // Копировать токен в буфер обмена
  const copyTokenToClipboard = () => {
    if (!verificationToken) return;
    
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(verificationToken).then(() => {
        setCopyNotification(true);
        setTimeout(() => setCopyNotification(false), 2000);
      }).catch(() => {
        fallbackCopyTextToClipboard();
      });
    } else {
      fallbackCopyTextToClipboard();
    }
  };

  // Fallback копирование для незащищенного контекста
  const fallbackCopyTextToClipboard = () => {
    const textArea = document.createElement('textarea');
    textArea.value = verificationToken;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      setCopyNotification(true);
      setTimeout(() => setCopyNotification(false), 2000);
    } catch (err) {
      console.error('Не удалось скопировать текст: ', err);
    }
    document.body.removeChild(textArea);
  };

  // Проверка интернет-подключения
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true)
    }

    const handleOffline = () => {
      setIsOnline(false)
      setError('Соединение с интернетом потеряно. Проверьте подключение.')
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }

  }, [])

  // Проверка сессии - выход если истекло время
  useEffect(() => {
    const checkSessionTimeout = () => {
      const sessionTime = localStorage.getItem('sessionTime')
      
      if (sessionTime) {
        const sessionDate = new Date(sessionTime)
        const now = new Date()
        const diffMs = now - sessionDate
        const SESSION_TIMEOUT_MINUTES = 240
        const timeoutMs = SESSION_TIMEOUT_MINUTES * 60 * 1000
        
        // Если сессия истекла - выходим
        if (diffMs > timeoutMs) {
          localStorage.removeItem('user')
          localStorage.removeItem('userId')
          localStorage.removeItem('sessionTime')
          navigate('/login')
        }
      } else {
        // Нет sessionTime - значит не авторизован
        navigate('/login')
      }
    }
    
    // Проверяем сразу при загрузке
    checkSessionTimeout()
    
    // И проверяем каждую минуту
    const interval = setInterval(checkSessionTimeout, 60000)
    
    return () => clearInterval(interval)
  }, [navigate])

  // Функция проверки интернет-подключения перед запросом
  const checkInternetConnection = () => {

    if (!navigator.onLine) {
      setError('Отсутствует подключение к интернету. Проверьте соединение.')
      return false
    }
    return true
  }

  // Получаем login из URL параметров или localStorage
  const searchParams = new URLSearchParams(location.search);
  const userStr = localStorage.getItem('user');
  const userObj = userStr ? JSON.parse(userStr) : null;
  const login = searchParams.get('login') || userObj?.login;

  // Загрузка данных профиля при монтировании компонента
  useEffect(() => {
    const fetchProfile = async () => {
      if (!login) {
        // Перенаправляем на страницу входа, если нет логина
        setTimeout(() => {
          navigate('/login');
        }, 2000);
        return;
      }

      // Проверка интернет-подключения
      if (!checkInternetConnection()) {
        setLoading(false);
        return;
      }
      const currentUserId = localStorage.getItem('userId');
      try {
        // Загружаем данные профиля
        const profileResponse = await fetch(`${API_URL}/profile-by-login/${login}`, {
          headers: { 'x-user-id': currentUserId }
        });

        if (!profileResponse.ok) {
          throw new Error('Ошибка при загрузке профиля');
        }

        const profileData = await profileResponse.json();
        setProfileData(profileData);

        // Загружаем общую сумму баллов
        if (profileData.user_id) {
          const pointsResponse = await fetch(`${API_URL}/profile/${profileData.user_id}/total-points`);
          if (pointsResponse.ok) {
            const pointsData = await pointsResponse.json();
            setTotalPoints(pointsData.total_points || 0);
          }      

          // Загружаем позицию в таблице лидеров
          const leaderboardResponse = await fetch(`${API_URL}/leaderboard`);
          if (leaderboardResponse.ok) {
            const leaderboardData = await leaderboardResponse.json();
            const position = leaderboardData.findIndex(l => l.user_id === profileData.user_id) + 1;
            setUserPosition(position > 0 ? position : null);
          }

          // Загружаем документы пользователя
          const docsResponse = await fetch(`${API_URL}/user-documents/${profileData.user_id}`, {
            headers: { 'x-user-id': currentUserId }
          });
          if (docsResponse.ok) {
            const docsData = await docsResponse.json();
            setUserDocuments(docsData || []);
          }
          const categoriesResponse = await fetch(`${API_URL}/categories`);

          if (categoriesResponse.ok) {
            const catData = await categoriesResponse.json();
            setCategories([
              { id: 'all', name: 'Все документы' },
              ...catData.map(c => ({
                id: c.category_id,
                name: c.category_name
              }))
            ]);
          }
        }

        setDocumentsLoading(false);

      } catch (err) {
        console.error('Ошибка загрузки профиля:', err);
        setError('Не удалось загрузить данные профиля');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [login]);

  // WebSocket для обновления документов в реальном времени
  React.useEffect(() => {
    if (!profileData?.user_id) return;

    const wsUrl = API_URL.replace('http://', 'ws://').replace('https://', 'wss://');
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      console.log('WebSocket подключен');
      // Отправляем user_id для подписки на обновления документов
      ws.send(JSON.stringify({ type: 'subscribe_user_documents', user_id: profileData.user_id }));
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'user_documents_update') {
          // Полное обновление списка документов от сервера
          console.log('Получено обновление документов:', data.documents);
          setUserDocuments(data.documents || []);

          // Пересчитываем баллы из обновленных документов
          const approvedDocs = (data.documents || []).filter(d => d.status === 'Одобрено');
          const total = approvedDocs.reduce((sum, d) => sum + (parseInt(d.points) || 0), 0);
          setTotalPoints(total);
        }
        
        // Обновление статуса верификации аккаунта
        if (data.type === 'user_verified') {
          console.log('Получено подтверждение верификации:', data);
          setProfileData(prev => ({
            ...prev,
            is_verified: true
          }));
          // Закрываем модальное окно верификации если открыто
          setIsVerifyModalOpen(false);
          // Можно показать уведомление
          alert('✅ Ваш аккаунт успешно подтвержден!');
        }
      } catch (err) {
        console.error('Ошибка обработки WebSocket сообщения:', err);
      }
    };

    ws.onerror = (error) => {
      console.error('WebSocket ошибка:', error);
    };

    ws.onclose = () => {
      console.log('WebSocket отключен');
    };

    return () => {
      ws.close();
    };
  }, [profileData?.user_id]);

  // Данные профиля
  const profile = {
    name: profileData?.full_name || '—',
    email: profileData?.email || '—',
    school: profileData?.school ? `Школа: ${profileData.school}` : 'Школа: —',
    totalPoints: totalPoints ?? '—',
    position: userPosition ?? '—',
    age: profileData?.birth_date ? calculateAge(profileData.birth_date) : '—',
    accountStatus: profileData?.is_verified ? 'Подтверждённая' : 'Не подтверждённая',
    avatar: avatar,
    classCourse: profileData?.class_course ?? '—',
    phone: profileData?.phone_number || ''
  };

  // Функция расчета возраста из даты рождения
  function calculateAge(birthDate) {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  }

  const navLinks = [
    { id: 1, title: 'Профиль', active: true },
    { id: 2, title: 'Таблица лидеров', active: false },
    { id: 3, title: 'О проекте', active: false, url: 'https://school.khpi.ru/liga_abitur/' },
    { id: 4, title: 'Контакты', active: false, url: 'https://taplink.cc/khpi' },
  ];

  const [categories, setCategories] = useState([{ id: 'all', name: 'Все документы' }]);
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [activeNavId, setActiveNavId] = useState(navLinks.find(l => l.active)?.id || 1);

  // Фильтрация документов по категории
  const filteredDocuments = userDocuments.filter(doc => {
    if (activeCategoryId === 'all') return true; // Все документы
    return String(doc.category_id) === String(activeCategoryId);
  });

  // Получение названия активной категории
  const activeCategoryName = categories.find(c => c.id === activeCategoryId)?.name || 'Все документы';

  const handleCategoryClick = (id) => {
    setActiveCategoryId(id);
    const categoriesContainer = categoriesRef.current;

    if (categoriesContainer) {
      const categoryButtons = categoriesContainer.querySelectorAll('.category-button');
      const targetCategory = categories.find(c => c.id === id);

      const targetButton = Array.from(categoryButtons).find(btn =>
          btn.textContent === targetCategory?.name
      );

      if (targetButton) {
        const containerRect = categoriesContainer.getBoundingClientRect();
        const buttonRect = targetButton.getBoundingClientRect();
        const buttonLeft = buttonRect.left - containerRect.left;
        const buttonCenter = buttonLeft + buttonRect.width / 2;
        const containerCenter = containerRect.width / 2;

        const scrollLeft = categoriesContainer.scrollLeft + (buttonCenter - containerCenter);

        categoriesContainer.scrollTo({
          left: scrollLeft,
          behavior: 'smooth'
        });
      }
    }
  };

  const handleNavClick = (id) => {
    setActiveNavId(id);
    if (id === 2) {
      navigate('/leaderboard');
    }  
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'Одобрено':
        return 'document__status--confirmed';
      case 'Отклонено':
        return 'document__status--rejected';
      case 'На рассмотрении':
        return 'document__status--pending';
      default:
        return '';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'Одобрено':
        return 'Подтверждено';
      case 'Отклонено':
        return 'Отклонено';
      case 'На рассмотрении':
        return 'На рассмотрении';
      default:
        return status;
    }
  };

  return (
    <div className="profile-page">
      {loading && (
        <div className="loading-overlay" style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(255, 255, 255, 0.8)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000
        }}>

          <div style={{ fontSize: '18px', color: '#0808e4' }}>Загрузка профиля...</div>
        </div>
      )}

      {error && (
        <div className="error-message" style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#ff3c3c',
          color: 'white',
          padding: '15px 30px',
          borderRadius: '10px',
          zIndex: 1000
        }}>
          {error}
        </div>
      )}

      <header className="header">
        <div className="header__content">
          <div className="header__logos">
            <img src={LA} alt="Secondary Logo" className="header__secondary-logo"/>
            <img src={khpi} alt="Logo" className="header__logo"/>
          </div>

          <nav className="navigation">
            <ul className="navigation__list">
              {navLinks.map((link) => (
                <li key={link.id}>
                  {link.url ? (
                    <a 
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`navigation__link ${activeNavId === link.id ? 'navigation__link--active' : ''}`}
                      onClick={() => setActiveNavId(link.id)}
                    >
                      {link.title}
                    </a>
                  ) : (
                    <a href="#" className={`navigation__link ${activeNavId === link.id ? 'navigation__link--active' : ''}`}
                      onClick={(e) => {
                        e.preventDefault();
                        handleNavClick(link.id);
                      }}
                    >
                      {link.title}
                    </a>
                  )}
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      {/* Кнопка с тремя полосками для мобильных устройств */}
      <button className="mobile-menu-button" onClick={toggleSidebar}>
        <span className="mobile-menu-icon"></span>
        <span className="mobile-menu-icon"></span>
        <span className="mobile-menu-icon"></span>
      </button>

      {/* Оверлей для затемнения фона при открытом меню */}
      {isSidebarOpen && <div className="sidebar-overlay" onClick={toggleSidebar}></div>}
      <main className="main-content">

        {/* Боковая панель для мобильной версии */}
        <section className={`profile-section ${isSidebarOpen ? 'sidebar-open' : ''}`}>
          <button className="sidebar-close" onClick={toggleSidebar}>×</button>
          <div className="profile-section__header">
            <img src={profile.avatar} alt="Profile Picture" className="profile-section__avatar" />
            <h2 className="profile-section__name">{profile.name}</h2>
            <p className="profile-section__email">{profile.email}</p>
          </div>

          <div className="profile-section__divider"></div>
          <div className="profile-section__info-box">
            <div className="profile-section__status">
              <img
                src={mortar}
                alt="Mortarboard"
                className="status-icon"
              />

              <p>{profile.school}</p>
            </div>

            <div className="profile-section__status">
              <img
                src={paper}
                alt="Points"
                className="status-icon"
              />

              <p>Общая сумма баллов: {profile.totalPoints}</p>
            </div>

            <div className="profile-section__status">
              <img
                src={chart}
                alt="Leaderboard Position"
                className="status-icon"
              />

              <p>Позиция в таблице: {profile.position}</p>
            </div>
          </div>

          <button className="profile-section__edit-button" onClick={openEditModal}>Редактировать профиль</button>

          <div className="profile-section__divider"></div>
          <div className="profile-section__additional-info">
            <div className="profile-section__status">
              <img
                src={book}
                alt="Class"
                className="status-icon"
              />

              <p>Класс/Курс: {profile.classCourse}</p>
            </div>

            <div className="profile-section__status">
              <img
                src={lol}
                alt="Age"
                className="status-icon"
              />

              <p>Возраст: {profile.age} лет</p>
            </div>

            <div className="profile-section__status">
              <img
                src={msg}
                alt="Status"
                className="status-icon"
              />
              <p>Статус уч. записи: <span className="account-status-value">{profile.accountStatus}</span></p>
            </div>
          </div>

          <div className="profile-section__status-divider"></div>
          <button className="profile-section__upload-button" onClick={openUploadModal}>Загрузить новый документ</button>
          <button className="profile-section__verify-button" onClick={handleVerifyButtonClick}>
            Подтвердить аккаунт
          </button>
          <button className="profile-section__logout-button" onClick={handleLogout}>Выход</button>
        </section>

        <div className="right-column">
          {/* ... */}
          <section className="category-section">
            <div className="category-section__categories" ref={categoriesRef}>
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={`category-button ${activeCategoryId === category.id ? 'category-button--active' : ''}`}
                  onClick={() => handleCategoryClick(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </section>

          <div className="category-section__stats">
            {filteredDocuments.length > 0 && (
              <span>
                {activeCategoryName}: {filteredDocuments.length}
              </span>
            )}
          </div>

          <section className="document-list-section">
            <div className="document-list">
              {documentsLoading ? (
                <div style={{ textAlign: 'center', padding: '20px' }}>Загрузка документов...</div>
              ) : filteredDocuments.length > 0 ? (
                filteredDocuments.map((doc) => (
                  <article 
                    key={doc.document_id} 
                    className="document"
                    onClick={() => openDocumentModal(doc)}
                    style={{ cursor: 'pointer' }}
                  >
                    <DocumentPreview key={doc.file_path} filePath={doc.file_path} />
                    <div className="document__divider"></div>
                    <h3 className="document__title">{doc.document_name}</h3>
                    <p className="document__status">
                      Статус: <span className={getStatusClass(doc.status)}>{getStatusText(doc.status)}</span>
                    </p>
                    <p className="document__points">Кол-во баллов: {doc.points || 0}</p>
                  </article>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '20px' }}>У вас пока нет документов</div>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Модальное окно просмотра документа */}
      {isDocumentModalOpen && selectedDocument && (
        <div className="document-modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) closeDocumentModal();
        }}>
          <div className="document-modal">
            {/* Кнопка закрыть */}
            <button 
              className="document-modal__close"
              onClick={closeDocumentModal}
              aria-label="Закрыть"
            >
              <span className="document-modal__close-x">×</span>
            </button>

            {/* Превью документа */}
            <div className="document-modal__preview">
              {getFileType(selectedDocument.file_path) === 'image' ? (
                <img 
                  src={getFileUrl(selectedDocument.file_path)}
                  alt={selectedDocument.document_name}
                  className="document-modal__image"
                  loading="eager"
                  decoding="async"
                  fetchpriority="high"
                  onError={(e) => {
                    e.target.src = documentplaceholder;
                    e.target.alt = 'Изображение недоступно';
                  }}
                />
              ) : getFileType(selectedDocument.file_path) === 'pdf' ? (
                <div className="document-modal__pdf-container">
                  <iframe
                    src={`${getFileUrl(selectedDocument.file_path)}#toolbar=0&navpanes=0&scrollbar=0&statusbar=0&messages=0&view=FitH`}
                    className="document-modal__pdf-embed"
                    title={selectedDocument.document_name}
                    loading="eager"
                  />
                </div>
              ) : (
                <p>Файл не поддерживается для предпросмотра</p>
              )}
            </div>

            {/* Название документа */}
            <h2 className="document-modal__title">
              {selectedDocument.document_name?.toUpperCase()}
            </h2>

            {/* Тип мероприятия */}
            <p className="document-modal__event-type">
              {selectedDocument.event_type || 'Тип мероприятия не указан'}
            </p>

            {/* Статус и баллы */}
            <div className="document-modal__info">
              <p className="document-modal__status">
                Статус: <span className={getStatusClass(selectedDocument.status)}>{getStatusText(selectedDocument.status)}</span>
              </p>
              <p className="document-modal__points">
                Кол-во баллов: {selectedDocument.points || 0}
              </p>
            </div>

            {/* Комментарий от модератора */}
            {selectedDocument.comment && (
              <div className="document-modal__comment" style={{
                marginTop: '-20px',
                marginBottom: '30px',
                marginLeft: '11px',
                padding: '15px 20px',
                position: 'relative',
                textAlign: 'left'
              }}>
                <p style={{ 
                  margin: '0 0 12px 0', 
                  fontWeight: '700', 
                  color: '#e65100', 
                  fontSize: '16px',
                  textShadow: '0 0 8px rgba(255,255,255,1), 0 0 15px rgba(255,255,255,0.9)'
                }}>
                  Комментарий от модератора:
                </p>
                <p style={{ 
                  margin: 0, 
                  color: '#333', 
                  fontSize: '16px', 
                  lineHeight: '1.6',
                  textShadow: '0 0 8px rgba(255,255,255,1), 0 0 15px rgba(255,255,255,0.9)',
                  fontWeight: '700'
                }}>
                  {selectedDocument.comment}
                </p>
              </div>
            )}

            {/* Отступ снизу для контента */}
            {!selectedDocument.comment && <div style={{ height: '40px' }}></div>}

            {/* Логотип ЛА - декоративный элемент на фоне */}
            <img 
              src={LA2} 
              alt="" 
              className="document-modal__bg-logo"
              aria-hidden="true"
              style={{ 
                opacity: '0.4',
                maxWidth: '250px',
                maxHeight: '250px',
                bottom: '-290px'
              }}
            />
          </div>
        </div>
      )}

      {/* Модальное окно загрузки документов */}
      {isUploadModalOpen && (
        <div className="upload-modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) closeUploadModal();
        }}>

          <div className="upload-modal">
            <div className="upload-modal__header" style={{textAlign: 'center'}}>
              <h2 className="upload-modal__title">Введите данные документа</h2>
            </div>

            <div className="upload-modal__form">
              {uploadSuccess ? (
                <div className="form-success">
                  Документ отправлен на модерацию
                </div>
              ) : (
                <>
                  {uploadGlobalError && (
                    <div className="form-error--global">
                      {uploadGlobalError}
                    </div>
                  )}

                  <div className="form-group" style={{marginTop: '15px'}}>
                    <label className="form-label">Название документа</label>
                    <input
                      type="text"
                      className={`form-input ${uploadErrors.title ? 'form-input--error' : ''}`}
                      value={documentTitle}
                      onChange={(e) => {
                        setDocumentTitle(e.target.value);
                        if (uploadErrors.title) {
                          setUploadErrors(prev => ({ ...prev, title: null }));
                        }
                      }}
                      placeholder="Название документов"
                      disabled={isUploading}
                    />
                    {uploadErrors.title && (
                      <span className="form-error">{uploadErrors.title}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Дата получения</label>
                    <input type="date" className={`form-input ${uploadErrors.date ? 'form-input--error' : ''}`} value={receiptDate}
                      onChange={(e) => {
                        setReceiptDate(e.target.value);
                        if (uploadErrors.date) {
                          setUploadErrors(prev => ({ ...prev, date: null }));
                        }
                      }}
                      placeholder="Дата получения"
                      disabled={isUploading}
                    />
                    {uploadErrors.date && (
                      <span className="form-error">{uploadErrors.date}</span>
                    )}
                  </div>

                  <div className="checklist">
                    <h3 className="checklist__title">Перед отправкой проверьте:</h3>
                    <ul className="checklist__items">
                      <li className="checklist__item">Вы прикрепляете актуальный файл</li>
                      <li className="checklist__item">Название написано без опечаток и орфографических ошибок</li>
                      <li className="checklist__item">Выбран поддерживаемый формат файла (.jpeg, .jpg, .png, .pdf)</li>
                    </ul>
                  </div>

                  <div className="form-group">
                    <div
                      className={`file-upload-area ${isDragging ? 'file-upload-area--active' : ''} ${uploadErrors.file ? 'file-upload-area--error' : ''}`}
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={() => !selectedFile && fileInputRef.current?.click()}
                    >
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileInputChange}
                        accept=".jpeg,.jpg,.png,.pdf"
                        style={{ display: 'none' }}
                        disabled={isUploading}
                      />

                      {selectedFile ? (
                        <div className="file-info">
                          <div className="file-info__details">
                            <span className="file-info__name">{selectedFile.name}</span>
                            <span className="file-info__size">{formatFileSize(selectedFile.size)}</span>
                          </div>

                          <button
                            type="button"
                            className="file-info__remove"
                            onClick={handleRemoveFile}
                            disabled={isUploading}
                            title="Удалить файл"
                          >
                            ×
                          </button>
                        </div>

                      ) : (

                        <div className="file-upload-prompt">
                          <img src={uploadIcon} alt="Upload" className="file-upload-icon" style={{opacity: 0.6, width: '160px', height: '160px', display: 'block', margin: '0 auto 20px'}} />
                          <p style={{fontSize: '24px', opacity: 0.6, textAlign: 'center', fontWeight: 'bold'}}>Поместите в окно файл размером до 15 МБ</p>
                          <p className="file-upload-formats" style={{fontSize: '20px', opacity: 0.6, textAlign: 'center', fontWeight: 'bold'}}>Поддерживаемые форматы: JPEG, JPG, PNG, PDF</p>

                          <button 
                            type="button" 
                            className="file-upload-button"
                            disabled={isUploading}
                          >
                            Выбрать файл
                          </button>

                        </div>
                      )}
                    </div>

                    {uploadErrors.file && (
                      <span className="form-error">{uploadErrors.file}</span>
                    )}

                    <p style={{fontSize: '16px', color: '#626262', textAlign: 'center', marginTop: '15px', fontFamily: 'Montserrat, sans-serif'}}>После отправки документ должен пройти модерацию.</p>
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="form-button form-button--primary"
                      onClick={handleUploadSubmit}
                      disabled={isUploading}
                    >

                      {isUploading ? (
                        <>
                          <span>Отправка...</span>
                          <span style={{ marginLeft: '8px' }}>⏳</span>
                        </>

                      ) : (
                        'Загрузить документ'
                      )}

                    </button>

                    <button
                      type="button"
                      className="form-button form-button--secondary"
                      onClick={closeUploadModal}
                      disabled={isUploading}
                    >
                      Отмена
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно "Аккаунт уже подтвержден" */}
      {isAlreadyVerifiedModalOpen && (
        <div className="upload-modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) closeAlreadyVerifiedModal();
        }}>
          <div className="upload-modal" style={{ maxWidth: '400px', textAlign: 'center', width: '90%', margin: '0 auto' }}>
            <div className="upload-modal__header">
              <h2 className="upload-modal__title" style={{ color: '#4CAF50' }}>✅ Аккаунт подтвержден</h2>
            </div>

            <div className="upload-modal__form">
              <div style={{ padding: '10px 0' }}>
                <p style={{ fontSize: '18px' }}>
                  Ваш аккаунт уже подтвержден!
                </p>
              </div>

              <div className="form-actions" style={{ justifyContent: 'center', marginTop: '10px' }}>
                <button
                  type="button"
                  className="form-button form-button--primary"
                  onClick={closeAlreadyVerifiedModal}
                >
                  Отлично
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Модальное окно верификации */}
      {isVerifyModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={(e) => {
          if (e.target === e.currentTarget) closeVerifyModal();
        }}>
          <div className="bg-white rounded-[20px] px-3 py-6 max-w-xl w-full mx-4 max-h-[90vh] overflow-y-auto" style={{ border: '3px solid #C9E410' }}>
            {/* Заголовок верификации */}
            <div className="text-center mb-4">
              <img src={textVerify} alt="ВЕРИФИКАЦИЯ ЧЕРЕЗ БОТА" style={{ maxWidth: '100%', height: 'auto' }} />
            </div>

            {verifyError && (
              <div className="form-error--global mb-4">
                {verifyError}
              </div>
            )}

            {isGeneratingToken ? (
              <div style={{ textAlign: 'center', padding: '30px' }}>
                <p>Генерация токена...</p>
                <span style={{ fontSize: '24px' }}>⏳</span>
              </div>
            ) : verificationToken ? (
              <>
                {/* Текст инструкции */}
                <h2 className="text-center mb-2" style={{ 
                  color: '#000000', 
                  fontFamily: 'Montserrat', 
                  fontWeight: 'bold',
                  lineHeight: '150%',
                  letterSpacing: '0.05em'
                }}>
                  Для подтверждения вашего аккаунта, пожалуйста, следуйте инструкциям ниже.
                </h2>

                {/* Инструкция */}
                <div className="mb-6" style={{ color: '#000000', fontFamily: 'Montserrat', fontWeight: '600', lineHeight: '150%' }}>
                  <p className="mb-2">1. Скопируйте токен подтверждения из поля ниже;</p>
                  <p className="mb-2">2. Перейдите по ссылке на ВК бота: <a href="https://clck.ru/3SfdWf" target="_blank" rel="noopener noreferrer" style={{ color: '#0808E4', textDecoration: 'underline' }}>https://clck.ru/3SfdWf</a></p>
                  <p className="mb-2">3. Введите токен в чате с ботом.</p>
                </div>

                {/* Поле с токеном */}
                <div 
                  onClick={copyTokenToClipboard}
                  onTouchStart={copyTokenToClipboard}
                  style={{
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
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#F8F8F8'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'white'
                  }}
                >
                  <p style={{ 
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
              </>
            ) : null}

            {/* Кнопка закрыть */}
            <button
              onClick={closeVerifyModal}
              disabled={isGeneratingToken}
              className="mx-auto font-semibold transition-all duration-300 mt-6"
              style={{
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
                display: 'block',
                opacity: isGeneratingToken ? 0.5 : 1
              }}
            >
              Закрыть
            </button>
          </div>
        </div>
      )}

      {/* Модальное окно редактирования профиля */}
      {isEditModalOpen && (
        <div className="upload-modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) closeEditModal();
        }}>
          <div className="upload-modal">
            <div className="upload-modal__header" style={{textAlign: 'center'}}>
              <h2 className="upload-modal__title">Редактирование профиля</h2>
            </div>

            <div className="upload-modal__form">
              {editSuccess ? (
                <div className="form-success">
                  Профиль успешно обновлен
                </div>
              ) : (
                <>
                  {editErrors.global && (
                    <div className="form-error--global">
                      {editErrors.global}
                    </div>
                  )}

                  <div className="form-group" style={{marginTop: '15px'}}>
                    <label className="form-label">ФИО</label>
                    <input
                      type="text"
                      className={`form-input ${editErrors.full_name ? 'form-input--error' : ''}`}
                      value={editFormData.full_name}
                      onChange={(e) => {
                        setEditFormData(prev => ({ ...prev, full_name: e.target.value }));
                        if (editErrors.full_name) {
                          setEditErrors(prev => ({ ...prev, full_name: null }));
                        }
                      }}
                      placeholder="Иванов Иван Иванович"
                      disabled={isSaving}
                    />
                    {editErrors.full_name && (
                      <span className="form-error">{editErrors.full_name}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Школа</label>
                    <input
                      type="text"
                      className={`form-input ${editErrors.school ? 'form-input--error' : ''}`}
                      value={editFormData.school}
                      onChange={(e) => {
                        setEditFormData(prev => ({ ...prev, school: e.target.value }));
                        if (editErrors.school) {
                          setEditErrors(prev => ({ ...prev, school: null }));
                        }
                      }}
                      placeholder="Название школы"
                      disabled={isSaving}
                    />
                    {editErrors.school && (
                      <span className="form-error">{editErrors.school}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Класс/Курс</label>
                    <input
                      type="number"
                      min="1"
                      max="11"
                      className={`form-input ${editErrors.class_course ? 'form-input--error' : ''}`}
                      value={editFormData.class_course}
                      onChange={(e) => {
                        setEditFormData(prev => ({ ...prev, class_course: e.target.value }));
                        if (editErrors.class_course) {
                          setEditErrors(prev => ({ ...prev, class_course: null }));
                        }
                      }}
                      placeholder="11"
                      disabled={isSaving}
                    />
                    {editErrors.class_course && (
                      <span className="form-error">{editErrors.class_course}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className={`form-input ${editErrors.email ? 'form-input--error' : ''}`}
                      value={editFormData.email}
                      onChange={(e) => {
                        setEditFormData(prev => ({ ...prev, email: e.target.value }));
                        validateFieldOnChange('email', e.target.value);
                      }}
                      placeholder="example@email.com"
                      disabled={isSaving}
                    />
                    {editErrors.email && (
                      <span className="form-error">{editErrors.email}</span>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Телефон</label>
                    <input
                      type="tel"
                      className={`form-input ${editErrors.phone_number ? 'form-input--error' : ''}`}
                      value={editFormData.phone_number}
                      onChange={(e) => {
                        const rawValue = e.target.value;
                        const formattedValue = formatPhoneNumber(rawValue);
                        setEditFormData(prev => ({ ...prev, phone_number: formattedValue }));
                        validateFieldOnChange('phone_number', formattedValue);
                      }}
                      placeholder="+7 (999) 999-99-99"
                      disabled={isSaving}
                    />
                    {editErrors.phone_number && (
                      <span className="form-error">{editErrors.phone_number}</span>
                    )}
                  </div>

                  <div className="form-actions">
                    <button
                      type="button"
                      className="form-button form-button--primary"
                      onClick={handleSaveProfile}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <>
                          <span>Сохранение...</span>
                          <span style={{ marginLeft: '8px' }}>⏳</span>
                        </>
                      ) : (
                        'Сохранить'
                      )}
                    </button>

                    <button
                      type="button"
                      className="form-button form-button--secondary"
                      onClick={closeEditModal}
                      disabled={isSaving}
                    >
                      Отмена
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );

};
export default Profile;