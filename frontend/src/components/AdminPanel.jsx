import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminPanelStyles.css';
import '../styles/ProfileStyles.css';
import avatar from '../assets/user-image-l@2x.png'
import khpi from '../assets/logo_of_1x.png'
import LA from '../assets/Лого ЛА (без кгпи кемгу).png'
import uploadIcon from '../assets/126477.png'

// Определяем API_URL в зависимости от того, где запущено приложение
const getApiUrl = () => {
  const hostname = window.location.hostname;
  const port = window.location.port;
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }
  
  return `http://${hostname}:3000`;
};

const API_URL = getApiUrl();

// Карта категорий и возможных баллов 
const CATEGORY_POINTS_MAP = {
  // Профориентационные мероприятия КГПИ КемГУ - максимум 30
  1: [
    { value: 5, label: '5 баллов (участие)' }
  ],
  // Научно-исследовательская деятельность в КГПИ КемГУ - максимум 60
  2: [
    { value: 30, label: '30 баллов (1 место)' },
    { value: 20, label: '20 баллов (2-3 место)' },
    { value: 10, label: '10 баллов (участие)' }
  ],
  // Творческие конкурсы и фестивали на базе КГПИ КемГУ - максимум 50
  3: [
    { value: 30, label: '30 баллов (Гран-при)' },
    { value: 20, label: '20 баллов (1-2-3 место)' },
    { value: 10, label: '10 баллов (участие)' }
  ],
  // Спортивные мероприятия на базе КГПИ КемГУ - максимум 40
  4: [
    { value: 30, label: '30 баллов (1 место)' },
    { value: 20, label: '20 баллов (2-3 место)' },
    { value: 10, label: '10 баллов (участие)' }
  ],
  // Профильные школы и интенсивы КГПИ КемГУ - максимум 30
  5: [
    { value: 30, label: '30 баллов (участие)' }
  ],
  // Волонтерская деятельность в КГПИ КемГУ - максимум 20
  6: [
    { value: 10, label: '10 баллов' }
  ]
};

// Максимальные баллы по категориям (для отображения)
const CATEGORY_MAX_POINTS = {
  1: 30,
  2: 60,
  3: 50,
  4: 40,
  5: 30,
  6: 20
};

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

const AdminPanel = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  // Данные для таблиц из БД
  const [eventsData, setEventsData] = useState([]);
  const [documentsData, setDocumentsData] = useState([]);
  const [usersData, setUsersData] = useState([]);
  const [adminsData, setAdminsData] = useState([]);
  const [moderationData, setModerationData] = useState([]);
  const [tableLoading, setTableLoading] = useState(false);
  const [tableError, setTableError] = useState(null);

  // Роль пользователя: 'admin' или 'moderator'
  const [userRole, setUserRole] = useState('admin');

  // Состояния для модального окна добавления документа
  const [isAddDocumentModalOpen, setIsAddDocumentModalOpen] = useState(false);
  const [documentTitle, setDocumentTitle] = useState('');
  const [receiptDate, setReceiptDate] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [userFullName, setUserFullName] = useState('');
  const [userPhone, setUserPhone] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [userSearchResults, setUserSearchResults] = useState([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const userSearchTimeoutRef = React.useRef(null);
  const [documentCategory, setDocumentCategory] = useState('');
  const [documentPoints, setDocumentPoints] = useState('');
  const [useManualPoints, setUseManualPoints] = useState(false);
  const [manualPoints, setManualPoints] = useState('');
  const [achievementCategories, setAchievementCategories] = useState([]);
  const [uploadErrors, setUploadErrors] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = React.useRef(null);

  // Состояния для модального окна создания мероприятия
  const [isCreateEventModalOpen, setIsCreateEventModalOpen] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventCategory, setEventCategory] = useState('');
  const [eventErrors, setEventErrors] = useState({});
  const [isCreatingEvent, setIsCreatingEvent] = useState(false);
  const [eventSuccess, setEventSuccess] = useState(false);

  // Состояния для модального окна добавления пользователя
  const [isAddUserModalOpen, setIsAddUserModalOpen] = useState(false);
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserSchool, setNewUserSchool] = useState('');
  const [newUserClass, setNewUserClass] = useState('');
  const [newUserBirthDate, setNewUserBirthDate] = useState('');
  const [newUserErrors, setNewUserErrors] = useState({});
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [addUserSuccess, setAddUserSuccess] = useState(false);

  // Состояния для модального окна добавления модератора
  const [isAddModeratorModalOpen, setIsAddModeratorModalOpen] = useState(false);
  const [moderatorFullName, setModeratorFullName] = useState('');
  const [moderatorEmail, setModeratorEmail] = useState('');
  const [moderatorPhone, setModeratorPhone] = useState('');
  const [moderatorPosition, setModeratorPosition] = useState('');
  const [moderatorPassword, setModeratorPassword] = useState('');
  const [moderatorErrors, setModeratorErrors] = useState({});
  const [isAddingModerator, setIsAddingModerator] = useState(false);
  const [addModeratorSuccess, setAddModeratorSuccess] = useState(false);

  // Состояния для модальных окон просмотра/редактирования
  const [selectedItem, setSelectedItem] = useState(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [editErrors, setEditErrors] = useState({});
  const [editSuccess, setEditSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Данные для админ-панели
  const [onlineUsers, setOnlineUsers] = useState(150);
  const [maxOnlineUsers, setMaxOnlineUsers] = useState(150);
  const [registeredUsers, setRegisteredUsers] = useState(234);
  
  // WebSocket
  useEffect(() => {
    let websocket = null;
    let updateInterval = null;

    try {
      const wsUrl = API_URL.replace('http', 'ws') + '/ws';
      websocket = new WebSocket(wsUrl);
      
      websocket.onopen = () => {
        console.log('WebSocket connected for real-time admin updates');
        if (websocket.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify({ type: 'subscribe_admin' }));
        }
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'admin_update') {
            setOnlineUsers(data.onlineUsers || 0);
            setRegisteredUsers(data.registeredUsers || 234);
            setLastUpdate(new Date());
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      websocket.onclose = () => {
        console.log('WebSocket disconnected, falling back to polling');
        updateInterval = setInterval(() => {
          fetchAdminStats();
        }, 5000);
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        websocket.close();
      };

    } catch (err) {
      console.log('WebSocket not supported, using polling');
      updateInterval = setInterval(() => {
        fetchAdminStats();
      }, 5000);
    }

    const fetchAdminStats = async () => {
      try {
        const userId = localStorage.getItem('userId');
        if (!userId) return;
        const response = await fetch(`${API_URL}/admin/stats`, {
          headers: { 'x-user-id': userId }
        });
        if (response.ok) {
          const data = await response.json();
          setOnlineUsers(data.onlineUsers || 0);
          setRegisteredUsers(data.registeredUsers || 234);
        } else if (response.status === 401) {
          console.warn('Не авторизован для получения статистики');
        }
      } catch (err) {
        console.error('Error fetching admin stats:', err);
      }
    };

    // Первоначальная загрузка
    fetchAdminStats();

    return () => {
      if (websocket) {
        websocket.close();
      }
      if (updateInterval) {
        clearInterval(updateInterval);
      }
    };
  }, []);
  
  // Состояние для категорий (фильтруем Модераторов для обычных модераторов)
  const categories = userRole === 'admin'
    ? [
        { id: 'documents', name: 'Документы' },
        { id: 'events', name: 'Мероприятия' },
        { id: 'users', name: 'Пользователи' },
        { id: 'admins', name: 'Модераторы' },
      ]
    : [
        { id: 'documents', name: 'Документы' },
        { id: 'events', name: 'Мероприятия' },
        { id: 'users', name: 'Пользователи' },
      ];
  const [activeCategoryId, setActiveCategoryId] = useState('events');
  
  // Обработчик клика по категории
  const handleCategoryClick = (id) => {
    setActiveCategoryId(id);
  };

  // Функция загрузки данных для активной категории
  const fetchCategoryData = async (categoryId) => {
    setTableLoading(true);
    setTableError(null);
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setTableError('Не авторизован. Пожалуйста, войдите в систему.');
        setTableLoading(false);
        return;
      }
      let url = '';
      let setter = null;
      switch (categoryId) {
        case 'events':
          url = `${API_URL}/admin/events`;
          setter = setEventsData;
          break;
        case 'documents':
          url = `${API_URL}/admin/documents`;
          setter = setDocumentsData;
          break;
        case 'users':
          url = `${API_URL}/admin/users`;
          setter = setUsersData;
          break;
        case 'admins':
          url = `${API_URL}/admin/moderators`;
          setter = setAdminsData;
          break;
        case 'moderation':
          url = `${API_URL}/admin/documents/pending`;
          setter = setModerationData;
          break;
        default:
          return;
      }
      const response = await fetch(url, {
        headers: { 'x-user-id': userId }
      });
      if (!response.ok) throw new Error('Ошибка загрузки данных');
      const data = await response.json();
      setter(data);
    } catch (err) {
      console.error(`Error fetching ${categoryId}:`, err);
      setTableError('Не удалось загрузить данные. Попробуйте позже.');
    } finally {
      setTableLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoryData(activeCategoryId);
    
    const tableUpdateInterval = setInterval(() => {
      fetchCategoryData(activeCategoryId);
    }, 5000);
    
    return () => {
      clearInterval(tableUpdateInterval);
    };
  }, [activeCategoryId]);

  
  // Получение данных для текущей категории
  const getCurrentData = () => {
    switch (activeCategoryId) {
      case 'events': return eventsData;
      case 'documents': return documentsData;
      case 'users': return usersData;
      case 'admins': return adminsData;
      case 'moderation': return moderationData;
      default: return eventsData;
    }
  };
  
  // Поиск
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    localStorage.removeItem('sessionTime');
    navigate('/login');
  };

  const handleUploadDocument = () => {
    openAddDocumentModal();
  };

  // Открыть модальное окно добавления документа
  const openAddDocumentModal = async () => {
    setIsAddDocumentModalOpen(true);
    document.body.style.overflow = 'hidden';
    
    // Загружаем категории достижений
    try {
      const response = await fetch(`${API_URL}/categories`);
      if (response.ok) {
        const data = await response.json();
        setAchievementCategories(data);
      }
    } catch (err) {
      console.error('Ошибка загрузки категорий:', err);
    }
  };

  // Закрыть модальное окно добавления документа
  const closeAddDocumentModal = () => {
    if (isUploading) return;
    setIsAddDocumentModalOpen(false);
    resetUploadForm();
    document.body.style.overflow = 'auto';
  };

  // Сбросить форму загрузки
  const resetUploadForm = () => {
    setDocumentTitle('');
    setReceiptDate('');
    setSelectedFile(null);
    setUserFullName('');
    setUserPhone('');
    setSelectedUser(null);
    setUserSearchResults([]);
    setShowUserDropdown(false);
    setDocumentCategory('');
    setDocumentPoints('');
    setUseManualPoints(false);
    setManualPoints('');
    setUploadErrors({});
    setUploadSuccess(false);
    setIsDragging(false);
  };

  // Форматирование размера файла
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Обработка выбора файла
  const handleFileSelect = (file) => {
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

  // Поиск пользователей
  const searchUsers = async (searchQuery) => {
    if (!searchQuery || searchQuery.trim().length < 2) {
      setUserSearchResults([]);
      setShowUserDropdown(false);
      return;
    }

    setIsSearchingUsers(true);
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`${API_URL}/admin/users/search?query=${encodeURIComponent(searchQuery)}`, {
        headers: { 'x-user-id': userId }
      });

      if (response.ok) {
        const data = await response.json();
        setUserSearchResults(data.users || []);
        setShowUserDropdown(data.users && data.users.length > 0);
      }
    } catch (err) {
      console.error('Ошибка поиска пользователей:', err);
    } finally {
      setIsSearchingUsers(false);
    }
  };

  // Обработка изменения ФИО
  const handleUserFullNameChange = (e) => {
    const value = e.target.value;
    setUserFullName(value);
    setSelectedUser(null);

    if (userSearchTimeoutRef.current) {
      clearTimeout(userSearchTimeoutRef.current);
    }

    userSearchTimeoutRef.current = setTimeout(() => {
      searchUsers(value);
    }, 300);
  };

  // Выбор пользователя из выпадающего списка
  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setUserFullName(user.full_name);
    setUserPhone(user.phone_number || '');
    setShowUserDropdown(false);
    setUserSearchResults([]);
  };

  // Закрытие выпадающего списка при клике вне его
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.getElementById('user-search-dropdown');
      const input = document.getElementById('user-fullname-input');
      if (dropdown && !dropdown.contains(event.target) && !input.contains(event.target)) {
        setShowUserDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Валидация формы загрузки документа
  const validateUploadForm = () => {
    const errors = {};

    // Проверка ФИО пользователя 
    if (!userFullName.trim()) {
      errors.userFullName = 'Введите ФИО пользователя';
    } else if (userFullName.trim().length < 3) {
      errors.userFullName = 'ФИО должно содержать минимум 3 символа';
    }

    // Проверка телефона пользователя 
    if (!userPhone.trim()) {
      errors.userPhone = 'Введите номер телефона пользователя';
    } else {
      const digitsOnly = userPhone.replace(/\D/g, '');
      if (digitsOnly.length !== 11) {
        errors.userPhone = 'Номер телефона должен содержать ровно 11 цифр';
      }
    }

    // Проверка названия документа 
    if (!documentTitle.trim()) {
      errors.title = 'Введите название документа';
    } else if (documentTitle.trim().length < 2) {
      errors.title = 'Название должно содержать минимум 2 символа';
    } else if (documentTitle.trim().length > 45) {
      errors.title = 'Название должно содержать не более 45 символов';
    }

    // Проверка даты получения 
    if (!receiptDate) {
      errors.date = 'Выберите дату получения';
    } else {
      const selectedDate = new Date(receiptDate + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate.getTime() > today.getTime()) {
        errors.date = 'Дата не может быть в будущем';
      }
    }

    // Проверка категории
    if (!documentCategory) {
      errors.category = 'Выберите категорию достижения';
    }

    // Проверка баллов
    if (!documentPoints && documentPoints !== '0') {
      errors.points = 'Укажите количество баллов';
    } else {
      const pointsNum = parseInt(documentPoints);
      if (isNaN(pointsNum) || pointsNum < 0) {
        errors.points = 'Баллы должны быть не менее 0';
      } else if (pointsNum > 1000) {
        errors.points = 'Баллы не могут превышать 1000';
      } else if (documentCategory && CATEGORY_MAX_POINTS[documentCategory] && pointsNum > CATEGORY_MAX_POINTS[documentCategory]) {
        errors.points = `Максимум для категории: ${CATEGORY_MAX_POINTS[documentCategory]} баллов`;
      }
    }

    // Проверка файла
    if (!selectedFile) {
      errors.file = 'Выберите файл для загрузки';
    }

    setUploadErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Отправка документа с валидацией и автосозданием пользователя
  const handleUploadSubmit = async () => {
    if (!validateUploadForm()) return;

    setIsUploading(true);
    setUploadErrors({});

    try {
      const userId = localStorage.getItem('userId');
      let targetUserId = selectedUser?.user_id;

      // Если пользователь не выбран из списка, ищем или создаем его
      if (!targetUserId) {
        // Сначала пытаемся найти пользователя по телефону
        const cleanPhone = userPhone.replace(/\D/g, '');
        const searchResponse = await fetch(`${API_URL}/admin/users/search?query=${encodeURIComponent(cleanPhone)}`, {
          headers: { 'x-user-id': userId }
        });

        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          const foundUser = searchData.users?.find(u => 
            u.phone_number?.replace(/\D/g, '') === cleanPhone
          );
          
          if (foundUser) {
            targetUserId = foundUser.user_id;
          }
        }

        // Если не нашли, создаем нового пользователя
        if (!targetUserId) {
          const createUserResponse = await fetch(`${API_URL}/admin/users`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-user-id': userId
            },
            body: JSON.stringify({
              full_name: userFullName,
              phone_number: userPhone,
              email: null,
              birth_date: null,
              class_course: null,
              school: null,
              graduation_year: null
            })
          });

          if (!createUserResponse.ok) {
            const errorData = await createUserResponse.json();
            // Если пользователь уже существует, получаем его ID
            if (createUserResponse.status === 409 && errorData.existing_user) {
              targetUserId = errorData.existing_user.user_id;
            } else {
              throw new Error(errorData.message || 'Ошибка создания пользователя');
            }
          } else {
            const createData = await createUserResponse.json();
            targetUserId = createData.user.user_id;
          }
        }
      }

      if (!targetUserId) {
        throw new Error('Не удалось определить пользователя');
      }

      // Загружаем документ
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('document_name', documentTitle);
      formData.append('category_id', documentCategory);
      formData.append('points', documentPoints);
      formData.append('received_date', receiptDate);
      formData.append('user_id', targetUserId);

      const uploadResponse = await fetch(`${API_URL}/admin/documents/manual`, {
        method: 'POST',
        headers: {
          'x-user-id': userId
        },
        body: formData
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.message || 'Ошибка загрузки документа');
      }

      const uploadData = await uploadResponse.json();
      
      // Обновляем таблицу лидеров
      if (window.broadcastLeaderboardUpdate) {
        window.broadcastLeaderboardUpdate();
      }

      setUploadSuccess(true);
      setTimeout(() => {
        closeAddDocumentModal();
        fetchCategoryData('documents');
      }, 1500);

    } catch (err) {
      console.error('Ошибка:', err);
      setUploadErrors(prev => ({ ...prev, global: err.message }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleCreateEvent = () => {
    openCreateEventModal();
  };

  // Открыть модальное окно создания мероприятия
  const openCreateEventModal = async () => {
    setIsCreateEventModalOpen(true);
    document.body.style.overflow = 'hidden';
    
    // Загружаем категории
    try {
      const response = await fetch(`${API_URL}/categories`);
      if (response.ok) {
        const data = await response.json();
        setAchievementCategories(data);
      }
    } catch (err) {
      console.error('Ошибка загрузки категорий:', err);
    }
  };

  // Закрыть модальное окно создания мероприятия
  const closeCreateEventModal = () => {
    if (isCreatingEvent) return;
    setIsCreateEventModalOpen(false);
    resetEventForm();
    document.body.style.overflow = 'auto';
  };

  // Сбросить форму создания мероприятия
  const resetEventForm = () => {
    setEventName('');
    setEventDate('');
    setEventCategory('');
    setEventErrors({});
    setEventSuccess(false);
  };

  // Валидация формы создания мероприятия
  const validateEventForm = () => {
    const errors = {};

    // Проверка названия мероприятия
    if (!eventName.trim()) {
      errors.eventName = 'Введите название мероприятия';
    } else if (eventName.trim().length < 3) {
      errors.eventName = 'Название должно содержать минимум 3 символа';
    }

    // Проверка даты мероприятия
    if (!eventDate) {
      errors.eventDate = 'Выберите дату мероприятия';
    } else {
      const selectedDate = new Date(eventDate + 'T00:00:00');
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate.getTime() < today.getTime()) {
        errors.eventDate = 'Дата мероприятия не может быть раньше текущей даты';
      }
    }

    // Проверка категории
    if (!eventCategory) {
      errors.eventCategory = 'Выберите категорию мероприятия';
    }

    setEventErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Отправка формы создания мероприятия
  const handleEventSubmit = async () => {
    if (!validateEventForm()) return;

    setIsCreatingEvent(true);
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`${API_URL}/admin/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          event_name: eventName,
          event_date: eventDate,
          category_id: parseInt(eventCategory)
        })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Ошибка создания мероприятия');

      setEventSuccess(true);
      setIsCreatingEvent(false);
      setTimeout(() => {
        closeCreateEventModal();
        fetchCategoryData('events');
      }, 1500);
    } catch (err) {
      console.error('Ошибка:', err);
      setEventErrors(prev => ({ ...prev, global: err.message }));
      setIsCreatingEvent(false);
    }
  };

  // Функции для модального окна добавления пользователя
  const openAddUserModal = () => {
    setIsAddUserModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeAddUserModal = () => {
    if (isAddingUser) return;
    setIsAddUserModalOpen(false);
    resetAddUserForm();
    document.body.style.overflow = 'auto';
  };

  const resetAddUserForm = () => {
    setNewUserFullName('');
    setNewUserPhone('');
    setNewUserSchool('');
    setNewUserClass('');
    setNewUserBirthDate('');
    setNewUserErrors({});
    setAddUserSuccess(false);
  };

  const validateAddUserForm = () => {
    const errors = {};
    if (!newUserFullName.trim()) {
      errors.fullName = 'Введите ФИО';
    } else if (newUserFullName.trim().length < 3) {
      errors.fullName = 'ФИО должно содержать минимум 3 символа';
    }
    if (!newUserPhone.trim()) {
      errors.phone = 'Введите номер телефона';
    } else {
      const digitsOnly = newUserPhone.replace(/\D/g, '');
      if (digitsOnly.length !== 11) {
        errors.phone = 'Номер телефона должен содержать ровно 11 цифр';
      }
    }
    // Школа и класс - необязательные поля
    if (newUserClass.trim() && (isNaN(newUserClass) || newUserClass < 1 || newUserClass > 11)) {
      errors.class = 'Класс должен быть числом от 1 до 11';
    }
    setNewUserErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddUserSubmit = async () => {
    if (!validateAddUserForm()) return;

    setIsAddingUser(true);
    try {
      const userId = localStorage.getItem('userId');

      const requestBody = {
        full_name: newUserFullName,
        phone_number: newUserPhone,
        email: '',
        birth_date: newUserBirthDate,
        class_course: newUserClass || null,
        school: newUserSchool || null,
        graduation_year: null
      };

      const response = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Ошибка добавления пользователя');

      setAddUserSuccess(true);
      setIsAddingUser(false);
      setTimeout(() => {
        closeAddUserModal();
        fetchCategoryData('users');
      }, 1500);
    } catch (err) {
      console.error('Ошибка:', err);
      setNewUserErrors(prev => ({ ...prev, global: err.message }));
      setIsAddingUser(false);
    }
  };

  // Функции для модального окна добавления модератора
  const openAddModeratorModal = () => {
    setIsAddModeratorModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  const closeAddModeratorModal = () => {
    if (isAddingModerator) return;
    setIsAddModeratorModalOpen(false);
    resetAddModeratorForm();
    document.body.style.overflow = 'auto';
  };

  const resetAddModeratorForm = () => {
    setModeratorFullName('');
    setModeratorEmail('');
    setModeratorPhone('');
    setModeratorPosition('');
    setModeratorPassword('');
    setModeratorErrors({});
    setAddModeratorSuccess(false);
  };

  const validateAddModeratorForm = () => {
    const errors = {};
    if (!moderatorFullName.trim()) {
      errors.fullName = 'Введите ФИО';
    } else if (moderatorFullName.trim().length < 3) {
      errors.fullName = 'ФИО должно содержать минимум 3 символа';
    }
    if (!moderatorEmail.trim()) {
      errors.email = 'Введите email';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(moderatorEmail)) {
      errors.email = 'Введите корректный email';
    }
    if (moderatorPhone.trim()) {
      const digitsOnly = moderatorPhone.replace(/\D/g, '');
      if (digitsOnly.length !== 11) {
        errors.phone = 'Номер телефона должен содержать ровно 11 цифр';
      }
    }
    if (!moderatorPosition.trim()) {
      errors.position = 'Введите должность';
    }
    if (!moderatorPassword.trim()) {
      errors.password = 'Введите пароль';
    } else if (moderatorPassword.length < 6) {
      errors.password = 'Пароль должен содержать минимум 6 символов';
    }

    setModeratorErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddModeratorSubmit = async () => {
    if (!validateAddModeratorForm()) return;

    setIsAddingModerator(true);
    try {
      const userId = localStorage.getItem('userId');

      const requestBody = {
        login: moderatorEmail.split('@')[0],
        full_name: moderatorFullName,
        email: moderatorEmail,
        position_id: null,
        password: moderatorPassword
      };
      if (moderatorPassword.trim()) {
        requestBody.password = moderatorPassword;
      }

      const response = await fetch(`${API_URL}/admin/moderators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify(requestBody)
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Ошибка добавления модератора');

      if (data.generated_password) {
        alert(`Модератор добавлен. Пароль: ${data.generated_password}\nСообщите его модератору.`);
      }

      setAddModeratorSuccess(true);
      setIsAddingModerator(false);
      setTimeout(() => {
        closeAddModeratorModal();
        fetchCategoryData('admins');
      }, 1500);
    } catch (err) {
      console.error('Ошибка:', err);
      setModeratorErrors(prev => ({ ...prev, global: err.message }));
      setIsAddingModerator(false);
    }
  };

  // Открыть модальное окно просмотра элемента
  const openViewModal = async (item) => {
    setSelectedItem(item);
    setIsEditing(false);
    setEditErrors({});
    setEditSuccess(false);

    if ((activeCategoryId === 'documents' || activeCategoryId === 'moderation') && achievementCategories.length === 0) {
      try {
        const response = await fetch(`${API_URL}/categories`);
        if (response.ok) {
          const data = await response.json();
          setAchievementCategories(data);
        }
      } catch (err) {
        console.error('Ошибка загрузки категорий:', err);
      }
    }

    // Заполняем форму редактирования в зависимости от типа
    switch (activeCategoryId) {
      case 'documents':
        setEditFormData({
          document_name: item.document_name || '',
          status: item.status || 'На рассмотрении',
          points: item.points || 0,
          comment: item.comment || '',
          received_date: item.received_date ? new Date(item.received_date).toISOString().split('T')[0] : '',
          category_id: item.category_id || ''
        });
        break;
      case 'users':
        setEditFormData({
          full_name: item.full_name || '',
          phone_number: item.phone_number || '',
          email: item.email || '',
          birth_date: item.birth_date ? new Date(item.birth_date).toISOString().split('T')[0] : '',
          class_course: item.class_course || '',
          school: item.school || ''
        });
        break;
      case 'admins':
        setEditFormData({
          full_name: item.full_name || '',
          email: item.email || '',
          position_name: item.position_name || '',
          position_id: item.position_id || null
        });
        break;
      case 'events':
        setEditFormData({
          event_name: item.event_name || '',
          event_date: item.event_date ? new Date(item.event_date).toISOString().split('T')[0] : ''
        });
        break;
      case 'moderation':
        setEditFormData({
          document_name: item.document_name || '',
          status: item.status || 'На рассмотрении',
          points: item.points || 0,
          comment: item.comment || '',
          category_id: item.category_id || ''
        });
        break;
      default:
        setEditFormData({});
    }

    setIsViewModalOpen(true);
    document.body.style.overflow = 'hidden';
  };

  // Закрыть модальное окно просмотра
  const closeViewModal = () => {
    if (isSaving) return;
    setIsViewModalOpen(false);
    setSelectedItem(null);
    setIsEditing(false);
    setEditFormData({});
    setEditErrors({});
    document.body.style.overflow = 'auto';
  };

  // Переключить режим редактирования
  const toggleEditMode = () => {
    if (isEditing) {
      // Отмена редактирования - сброс формы
      if (selectedItem) {
        openViewModal(selectedItem);
      }
    } else {
      setIsEditing(true);
    }
  };

  // Обработка изменения полей формы редактирования
  const handleEditFormChange = (field, value) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
    if (editErrors[field]) {
      setEditErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  // Валидация формы редактирования документа
  const validateDocumentEditForm = () => {
    const errors = {};

    if (!editFormData.document_name?.trim()) {
      errors.document_name = 'Введите название документа';
    }

    if (!editFormData.status) {
      errors.status = 'Выберите статус';
    }

    // Проверка категории
    if (!editFormData.category_id) {
      errors.category_id = 'Выберите категорию достижения';
    }

    // Если статус "Отклонено", комментарий обязателен
    if (editFormData.status === 'Отклонено' && !editFormData.comment?.trim()) {
      errors.comment = 'При отклонении документа необходимо указать причину в комментарии';
    }

    // Проверка баллов
    if (editFormData.points === '' || editFormData.points === undefined || editFormData.points === null) {
      errors.points = 'Укажите количество баллов';
    } else {
      const pointsNum = parseInt(editFormData.points);
      if (isNaN(pointsNum) || pointsNum < 0) {
        errors.points = 'Баллы должны быть не менее 0';
      } else if (pointsNum > 1000) {
        errors.points = 'Баллы не могут превышать 1000';
      } else if (editFormData.category_id && CATEGORY_MAX_POINTS[editFormData.category_id] && pointsNum > CATEGORY_MAX_POINTS[editFormData.category_id]) {
        errors.points = `Максимум для категории: ${CATEGORY_MAX_POINTS[editFormData.category_id]} баллов`;
      }
    }

    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Сохранение изменений документа
  const handleSaveDocument = async () => {
    if (!validateDocumentEditForm()) return;
    
    setIsSaving(true);
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`${API_URL}/admin/documents/${selectedItem.document_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          status: editFormData.status,
          points: parseInt(editFormData.points),
          comment: editFormData.comment || null,
          category_id: editFormData.category_id ? parseInt(editFormData.category_id) : null
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Ошибка обновления документа');
      }
      
      setEditSuccess(true);
      setIsEditing(false);
      setTimeout(() => {
        closeViewModal();
        fetchCategoryData(activeCategoryId === 'moderation' ? 'moderation' : 'documents');
      }, 1500);
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      setEditErrors(prev => ({ ...prev, global: err.message }));
    } finally {
      setIsSaving(false);
    }
  };

  // Сохранение изменений мероприятия
  const handleSaveEvent = async () => {
    const errors = {};
    if (!editFormData.event_name?.trim()) {
      errors.event_name = 'Введите название мероприятия';
    }
    if (!editFormData.event_date) {
      errors.event_date = 'Выберите дату мероприятия';
    }
    
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }
    
    setIsSaving(true);
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`${API_URL}/admin/events`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          event_name: editFormData.event_name,
          event_date: editFormData.event_date
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Ошибка обновления мероприятия');
      }
      
      setEditSuccess(true);
      setIsEditing(false);
      setTimeout(() => {
        closeViewModal();
        fetchCategoryData('events');
      }, 1500);
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      setEditErrors(prev => ({ ...prev, global: err.message }));
    } finally {
      setIsSaving(false);
    }
  };

  // Сохранение изменений модератора
  const handleSaveModerator = async () => {
    const errors = {};
    if (!editFormData.full_name?.trim()) {
      errors.full_name = 'Введите ФИО';
    }
    if (!editFormData.email?.trim()) {
      errors.email = 'Введите email';
    }
    
    if (Object.keys(errors).length > 0) {
      setEditErrors(errors);
      return;
    }
    
    setIsSaving(true);
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`${API_URL}/admin/moderators/${selectedItem.user_id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({
          full_name: editFormData.full_name,
          email: editFormData.email,
          position_name: editFormData.position_name || null
        })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Ошибка обновления модератора');
      }
      
      setEditSuccess(true);
      setIsEditing(false);
      setTimeout(() => {
        closeViewModal();
        fetchCategoryData('admins');
      }, 1500);
    } catch (err) {
      console.error('Ошибка сохранения:', err);
      setEditErrors(prev => ({ ...prev, global: err.message }));
    } finally {
      setIsSaving(false);
    }
  };

  // Получение заголовка списка в зависимости от активной категории
  const getListTitle = () => {
    switch (activeCategoryId) {
      case 'events': return 'Список мероприятий';
      case 'documents': return 'Список документов';
      case 'users': return 'Список пользователей';
      case 'admins': return 'Список модераторов';
      case 'moderation': return 'Документы не прошедшие модерацию';
      default: return 'Список';
    }
  };
  
  // Получение текста кнопки в зависимости от активной категории
  const getButtonText = () => {
    switch (activeCategoryId) {
      case 'events': return 'Создать новое мероприятие';
      case 'documents': return 'Загрузить новый документ';
      case 'users': return 'Добавить пользователя';
      case 'admins': return 'Добавить модератора';
      case 'moderation': return 'Проверить документы';
      default: return 'Добавить';
    }
  };
  
  // Получение заголовков таблицы
  const getTableHeaders = () => {
    switch (activeCategoryId) {
      case 'events':
        return [
          { label: '№', key: null },
          { label: 'Название мероприятия', key: 'event_name' },
          { label: 'Дата', key: 'event_date' }
        ];
      case 'documents':
        return [
          { label: '№', key: null },
          { label: 'Название документа', key: 'document_name' },
          { label: 'Категория', key: 'category_name' },
          { label: 'Дата получения', key: 'received_date' },
          { label: 'Баллы', key: 'points' },
          { label: 'Статус', key: 'status' }
        ];
      case 'users':
        return [
          { label: '№', key: null },
          { label: 'ФИО', key: 'full_name' },
          { label: 'Email', key: 'email' },
          { label: 'Телефон', key: 'phone_number' }
        ];
      case 'admins':
        return [
          { label: '№', key: null },
          { label: 'ФИО', key: 'full_name' },
          { label: 'Email', key: 'email' }
        ];
      case 'moderation':
        return [
          { label: '№', key: null },
          { label: 'Название документа', key: 'document_name' },
          { label: 'Категория', key: 'category_name' },
          { label: 'Дата загрузки', key: 'upload_date' }
        ];
      default:
        return [];
    }
  };
  
  // Рендер строки таблицы в зависимости от категории
  const renderTableRow = (item, index) => {
    const rowStyle = { 
      cursor: 'pointer',
      transition: 'background-color 0.2s ease'
    };
    const handleClick = () => openViewModal(item);
    const handleMouseEnter = (e) => {
      e.currentTarget.style.backgroundColor = '#e3f2fd';
    };
    const handleMouseLeave = (e) => {
      e.currentTarget.style.backgroundColor = '';
    };
    
    switch (activeCategoryId) {
      case 'events':
        return (
            <tr key={item.event_id} onClick={handleClick} style={rowStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
              <td>{index + 1}</td>
              <td>{item.event_name}</td>
              <td>{item.event_date ? new Date(item.event_date).toLocaleDateString() : '—'}</td>
            </tr>
        );
      case 'documents':
        return (
            <tr key={item.document_id} onClick={handleClick} style={rowStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
              <td>{index + 1}</td>
              <td>{item.document_name}</td>
              <td>{item.category_name || '—'}</td>
              <td>{item.received_date ? new Date(item.received_date).toLocaleDateString() : '—'}</td>
              <td>{item.points || 0}</td>
              <td>{item.status}</td>
            </tr>
        );
      case 'users':
        return (
            <tr key={item.user_id} onClick={handleClick} style={rowStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
              <td>{index + 1}</td>
              <td>{item.full_name}</td>
              <td>{item.email || '—'}</td>
              <td>{item.phone_number || '—'}</td>
            </tr>
        );
      case 'admins':
        return (
            <tr key={item.user_id} onClick={handleClick} style={rowStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
              <td>{index + 1}</td>
              <td>{item.full_name}</td>
              <td>{item.email || '—'}</td>
            </tr>
        );
      case 'moderation':
        return (
            <tr key={item.document_id} onClick={handleClick} style={rowStyle} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
              <td>{index + 1}</td>
              <td>{item.document_name}</td>
              <td>{item.category_name || '—'}</td>
              <td>{item.upload_date ? new Date(item.upload_date).toLocaleDateString() : '—'}</td>
            </tr>
        );
      default:
        return null;
    }
  };

  // Проверка интернет-подключения
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => {
      setIsOnline(false);
      setError('Соединение с интернетом потеряно. Проверьте подключение.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Проверка сессии
  useEffect(() => {
    const checkSessionTimeout = () => {
      const sessionTime = localStorage.getItem('sessionTime');
      
      if (sessionTime) {
        const sessionDate = new Date(sessionTime);
        const now = new Date();
        const diffMs = now - sessionDate;
        const SESSION_TIMEOUT_MINUTES = 240;
        const timeoutMs = SESSION_TIMEOUT_MINUTES * 60 * 1000;
        
        if (diffMs > timeoutMs) {
          localStorage.removeItem('user');
          localStorage.removeItem('userId');
          localStorage.removeItem('sessionTime');
          navigate('/login');
        }
      } else {
        navigate('/login');
      }
    };
    
    checkSessionTimeout();
    const interval = setInterval(checkSessionTimeout, 60000);
    
    return () => clearInterval(interval);
  }, [navigate]);

  // Загрузка данных админ-панели
  const [adminData, setAdminData] = useState({
    email: '',
    role: 'administrator'
  });

  // Загрузка данных админа из localStorage при монтировании
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const userObj = userStr ? JSON.parse(userStr) : null;
    
    if (userObj) {
      setAdminData({
        email: userObj.email || userObj.login || 'Администратор',
        role: userObj.role || 'administrator'
      });
    }
  }, []);

  // Загрузка данных админ-панели с сервера
  useEffect(() => {
    const fetchAdminData = async () => {
      const currentUserId = localStorage.getItem('userId');
      const userStr = localStorage.getItem('user');
      const userObj = userStr ? JSON.parse(userStr) : null;
      
      // Проверка авторизации
      if (!currentUserId || !userObj) {
        navigate('/login');
        return;
      }
      
      // Проверка прав администратора/модератора
      const isFullAdmin = userObj?.is_admin === true || userObj?.login === 'abitur';
      const isModerator = userObj?.is_moderator === true;
      const hasAccess = isFullAdmin || isModerator;

      if (!hasAccess) {
        navigate('/profile');
        return;
      }

      // Определяем роль для отображения
      setUserRole(isFullAdmin ? 'admin' : 'moderator');

      if (!navigator.onLine) {
        setError('Отсутствует подключение к интернету');
        setLoading(false);
        return;
      }

      try {  
        setLoading(false);
      } catch (err) {
        console.error('Ошибка загрузки данных:', err);
        setError('Не удалось загрузить данные');
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [navigate]);

  const navLinks = [
    { id: 1, title: 'Профиль', active: true },
    { id: 2, title: 'Таблица лидеров', active: false },
    { id: 3, title: 'О проекте', active: false, url: 'https://school.khpi.ru/liga_abitur/' },
    { id: 4, title: 'Контакты', active: false, url: 'https://taplink.cc/khpi' },
  ];

  const [activeNavId, setActiveNavId] = useState(navLinks.find(l => l.active)?.id || 1);

  const handleNavClick = (link) => {
    setActiveNavId(link.id);
    if (link.url) {
      window.open(link.url, '_blank');
    } else if (link.title === 'Таблица лидеров') {
      navigate('/leaderboard', { state: { fromAdmin: true } });
    }
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  // Фильтрация данных по поиску
  const currentData = getCurrentData();
  const filteredData = currentData.filter(item => {
    const searchLower = searchQuery.toLowerCase();
    switch (activeCategoryId) {
      case 'events':
        return item.event_name?.toLowerCase().includes(searchLower);
      case 'moderation':
        return item.document_name?.toLowerCase().includes(searchLower);
      case 'documents':
        return item.document_name?.toLowerCase().includes(searchLower) ||
            item.status?.toLowerCase().includes(searchLower);
      case 'users':
        return item.full_name?.toLowerCase().includes(searchLower) ||
            item.email?.toLowerCase().includes(searchLower) ||
            item.phone_number?.toLowerCase().includes(searchLower);
      case 'admins':
        return item.full_name?.toLowerCase().includes(searchLower) ||
            item.email?.toLowerCase().includes(searchLower);
      default:
        return false;
    }
  });
  const sortedData = React.useMemo(() => {
    if (!sortConfig.key || !currentData.length) return filteredData;
    const sorted = [...filteredData];
    sorted.sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      if (aVal === undefined) aVal = '';
      if (bVal === undefined) bVal = '';
      // Для дат
      if (sortConfig.key === 'received_date' || sortConfig.key === 'upload_date' || sortConfig.key === 'event_date') {
        aVal = aVal ? new Date(aVal) : new Date(0);
        bVal = bVal ? new Date(bVal) : new Date(0);
      }
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [filteredData, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  if (loading) {
    return (
      <div className="admin-page">
        <div className="loading">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-page">
        <div className="error">{error}</div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* Кнопка мобильного меню */}
      <button className="mobile-menu-button" onClick={toggleSidebar}>
        <span className="mobile-menu-icon"></span>
        <span className="mobile-menu-icon"></span>
        <span className="mobile-menu-icon"></span>
      </button>

      {/* Оверлей для мобильного меню */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* Шапка */}
      <header className="header">
        <div className="header__content">
          <div className="header__logos">
            <img src={LA} alt="Secondary Logo" className="header__secondary-logo" />
            <img src={khpi} alt="Logo" className="header__logo" />
          </div>
          <nav className="navigation">
            <ul className="navigation__list">
              {navLinks.map((link) => (
                <li key={link.id}>
                  <a
                    href={link.url || '#'}
                    onClick={(e) => {
                      if (!link.url) {
                        e.preventDefault();
                        handleNavClick(link);
                      }
                    }}
                    className={`navigation__link ${link.id === activeNavId ? 'navigation__link--active' : ''}`}
                  >
                    {link.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </header>

      {/* Основной контент */}
      <main className="main-content">
        {/* Боковая панель */}
        <aside className={`profile-section ${isSidebarOpen ? 'sidebar-open' : ''}`}>
          <button className="sidebar-close" onClick={() => setIsSidebarOpen(false)}>×</button>
          
          <div className="profile-section__header">
            <img src={avatar} alt="Admin" className="profile-section__avatar" />
            <h2 className="profile-section__name">{adminData.email || (userRole === 'admin' ? 'Администратор' : 'Модератор')}</h2>
            <p className="profile-section__role">{userRole === 'admin' ? 'Администратор' : 'Модератор'}</p>
          </div>

          <div className="profile-section__divider"></div>

          <ul className="profile-options">
            <li className="profile-option" onClick={() => handleCategoryClick('events')}>
              <img 
                src="https://app.codigma.io/api/uploads/2026/04/02/svg-2aa5856e-d149-490c-bbeb-708bae6ed238.svg" 
                width="32" 
                height="32" 
                alt="Icon" 
              />
              <span>Список мероприятий</span>
            </li>
            <li className="profile-option" onClick={() => handleCategoryClick('documents')}>
              <img 
                src="https://app.codigma.io/api/uploads/2026/04/02/svg-ac9ac9a4-f910-4ec5-ae06-757a9b384815.svg" 
                width="32" 
                height="32" 
                alt="Icon" 
              />
              <span>Список документов</span>
            </li>
            <li className="profile-option" onClick={() => handleCategoryClick('users')}>
              <img 
                src="https://app.codigma.io/api/uploads/2026/04/02/svg-bc78fcf7-3e36-40de-8edd-0a6d232914fb.svg" 
                width="32" 
                height="32" 
                alt="Icon" 
              />
              <span>Список пользователей</span>
            </li>
            {userRole === 'admin' && (
              <li className="profile-option" onClick={() => handleCategoryClick('admins')}>
                <img 
                  src="https://app.codigma.io/api/uploads/2026/04/02/svg-5b834d54-ace8-449c-95f1-17cf87800278.svg" 
                  width="32" 
                  height="32" 
                  alt="Icon" 
                />
                <span>Список модераторов</span>
              </li>
            )}
            <li className="profile-option" onClick={() => handleCategoryClick('moderation')}>
              <img 
                src="https://app.codigma.io/api/uploads/2026/04/02/svg-a0c26474-3ab4-4cf9-8968-2ac15cc01f45.svg" 
                width="32" 
                height="32" 
                alt="Icon" 
              />
              <span>Документы не прошедшие модерацию</span>
            </li>
          </ul>

          <div className="profile-section__divider"></div>

          <button className="profile-section__upload-button" onClick={handleUploadDocument}>
            Загрузить новый документ
          </button>

          <button className="profile-section__upload-button" onClick={handleCreateEvent}>
            Создать новое мероприятие
          </button>

          <div className="profile-section__divider"></div>

          <button className="profile-section__logout-button" onClick={handleLogout}>
            Выход
          </button>
        </aside>

        {/* Правая колонка */}
        <div className="right-column">
          {/* Статистика */}
          <div className="admin-stats__container" style={{display: 'flex', flexDirection: 'row', gap: '20px', marginBottom: '20px', marginLeft: '80px'}}>
            <div className="online-users">
              <div className="online-users__header">
                <h2>Пользователей онлайн</h2>
              </div>
              <div className="online-users__content">
                <img
                  src="https://app.codigma.io/api/uploads/2026/04/02/svg-bc78fcf7-3e36-40de-8edd-0a6d232914fb.svg"
                  alt="Users"
                  width="131"
                  height="131"
                />
                <div className="user-count">{onlineUsers} / {maxOnlineUsers}</div>
              </div>
            </div>
            <div className="registered-users">
              <div className="registered-users__header">
                <h2>Зарегистрированных пользователей</h2>
              </div>
              <div className="registered-users__content">
                <img
                  src="https://app.codigma.io/api/uploads/2026/04/02/svg-5a33b5c6-bb6e-46f0-91c7-55f00e98ca90.svg"
                  alt="Users"
                  width="131"
                  height="131"
                />
                <div className="user-count">{registeredUsers}</div>
              </div>
            </div>
          </div>

          {/* Категории */}
          <section className="admin-category-section" style={{width: '954px', marginLeft: '80px', padding: '20px 0px', marginBottom: '20px', height: 'auto', minHeight: '80px', overflow: 'hidden', background: 'white', borderRadius: '20px', boxShadow: '0px 0px 4px 1px rgba(0, 0, 0, 0.25)'}}>
            <div className="admin-category-section__categories">
              {categories.map((category) => (
                <button
                  key={category.id}
                  className={`admin-category-button ${category.id === activeCategoryId ? 'admin-category-button--active' : ''}`}
                  onClick={() => handleCategoryClick(category.id)}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </section>

          {/* Список с таблицей и поиском */}
          <section className="admin-list-section">
            <div className="admin-list-header">
              <h2 className="admin-list-title">{getListTitle()}</h2>
              {activeCategoryId !== 'moderation' && (
                <button className="admin-list-button" onClick={() => {
                  if (activeCategoryId === 'events') openCreateEventModal();
                  else if (activeCategoryId === 'documents') openAddDocumentModal();
                  else if (activeCategoryId === 'users') openAddUserModal();
                  else if (activeCategoryId === 'admins') openAddModeratorModal();
                }}>
                  {getButtonText()}
                </button>
              )}
            </div>
            
            {/* Блок поиска */}
            <div className="admin-search-block">
              <div className="admin-search-input-wrapper">
                <input
                  type="text"
                  className="admin-search-input"
                  placeholder="Поиск"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
            
            {/* Таблица */}
            <div className="admin-table-container">
              {tableLoading ? (
                  <div className="loading-table">Загрузка данных...</div>
              ) : tableError ? (
                  <div className="error-table">{tableError}</div>
              ) : (
                  <table className={`admin-table admin-table--${activeCategoryId}`}>
                    <thead>
                    <tr>
                      {getTableHeaders().map((header, index) => {
                        const isSortable = header.key;
                        const isActive = sortConfig.key === header.key;
                        const isAsc = sortConfig.direction === 'asc';

                        return (
                          <th
                            key={index}
                            onClick={() => isSortable && requestSort(header.key)}
                            style={{
                              cursor: isSortable ? 'pointer' : 'default',
                              userSelect: 'none'
                            }}
                            className={isSortable ? 'sortable-header' : ''}
                          >
                            {header.label}
                            {isSortable && (
                              <span className={`sort-icon ${isActive ? 'sort-icon--active' : 'sort-icon--inactive'}`}>
                                {isActive ? (isAsc ? ' ▲' : ' ▼') : '▲▼'}
                              </span>
                            )}
                          </th>
                        );
                      })}
                    </tr>
                    </thead>
                    <tbody>
                    {sortedData.length > 0 ? (
                        sortedData.map((item, index) => renderTableRow(item, index))
                    ) : (
                        <tr><td colSpan={getTableHeaders().length}>Нет данных</td></tr>
                    )}
                    </tbody>
                  </table>
              )}
            </div>
          </section>
        </div>
      </main>

      {/* Модальное окно добавления документа */}
      {isAddDocumentModalOpen && (
        <div className="upload-modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) closeAddDocumentModal();
        }}>
          <div className="upload-modal">
            <div className="upload-modal__header" style={{textAlign: 'center'}}>
              <h2 className="upload-modal__title">Добавить достижение пользователя</h2>
            </div>

            <div className="upload-modal__form">
              {uploadSuccess ? (
                <div className="form-success">
                  Документ успешно добавлен
                </div>
              ) : (
                <>
                  {/* Поле ФИО пользователя с поиском */}
                  <div className="form-group" style={{marginTop: '15px', position: 'relative'}}>
                    <label className="form-label">ФИО пользователя</label>
                    <div id="user-fullname-input" style={{ position: 'relative' }}>
                      <input
                        type="text"
                        className={`form-input ${uploadErrors.userFullName ? 'form-input--error' : ''}`}
                        value={userFullName}
                        onChange={handleUserFullNameChange}
                        placeholder="Введите ФИО или телефон для поиска"
                        disabled={isUploading}
                        autoComplete="off"
                      />
                      {isSearchingUsers && (
                        <span style={{
                          position: 'absolute',
                          right: '10px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#999'
                        }}>🔍</span>
                      )}
                    </div>
                    
                    {/* Выпадающий список результатов поиска */}
                    {showUserDropdown && userSearchResults.length > 0 && (
                      <div 
                        id="user-search-dropdown"
                        style={{
                          position: 'absolute',
                          top: '100%',
                          left: 0,
                          right: 0,
                          backgroundColor: 'white',
                          border: '1px solid #ddd',
                          borderRadius: '8px',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          zIndex: 1000,
                          maxHeight: '200px',
                          overflowY: 'auto',
                          marginTop: '4px'
                        }}
                      >
                        {userSearchResults.map((user) => (
                          <div
                            key={user.user_id}
                            onClick={() => handleSelectUser(user)}
                            style={{
                              padding: '12px 16px',
                              cursor: 'pointer',
                              borderBottom: '1px solid #f0f0f0',
                              transition: 'background-color 0.2s'
                            }}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                          >
                            <div style={{ fontWeight: '500', color: '#333' }}>{user.full_name}</div>
                            <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
                              {user.phone_number}
                              {user.created_by_admin && (
                                <span style={{ 
                                  marginLeft: '8px', 
                                  padding: '2px 6px', 
                                  backgroundColor: '#e3f2fd', 
                                  color: '#1976d2',
                                  borderRadius: '4px',
                                  fontSize: '11px'
                                }}>
                                  Без личного кабинета
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* Показ выбранного пользователя */}
                    {selectedUser && (
                      <div style={{
                        marginTop: '8px',
                        padding: '8px 12px',
                        backgroundColor: '#e8f5e9',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}>
                        <span style={{ fontSize: '14px', color: '#2e7d32' }}>
                          Выбран: {selectedUser.full_name}
                        </span>
                        <button
                          onClick={() => {
                            setSelectedUser(null);
                            setUserFullName('');
                            setUserPhone('');
                          }}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: '#2e7d32',
                            cursor: 'pointer',
                            fontSize: '16px',
                            padding: '0 4px'
                          }}
                          type="button"
                        >
                          ×
                        </button>
                      </div>
                    )}
                    
                    {uploadErrors.userFullName && (
                      <span className="form-error">{uploadErrors.userFullName}</span>
                    )}
                  </div>

                  {/* Поле телефона пользователя */}
                  <div className="form-group">
                    <label className="form-label">Номер телефона пользователя</label>
                    <input
                      type="tel"
                      className={`form-input ${uploadErrors.userPhone ? 'form-input--error' : ''}`}
                      value={userPhone}
                      onChange={(e) => {
                        const formattedValue = formatPhoneNumber(e.target.value);
                        setUserPhone(formattedValue);
                        if (uploadErrors.userPhone) {
                          setUploadErrors(prev => ({ ...prev, userPhone: null }));
                        }
                      }}
                      placeholder="+7 (999) 123-45-67"
                      disabled={isUploading || selectedUser !== null}
                    />
                    {selectedUser && (
                      <span style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                        Телефон подставлен автоматически из профиля
                      </span>
                    )}
                    {uploadErrors.userPhone && (
                      <span className="form-error">{uploadErrors.userPhone}</span>
                    )}
                  </div>

                  {/* Поле названия документа */}
                  <div className="form-group">
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
                      placeholder="Название документа"
                      disabled={isUploading}
                    />
                    {uploadErrors.title && (
                      <span className="form-error">{uploadErrors.title}</span>
                    )}
                  </div>

                  {/* Поле даты получения */}
                  <div className="form-group">
                    <label className="form-label">Дата получения</label>
                    <input 
                      type="date" 
                      className={`form-input ${uploadErrors.date ? 'form-input--error' : ''}`} 
                      value={receiptDate}
                      onChange={(e) => {
                        setReceiptDate(e.target.value);
                        if (uploadErrors.date) {
                          setUploadErrors(prev => ({ ...prev, date: null }));
                        }
                      }}
                      disabled={isUploading}
                    />
                    {uploadErrors.date && (
                      <span className="form-error">{uploadErrors.date}</span>
                    )}
                  </div>

                  {/* Поле категории достижения */}
                  <div className="form-group">
                    <label className="form-label">Категория достижения</label>
                    <select
                      className={`form-input ${uploadErrors.category ? 'form-input--error' : ''}`}
                      value={documentCategory}
                      onChange={(e) => {
                        const newCategory = e.target.value;
                        setDocumentCategory(newCategory);
                        setDocumentPoints(''); // Сбрасываем баллы при смене категории
                        if (uploadErrors.category) {
                          setUploadErrors(prev => ({ ...prev, category: null }));
                        }
                      }}
                      disabled={isUploading}
                      style={{ cursor: 'pointer' }}
                    >
                      <option value="">Выберите категорию</option>
                      {achievementCategories.map((cat) => (
                        <option key={cat.category_id} value={cat.category_id}>
                          {cat.category_name}
                        </option>
                      ))}
                    </select>
                    {uploadErrors.category && (
                      <span className="form-error">{uploadErrors.category}</span>
                    )}
                  </div>

                  {/* Поле баллов - ввод с подсказками */}
                  <div className="form-group">
                    <label className="form-label">Количество баллов</label>
                    <input
                      type="number"
                      min="0"
                      max="1000"
                      list="points-suggestions-upload"
                      className={`form-input ${uploadErrors.points ? 'form-input--error' : ''}`}
                      value={documentPoints}
                      onChange={(e) => {
                        setDocumentPoints(e.target.value);
                        if (uploadErrors.points) {
                          setUploadErrors(prev => ({ ...prev, points: null }));
                        }
                      }}
                      placeholder={documentCategory ? 'Введите или выберите баллы' : 'Сначала выберите категорию'}
                      disabled={isUploading || !documentCategory}
                    />
                    <datalist id="points-suggestions-upload">
                      {documentCategory && CATEGORY_POINTS_MAP[documentCategory]?.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </datalist>
                    {documentCategory && CATEGORY_MAX_POINTS[documentCategory] && (
                      <span style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                        Максимум баллов в категории: {CATEGORY_MAX_POINTS[documentCategory]}
                      </span>
                    )}
                    {uploadErrors.points && (
                      <span className="form-error">{uploadErrors.points}</span>
                    )}
                  </div>

                  {/* Область загрузки файла */}
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
                  </div>

                  {/* Глобальная ошибка */}
                  {uploadErrors.global && (
                    <div className="form-group">
                      <div style={{
                        padding: '12px 16px',
                        backgroundColor: '#ffebee',
                        border: '1px solid #ef5350',
                        borderRadius: '8px',
                        color: '#c62828',
                        fontSize: '14px'
                      }}>
                        {uploadErrors.global}
                      </div>
                    </div>
                  )}

                  {/* Кнопки */}
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
                        'Добавить документ'
                      )}
                    </button>
                    <button
                      type="button"
                      className="form-button form-button--secondary"
                      onClick={closeAddDocumentModal}
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

      {/* Модальное окно создания мероприятия */}
      {isCreateEventModalOpen && (
        <div className="upload-modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) closeCreateEventModal();
        }}>
          <div className="upload-modal">
            <div className="upload-modal__header" style={{textAlign: 'center'}}>
              <h2 className="upload-modal__title">Создать новое мероприятие</h2>
            </div>

            <div className="upload-modal__form">
              {eventSuccess ? (
                <div className="form-success">
                  Мероприятие успешно создано
                </div>
              ) : (
                <>
                  {/* Поле названия мероприятия */}
                  <div className="form-group" style={{marginTop: '15px'}}>
                    <label className="form-label">Название мероприятия</label>
                    <input
                      type="text"
                      className={`form-input ${eventErrors.eventName ? 'form-input--error' : ''}`}
                      value={eventName}
                      onChange={(e) => {
                        setEventName(e.target.value);
                        if (eventErrors.eventName) {
                          setEventErrors(prev => ({ ...prev, eventName: null }));
                        }
                      }}
                      placeholder="Введите название мероприятия"
                      disabled={isCreatingEvent}
                    />
                    {eventErrors.eventName && (
                      <span className="form-error">{eventErrors.eventName}</span>
                    )}
                  </div>

                  {/* Поле даты мероприятия */}
                  <div className="form-group">
                    <label className="form-label">Дата мероприятия</label>
                    <input 
                      type="date" 
                      className={`form-input ${eventErrors.eventDate ? 'form-input--error' : ''}`} 
                      value={eventDate}
                      onChange={(e) => {
                        setEventDate(e.target.value);
                        if (eventErrors.eventDate) {
                          setEventErrors(prev => ({ ...prev, eventDate: null }));
                        }
                      }}
                      disabled={isCreatingEvent}
                    />
                    {eventErrors.eventDate && (
                      <span className="form-error">{eventErrors.eventDate}</span>
                    )}
                  </div>

                  {/* Поле категории мероприятия */}
                  <div className="form-group">
                    <label className="form-label">Категория мероприятия</label>
                    <select
                      className={`form-input ${eventErrors.eventCategory ? 'form-input--error' : ''}`}
                      value={eventCategory}
                      onChange={(e) => {
                        setEventCategory(e.target.value);
                        if (eventErrors.eventCategory) {
                          setEventErrors(prev => ({ ...prev, eventCategory: null }));
                        }
                      }}
                      disabled={isCreatingEvent}
                      style={{ cursor: 'pointer' }}
                    >
                      <option value="">Выберите категорию</option>
                      {achievementCategories.map((cat) => (
                        <option key={cat.category_id} value={cat.category_id}>
                          {cat.category_name}
                        </option>
                      ))}
                    </select>
                    {eventErrors.eventCategory && (
                      <span className="form-error">{eventErrors.eventCategory}</span>
                    )}
                  </div>

                  {/* Кнопки */}
                  <div className="form-actions">
                    <button
                      type="button"
                      className="form-button form-button--primary"
                      onClick={handleEventSubmit}
                      disabled={isCreatingEvent}
                    >
                      {isCreatingEvent ? (
                        <>
                          <span>Создание...</span>
                          <span style={{ marginLeft: '8px' }}>⏳</span>
                        </>
                      ) : (
                        'Создать мероприятие'
                      )}
                    </button>
                    <button
                      type="button"
                      className="form-button form-button--secondary"
                      onClick={closeCreateEventModal}
                      disabled={isCreatingEvent}
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

      {/* Модальное окно добавления пользователя */}
      {isAddUserModalOpen && (
        <div className="upload-modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) closeAddUserModal();
        }}>
          <div className="upload-modal">
            <div className="upload-modal__header" style={{textAlign: 'center'}}>
              <h2 className="upload-modal__title">Добавить пользователя</h2>
            </div>

            <div className="upload-modal__form">
              {addUserSuccess ? (
                <div className="form-success">
                  Пользователь успешно добавлен
                </div>
              ) : (
                <>
                  {/* Поле ФИО */}
                  <div className="form-group" style={{marginTop: '15px'}}>
                    <label className="form-label">ФИО</label>
                    <input
                      type="text"
                      className={`form-input ${newUserErrors.fullName ? 'form-input--error' : ''}`}
                      value={newUserFullName}
                      onChange={(e) => {
                        setNewUserFullName(e.target.value);
                        if (newUserErrors.fullName) {
                          setNewUserErrors(prev => ({ ...prev, fullName: null }));
                        }
                      }}
                      placeholder="Иванов Иван Иванович"
                      disabled={isAddingUser}
                    />
                    {newUserErrors.fullName && (
                      <span className="form-error">{newUserErrors.fullName}</span>
                    )}
                  </div>

                  {/* Поле телефона */}
                  <div className="form-group">
                    <label className="form-label">Номер телефона</label>
                    <input
                      type="tel"
                      className={`form-input ${newUserErrors.phone ? 'form-input--error' : ''}`}
                      value={newUserPhone}
                      onChange={(e) => {
                        const formattedValue = formatPhoneNumber(e.target.value);
                        setNewUserPhone(formattedValue);
                        if (newUserErrors.phone) {
                          setNewUserErrors(prev => ({ ...prev, phone: null }));
                        }
                      }}
                      placeholder="+7 (999) 123-45-67"
                      disabled={isAddingUser}
                    />
                    {newUserErrors.phone && (
                      <span className="form-error">{newUserErrors.phone}</span>
                    )}
                  </div>

                  {/* Поле школы */}
                  <div className="form-group">
                    <label className="form-label">Школа (необязательно)</label>
                    <input
                      type="text"
                      className={`form-input ${newUserErrors.school ? 'form-input--error' : ''}`}
                      value={newUserSchool}
                      onChange={(e) => {
                        setNewUserSchool(e.target.value);
                        if (newUserErrors.school) {
                          setNewUserErrors(prev => ({ ...prev, school: null }));
                        }
                      }}
                      placeholder="Название школы"
                      disabled={isAddingUser}
                    />
                    {newUserErrors.school && (
                      <span className="form-error">{newUserErrors.school}</span>
                    )}
                  </div>

                  {/* Поле класса */}
                  <div className="form-group">
                    <label className="form-label">Класс/курс (необязательно)</label>
                    <input
                      type="number"
                      min="1"
                      max="11"
                      className={`form-input ${newUserErrors.class ? 'form-input--error' : ''}`}
                      value={newUserClass}
                      onChange={(e) => {
                        setNewUserClass(e.target.value);
                        if (newUserErrors.class) {
                          setNewUserErrors(prev => ({ ...prev, class: null }));
                        }
                      }}
                      placeholder="10"
                      disabled={isAddingUser}
                    />
                    {newUserErrors.class && (
                      <span className="form-error">{newUserErrors.class}</span>
                    )}
                  </div>

                  {/* Кнопки */}
                  <div className="form-actions" style={{ marginTop: '20px' }}>
                    <button
                      type="button"
                      className="form-button form-button--primary"
                      onClick={handleAddUserSubmit}
                      disabled={isAddingUser}
                      style={{ padding: '15px 20px', fontSize: '16px' }}
                    >
                      {isAddingUser ? (
                        <>
                          <span>Добавление...</span>
                          <span style={{ marginLeft: '8px' }}>⏳</span>
                        </>
                      ) : (
                        'Добавить пользователя'
                      )}
                    </button>
                    <button
                      type="button"
                      className="form-button form-button--secondary"
                      onClick={closeAddUserModal}
                      disabled={isAddingUser}
                      style={{ padding: '10px 20px', fontSize: '14px' }}
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

      {/* Модальное окно добавления модератора */}
      {isAddModeratorModalOpen && (
        <div className="upload-modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) closeAddModeratorModal();
        }}>
          <div className="upload-modal">
            <div className="upload-modal__header" style={{textAlign: 'center'}}>
              <h2 className="upload-modal__title">Добавить модератора</h2>
            </div>

            <div className="upload-modal__form">
              {addModeratorSuccess ? (
                <div className="form-success">
                  Модератор успешно добавлен
                </div>
              ) : (
                <>
                  {/* Поле ФИО */}
                  <div className="form-group" style={{marginTop: '15px'}}>
                    <label className="form-label">ФИО</label>
                    <input
                      type="text"
                      className={`form-input ${moderatorErrors.fullName ? 'form-input--error' : ''}`}
                      value={moderatorFullName}
                      onChange={(e) => {
                        setModeratorFullName(e.target.value);
                        if (moderatorErrors.fullName) {
                          setModeratorErrors(prev => ({ ...prev, fullName: null }));
                        }
                      }}
                      placeholder="Иванов Иван Иванович"
                      disabled={isAddingModerator}
                    />
                    {moderatorErrors.fullName && (
                      <span className="form-error">{moderatorErrors.fullName}</span>
                    )}
                  </div>

                  {/* Поле email */}
                  <div className="form-group">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className={`form-input ${moderatorErrors.email ? 'form-input--error' : ''}`}
                      value={moderatorEmail}
                      onChange={(e) => {
                        setModeratorEmail(e.target.value);
                        if (moderatorErrors.email) {
                          setModeratorErrors(prev => ({ ...prev, email: null }));
                        }
                      }}
                      placeholder="email@example.com"
                      disabled={isAddingModerator}
                    />
                    {moderatorErrors.email && (
                      <span className="form-error">{moderatorErrors.email}</span>
                    )}
                  </div>

                  {/* Поле телефона */}
                  <div className="form-group">
                    <label className="form-label">Номер телефона (опционально)</label>
                    <input
                      type="tel"
                      className={`form-input ${moderatorErrors.phone ? 'form-input--error' : ''}`}
                      value={moderatorPhone}
                      onChange={(e) => {
                        const formattedValue = formatPhoneNumber(e.target.value);
                        setModeratorPhone(formattedValue);
                        if (moderatorErrors.phone) {
                          setModeratorErrors(prev => ({ ...prev, phone: null }));
                        }
                      }}
                      placeholder="+7 (999) 123-45-67"
                      disabled={isAddingModerator}
                    />
                    {moderatorErrors.phone && (
                      <span className="form-error">{moderatorErrors.phone}</span>
                    )}
                  </div>

                  {/* Поле должности */}
                  <div className="form-group">
                    <label className="form-label">Должность</label>
                    <input
                      type="text"
                      className={`form-input ${moderatorErrors.position ? 'form-input--error' : ''}`}
                      value={moderatorPosition}
                      onChange={(e) => {
                        setModeratorPosition(e.target.value);
                        if (moderatorErrors.position) {
                          setModeratorErrors(prev => ({ ...prev, position: null }));
                        }
                      }}
                      placeholder="Модератор"
                      disabled={isAddingModerator}
                    />
                    {moderatorErrors.position && (
                      <span className="form-error">{moderatorErrors.position}</span>
                    )}
                  </div>

                  {/* Поле пароля */}
                  <div className="form-group">
                    <label className="form-label">Пароль</label>
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <input
                        type="text"
                        className={`form-input ${moderatorErrors.password ? 'form-input--error' : ''}`}
                        value={moderatorPassword}
                        onChange={(e) => {
                          setModeratorPassword(e.target.value);
                          if (moderatorErrors.password) {
                            setModeratorErrors(prev => ({ ...prev, password: null }));
                          }
                        }}
                      placeholder="Будет сгенерирован автоматически или введите вручную"
                        disabled={isAddingModerator}
                        style={{ flex: 1 }}
                      />
                      <button
                        type="button"
                        className="form-button form-button--primary"
                        onClick={() => {
                          const generatedPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).toUpperCase().slice(-4);
                          setModeratorPassword(generatedPassword);
                          if (moderatorErrors.password) {
                            setModeratorErrors(prev => ({ ...prev, password: null }));
                          }
                        }}
                        disabled={isAddingModerator}
                        style={{ padding: '8px 12px', fontSize: '16px', whiteSpace: 'nowrap' }}
                      >
                        Сгенерировать
                      </button>
                    </div>
                    {moderatorErrors.password && (
                      <span className="form-error">{moderatorErrors.password}</span>
                    )}
                  </div>

                  {/* Кнопки */}
                  <div className="form-actions" style={{ marginTop: '10px' }}>
                    <button
                      type="button"
                      className="form-button form-button--primary"
                      onClick={handleAddModeratorSubmit}
                      disabled={isAddingModerator}
                    >
                      {isAddingModerator ? (
                        <>
                          <span>Добавление...</span>
                          <span style={{ marginLeft: '8px' }}>⏳</span>
                        </>
                      ) : (
                        'Добавить модератора'
                      )}
                    </button>
                    <button
                      type="button"
                      className="form-button form-button--secondary"
                      onClick={closeAddModeratorModal}
                      disabled={isAddingModerator}
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

      {isViewModalOpen && selectedItem && (
        <div className="upload-modal-overlay" onClick={(e) => {
          if (e.target === e.currentTarget) closeViewModal();
        }}>
          <div className="upload-modal" style={{ maxWidth: '600px' }}>
            <div className="upload-modal__header" style={{ textAlign: 'center' }}>
              <h2 className="upload-modal__title">
                {activeCategoryId === 'documents' && 'Документ'}
                {activeCategoryId === 'users' && 'Пользователь'}
                {activeCategoryId === 'admins' && 'Модератор'}
                {activeCategoryId === 'events' && 'Мероприятие'}
                {activeCategoryId === 'moderation' && 'Документ на модерации'}
              </h2>
              <button
                onClick={closeViewModal}
                style={{
                  position: 'absolute',
                  right: '20px',
                  top: '20px',
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#666'
                }}
              >
                ×
              </button>
            </div>

            <div className="upload-modal__form">
              {editSuccess ? (
                <div className="form-success">
                  Изменения успешно сохранены
                </div>
              ) : (
                <>
                  {/* ДОКУМЕНТ  */}
                  {activeCategoryId === 'documents' && (
                    <>
                      <div className="form-group" style={{ marginTop: '15px' }}>
                        <label className="form-label">Пользователь</label>
                        <div style={{ padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '6px', fontWeight: '500' }}>
                          {selectedItem.student_name || selectedItem.full_name || '—'}
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Название документа</label>
                        {isEditing ? (
                          <>
                            <input
                              type="text"
                              className={`form-input ${editErrors.document_name ? 'form-input--error' : ''}`}
                              value={editFormData.document_name}
                              onChange={(e) => handleEditFormChange('document_name', e.target.value)}
                              disabled={isSaving}
                            />
                            {editErrors.document_name && <span className="form-error">{editErrors.document_name}</span>}
                          </>
                        ) : (
                          <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                            {selectedItem.document_name}
                          </div>
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Статус</label>
                        {isEditing ? (
                          <>
                            <select
                              className={`form-input ${editErrors.status ? 'form-input--error' : ''}`}
                              value={editFormData.status}
                              onChange={(e) => handleEditFormChange('status', e.target.value)}
                              disabled={isSaving}
                            >
                              <option value="На рассмотрении">На рассмотрении</option>
                              <option value="Одобрено">Одобрено</option>
                              <option value="Отклонено">Отклонено</option>
                            </select>
                            {editErrors.status && <span className="form-error">{editErrors.status}</span>}
                          </>
                        ) : (
                          <div style={{
                            padding: '10px',
                            backgroundColor: '#f5f5f5',
                            borderRadius: '6px',
                            color: selectedItem.status === 'Одобрено' ? '#2e7d32' :
                                   selectedItem.status === 'Отклонено' ? '#c62828' : '#f57c00',
                            fontWeight: '500'
                          }}>
                            {selectedItem.status}
                          </div>
                        )}
                      </div>

                      {/* Поле категории (только при редактировании) */}
                      <div className="form-group">
                        <label className="form-label">Категория достижения</label>
                        {isEditing ? (
                          <>
                            <select
                              className={`form-input ${editErrors.category_id ? 'form-input--error' : ''}`}
                              value={editFormData.category_id}
                              onChange={(e) => {
                                handleEditFormChange('category_id', e.target.value);
                                handleEditFormChange('points', ''); // Сбрасываем баллы при смене категории
                              }}
                              disabled={isSaving}
                              style={{ cursor: 'pointer' }}
                            >
                              <option value="">Выберите категорию</option>
                              {achievementCategories.map((cat) => (
                                <option key={cat.category_id} value={cat.category_id}>
                                  {cat.category_name}
                                </option>
                              ))}
                            </select>
                            {editErrors.category_id && <span className="form-error">{editErrors.category_id}</span>}
                          </>
                        ) : (
                          <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                            {selectedItem.category_name || '—'}
                          </div>
                        )}
                      </div>

                      {/* Поле баллов - ввод с подсказками */}
                      <div className="form-group">
                        <label className="form-label">Баллы</label>
                        {isEditing ? (
                          <>
                            <input
                              type="number"
                              min="0"
                              max="1000"
                              list="points-suggestions-edit"
                              className={`form-input ${editErrors.points ? 'form-input--error' : ''}`}
                              value={editFormData.points}
                              onChange={(e) => handleEditFormChange('points', e.target.value)}
                              placeholder={editFormData.category_id ? 'Введите или выберите баллы' : 'Сначала выберите категорию'}
                              disabled={isSaving || !editFormData.category_id}
                            />
                            <datalist id="points-suggestions-edit">
                              {editFormData.category_id && CATEGORY_POINTS_MAP[editFormData.category_id]?.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </datalist>
                            {editFormData.category_id && CATEGORY_MAX_POINTS[editFormData.category_id] && (
                              <span style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                                Максимум баллов в категории: {CATEGORY_MAX_POINTS[editFormData.category_id]}
                              </span>
                            )}
                            {editErrors.points && <span className="form-error">{editErrors.points}</span>}
                          </>
                        ) : (
                          <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                            {selectedItem.points || 0} баллов
                          </div>
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Дата получения</label>
                        <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                          {selectedItem.received_date ? new Date(selectedItem.received_date).toLocaleDateString() : '—'}
                        </div>
                      </div>

                      {selectedItem.file_path && (
                        <div className="form-group">
                          <label className="form-label">Документ</label>
                          {/* Превью документа */}
                          <div style={{
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            marginBottom: '12px',
                            backgroundColor: '#f5f5f5',
                            maxHeight: '300px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {selectedItem.file_path.toLowerCase().endsWith('.pdf') ? (
                              <iframe
                                src={`${API_URL}${selectedItem.file_path}#toolbar=0&navpanes=0&scrollbar=0`}
                                style={{ width: '100%', height: '300px', border: 'none' }}
                                title="PDF Preview"
                              />
                            ) : (
                              <img
                                src={`${API_URL}${selectedItem.file_path}`}
                                alt="Документ"
                                style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
                              />
                            )}
                          </div>
                          {/* Кнопки действий */}
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <a
                              href={`${API_URL}${selectedItem.file_path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="form-button form-button--primary"
                              style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}
                            >
                              Открыть
                            </a>
                            <a
                              href={`${API_URL}${selectedItem.file_path}`}
                              download={selectedItem.document_name || 'document'}
                              className="form-button form-button--secondary"
                              style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}
                            >
                              Скачать
                            </a>
                          </div>
                        </div>
                      )}

                      <div className="form-group">
                        <label className="form-label">
                          Комментарий
                          {isEditing && editFormData.status === 'Отклонено' && (
                            <span style={{ color: '#c62828' }}> *обязательно при отклонении</span>
                          )}
                        </label>
                        {isEditing ? (
                          <>
                            <textarea
                              className={`form-input ${editErrors.comment ? 'form-input--error' : ''}`}
                              value={editFormData.comment}
                              onChange={(e) => handleEditFormChange('comment', e.target.value)}
                              disabled={isSaving}
                              rows={3}
                              placeholder={editFormData.status === 'Отклонено' ? 'Укажите причину отклонения...' : 'Комментарий к документу...'}
                            />
                            {editErrors.comment && <span className="form-error">{editErrors.comment}</span>}
                          </>
                        ) : (
                          <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '6px', minHeight: '60px' }}>
                            {selectedItem.comment || 'Нет комментария'}
                          </div>
                        )}
                      </div>

                      {editErrors.global && (
                        <div className="form-group">
                          <div style={{
                            padding: '12px 16px',
                            backgroundColor: '#ffebee',
                            border: '1px solid #ef5350',
                            borderRadius: '8px',
                            color: '#c62828',
                            fontSize: '14px'
                          }}>
                            {editErrors.global}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* ПОЛЬЗОВАТЕЛЬ */}
                  {activeCategoryId === 'users' && (
                    <>
                      <div className="form-group" style={{ marginTop: '15px' }}>
                        <label className="form-label">ФИО</label>
                        <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                          {selectedItem.full_name}
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Email</label>
                        <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                          {selectedItem.email || '—'}
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Телефон</label>
                        <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                          {selectedItem.phone_number || '—'}
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Дата рождения</label>
                        <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                          {selectedItem.birth_date ? new Date(selectedItem.birth_date).toLocaleDateString() : '—'}
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Класс/Курс</label>
                        <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                          {selectedItem.class_course || '—'}
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Школа</label>
                        <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                          {selectedItem.school || '—'}
                        </div>
                      </div>

                      {selectedItem.created_by_admin && (
                        <div style={{
                          padding: '10px 16px',
                          backgroundColor: '#e3f2fd',
                          borderRadius: '8px',
                          color: '#1976d2',
                          fontSize: '14px',
                          marginTop: '10px'
                        }}>
                          Пользователь создан администратором (без личного кабинета)
                        </div>
                      )}
                    </>
                  )}

                  {/* МОДЕРАТОР */}
                  {activeCategoryId === 'admins' && (
                    <>
                      <div className="form-group" style={{ marginTop: '15px' }}>
                        <label className="form-label">ФИО</label>
                        {isEditing ? (
                          <>
                            <input
                              type="text"
                              className={`form-input ${editErrors.full_name ? 'form-input--error' : ''}`}
                              value={editFormData.full_name}
                              onChange={(e) => handleEditFormChange('full_name', e.target.value)}
                              disabled={isSaving}
                            />
                            {editErrors.full_name && <span className="form-error">{editErrors.full_name}</span>}
                          </>
                        ) : (
                          <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                            {selectedItem.full_name}
                          </div>
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Email</label>
                        {isEditing ? (
                          <>
                            <input
                              type="email"
                              className={`form-input ${editErrors.email ? 'form-input--error' : ''}`}
                              value={editFormData.email}
                              onChange={(e) => handleEditFormChange('email', e.target.value)}
                              disabled={isSaving}
                            />
                            {editErrors.email && <span className="form-error">{editErrors.email}</span>}
                          </>
                        ) : (
                          <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                            {selectedItem.email || '—'}
                          </div>
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Должность</label>
                        {isEditing ? (
                          <input
                            type="text"
                            className="form-input"
                            value={editFormData.position_name}
                            onChange={(e) => handleEditFormChange('position_name', e.target.value)}
                            disabled={isSaving}
                            placeholder="Должность модератора"
                          />
                        ) : (
                          <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                            {selectedItem.position_name || '—'}
                          </div>
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Дата регистрации</label>
                        <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                          {selectedItem.registration_date ? new Date(selectedItem.registration_date).toLocaleDateString() : '—'}
                        </div>
                      </div>

                      {editErrors.global && (
                        <div className="form-group">
                          <div style={{
                            padding: '12px 16px',
                            backgroundColor: '#ffebee',
                            border: '1px solid #ef5350',
                            borderRadius: '8px',
                            color: '#c62828',
                            fontSize: '14px'
                          }}>
                            {editErrors.global}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* МЕРОПРИЯТИЕ */}
                  {activeCategoryId === 'events' && (
                    <>
                      <div className="form-group" style={{ marginTop: '15px' }}>
                        <label className="form-label">Название мероприятия</label>
                        {isEditing ? (
                          <>
                            <input
                              type="text"
                              className={`form-input ${editErrors.event_name ? 'form-input--error' : ''}`}
                              value={editFormData.event_name}
                              onChange={(e) => handleEditFormChange('event_name', e.target.value)}
                              disabled={isSaving}
                            />
                            {editErrors.event_name && <span className="form-error">{editErrors.event_name}</span>}
                          </>
                        ) : (
                          <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                            {selectedItem.event_name}
                          </div>
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Дата</label>
                        {isEditing ? (
                          <>
                            <input
                              type="date"
                              className={`form-input ${editErrors.event_date ? 'form-input--error' : ''}`}
                              value={editFormData.event_date}
                              onChange={(e) => handleEditFormChange('event_date', e.target.value)}
                              disabled={isSaving}
                            />
                            {editErrors.event_date && <span className="form-error">{editErrors.event_date}</span>}
                          </>
                        ) : (
                          <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                            {selectedItem.event_date ? new Date(selectedItem.event_date).toLocaleDateString() : '—'}
                          </div>
                        )}
                      </div>

                      {editErrors.global && (
                        <div className="form-group">
                          <div style={{
                            padding: '12px 16px',
                            backgroundColor: '#ffebee',
                            border: '1px solid #ef5350',
                            borderRadius: '8px',
                            color: '#c62828',
                            fontSize: '14px'
                          }}>
                            {editErrors.global}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* МОДЕРАЦИЯ */}
                  {activeCategoryId === 'moderation' && (
                    <>
                      <div className="form-group" style={{ marginTop: '15px' }}>
                        <label className="form-label">Пользователь</label>
                        <div style={{ padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '6px', fontWeight: '500' }}>
                          {selectedItem.student_name || '—'}
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Название документа</label>
                        <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                          {selectedItem.document_name}
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Дата загрузки</label>
                        <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                          {selectedItem.upload_date ? new Date(selectedItem.upload_date).toLocaleDateString() : '—'}
                        </div>
                      </div>

                      {/* Поле категории */}
                      <div className="form-group">
                        <label className="form-label">Категория достижения</label>
                        {isEditing ? (
                          <>
                            <select
                              className={`form-input ${editErrors.category_id ? 'form-input--error' : ''}`}
                              value={editFormData.category_id}
                              onChange={(e) => {
                                handleEditFormChange('category_id', e.target.value);
                                handleEditFormChange('points', ''); // Сбрасываем баллы при смене категории
                              }}
                              disabled={isSaving}
                              style={{ cursor: 'pointer' }}
                            >
                              <option value="">Выберите категорию</option>
                              {achievementCategories.map((cat) => (
                                <option key={cat.category_id} value={cat.category_id}>
                                  {cat.category_name}
                                </option>
                              ))}
                            </select>
                            {editErrors.category_id && <span className="form-error">{editErrors.category_id}</span>}
                          </>
                        ) : (
                          <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                            {selectedItem.category_name || '—'}
                          </div>
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Статус</label>
                        {isEditing ? (
                          <>
                            <select
                              className={`form-input ${editErrors.status ? 'form-input--error' : ''}`}
                              value={editFormData.status}
                              onChange={(e) => handleEditFormChange('status', e.target.value)}
                              disabled={isSaving}
                            >
                              <option value="На рассмотрении">На рассмотрении</option>
                              <option value="Одобрено">Одобрено</option>
                              <option value="Отклонено">Отклонено</option>
                            </select>
                            {editErrors.status && <span className="form-error">{editErrors.status}</span>}
                          </>
                        ) : (
                          <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                            {selectedItem.status}
                          </div>
                        )}
                      </div>

                      {/* Поле баллов - ввод с подсказками */}
                      <div className="form-group">
                        <label className="form-label">Баллы</label>
                        {isEditing ? (
                          <>
                            <input
                              type="number"
                              min="0"
                              max="1000"
                              list="points-suggestions-moderation"
                              className={`form-input ${editErrors.points ? 'form-input--error' : ''}`}
                              value={editFormData.points}
                              onChange={(e) => handleEditFormChange('points', e.target.value)}
                              placeholder={editFormData.category_id ? 'Введите или выберите баллы' : 'Сначала выберите категорию'}
                              disabled={isSaving || !editFormData.category_id}
                            />
                            <datalist id="points-suggestions-moderation">
                              {editFormData.category_id && CATEGORY_POINTS_MAP[editFormData.category_id]?.map((option) => (
                                <option key={option.value} value={option.value}>
                                  {option.label}
                                </option>
                              ))}
                            </datalist>
                            {editFormData.category_id && CATEGORY_MAX_POINTS[editFormData.category_id] && (
                              <span style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                                Максимум баллов в категории: {CATEGORY_MAX_POINTS[editFormData.category_id]}
                              </span>
                            )}
                            {editErrors.points && <span className="form-error">{editErrors.points}</span>}
                          </>
                        ) : (
                          <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '6px' }}>
                            {selectedItem.points || 0} баллов
                          </div>
                        )}
                      </div>

                      {selectedItem.file_path && (
                        <div className="form-group">
                          <label className="form-label">Документ</label>
                          {/* Превью документа */}
                          <div style={{
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            marginBottom: '12px',
                            backgroundColor: '#f5f5f5',
                            maxHeight: '300px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            {selectedItem.file_path.toLowerCase().endsWith('.pdf') ? (
                              <iframe
                                src={`${API_URL}${selectedItem.file_path}#toolbar=0&navpanes=0&scrollbar=0`}
                                style={{ width: '100%', height: '300px', border: 'none' }}
                                title="PDF Preview"
                              />
                            ) : (
                              <img
                                src={`${API_URL}${selectedItem.file_path}`}
                                alt="Документ"
                                style={{ maxWidth: '100%', maxHeight: '300px', objectFit: 'contain' }}
                              />
                            )}
                          </div>
                          {/* Кнопки действий */}
                          <div style={{ display: 'flex', gap: '10px' }}>
                            <a
                              href={`${API_URL}${selectedItem.file_path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="form-button form-button--primary"
                              style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}
                            >
                              Открыть
                            </a>
                            <a
                              href={`${API_URL}${selectedItem.file_path}`}
                              download={selectedItem.document_name || 'document'}
                              className="form-button form-button--secondary"
                              style={{ flex: 1, textDecoration: 'none', textAlign: 'center' }}
                            >
                              Скачать
                            </a>
                          </div>
                        </div>
                      )}

                      <div className="form-group">
                        <label className="form-label">
                          Комментарий
                          {isEditing && editFormData.status === 'Отклонено' && (
                            <span style={{ color: '#c62828' }}> *обязательно при отклонении</span>
                          )}
                        </label>
                        {isEditing ? (
                          <>
                            <textarea
                              className={`form-input ${editErrors.comment ? 'form-input--error' : ''}`}
                              value={editFormData.comment}
                              onChange={(e) => handleEditFormChange('comment', e.target.value)}
                              disabled={isSaving}
                              rows={3}
                              placeholder={editFormData.status === 'Отклонено' ? 'Укажите причину отклонения...' : 'Комментарий к документу...'}
                            />
                            {editErrors.comment && <span className="form-error">{editErrors.comment}</span>}
                          </>
                        ) : (
                          <div style={{ padding: '10px', backgroundColor: '#f5f5f5', borderRadius: '6px', minHeight: '60px' }}>
                            {selectedItem.comment || 'Нет комментария'}
                          </div>
                        )}
                      </div>

                      {editErrors.global && (
                        <div className="form-group">
                          <div style={{
                            padding: '12px 16px',
                            backgroundColor: '#ffebee',
                            border: '1px solid #ef5350',
                            borderRadius: '8px',
                            color: '#c62828',
                            fontSize: '14px'
                          }}>
                            {editErrors.global}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Кнопки действий */}
                  <div className="form-actions" style={{ marginTop: '20px' }}>
                    {activeCategoryId === 'documents' && (
                      <>
                        {isEditing ? (
                          <button
                            type="button"
                            className="form-button form-button--primary"
                            onClick={handleSaveDocument}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <>
                                <span>Сохранение...</span>
                                <span style={{ marginLeft: '8px' }}>⏳</span>
                              </>
                            ) : (
                              'Сохранить изменения'
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="form-button form-button--primary"
                            onClick={toggleEditMode}
                            disabled={isSaving}
                          >
                            Редактировать
                          </button>
                        )}
                      </>
                    )}

                    {activeCategoryId === 'admins' && (
                      <>
                        {isEditing ? (
                          <button
                            type="button"
                            className="form-button form-button--primary"
                            onClick={handleSaveModerator}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <>
                                <span>Сохранение...</span>
                                <span style={{ marginLeft: '8px' }}>⏳</span>
                              </>
                            ) : (
                              'Сохранить изменения'
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="form-button form-button--primary"
                            onClick={toggleEditMode}
                            disabled={isSaving}
                          >
                            Редактировать
                          </button>
                        )}
                      </>
                    )}

                    {activeCategoryId === 'events' && (
                      <>
                        {isEditing ? (
                          <button
                            type="button"
                            className="form-button form-button--primary"
                            onClick={handleSaveEvent}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <>
                                <span>Сохранение...</span>
                                <span style={{ marginLeft: '8px' }}>⏳</span>
                              </>
                            ) : (
                              'Сохранить изменения'
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="form-button form-button--primary"
                            onClick={toggleEditMode}
                            disabled={isSaving}
                          >
                            Редактировать
                          </button>
                        )}
                      </>
                    )}

                    {activeCategoryId === 'moderation' && (
                      <>
                        {isEditing ? (
                          <button
                            type="button"
                            className="form-button form-button--primary"
                            onClick={handleSaveDocument}
                            disabled={isSaving}
                          >
                            {isSaving ? (
                              <>
                                <span>Сохранение...</span>
                                <span style={{ marginLeft: '8px' }}>⏳</span>
                              </>
                            ) : (
                              'Сохранить изменения'
                            )}
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="form-button form-button--primary"
                            onClick={toggleEditMode}
                            disabled={isSaving}
                          >
                            Редактировать
                          </button>
                        )}
                      </>
                    )}

                    {/* Кнопка отмены редактирования */}
                    {isEditing && (
                      <button
                        type="button"
                        className="form-button form-button--secondary"
                        onClick={toggleEditMode}
                        disabled={isSaving}
                      >
                        Отмена
                      </button>
                    )}

                    {/* Кнопка закрытия для режима просмотра */}
                    {!isEditing && (
                      <button
                        type="button"
                        className="form-button form-button--secondary"
                        onClick={closeViewModal}
                        disabled={isSaving}
                      >
                        Закрыть
                      </button>
                    )}
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

export default AdminPanel;
