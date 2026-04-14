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

const isDataEqual = (a, b) => {
  if (a === b) return true;
  if (!a || !b) return false;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, index) => isDataEqual(item, b[index]));
  }
  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    return keysA.every(key => isDataEqual(a[key], b[key]));
  }
  return false;
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

  // Состояния для валидации баллов при добавлении документа
  const [uploadAvailablePoints, setUploadAvailablePoints] = useState(null);
  const [uploadCategoryStats, setUploadCategoryStats] = useState(null);
  const [isLoadingUploadPoints, setIsLoadingUploadPoints] = useState(false);

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
  const [selectedUserTotalPoints, setSelectedUserTotalPoints] = useState(0);
  const [selectedUserDocuments, setSelectedUserDocuments] = useState([]);

  // Состояния для валидации баллов (доступные баллы категории)
  const [editAvailablePoints, setEditAvailablePoints] = useState(null);
  const [editCategoryStats, setEditCategoryStats] = useState(null);
  const [isLoadingEditPoints, setIsLoadingEditPoints] = useState(false);

  // Состояния для редактирования пользователя в документе
  const [editUserSearchResults, setEditUserSearchResults] = useState([]);
  const [showEditUserDropdown, setShowEditUserDropdown] = useState(false);
  const [isSearchingEditUser, setIsSearchingEditUser] = useState(false);
  const editUserSearchTimeoutRef = React.useRef(null);

  // Данные для админ-панели
  const [onlineUsers, setOnlineUsers] = useState(150);
  const [maxOnlineUsers, setMaxOnlineUsers] = useState(150);
  const [registeredUsers, setRegisteredUsers] = useState(234);

  // Данные и сортировка для таблицы категорий достижений
  const [categoriesStatsData, setCategoriesStatsData] = useState([]);
  const [categorySortConfig, setCategorySortConfig] = useState({ key: null, direction: 'asc' });
  const [categoriesStatsLoading, setCategoriesStatsLoading] = useState(false);
  const [categoriesStatsError, setCategoriesStatsError] = useState(null);

  // WebSocket
  useEffect(() => {
    let websocket = null;
    let updateInterval = null;

    try {
      const wsUrl = API_URL.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws';
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
  const fetchCategoryData = async (categoryId, silent = false) => {
    if (!silent) {
      setTableLoading(true);
    }
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
      let currentData = null;
      switch (categoryId) {
        case 'events':
          url = `${API_URL}/admin/events`;
          setter = setEventsData;
          currentData = eventsData;
          break;
        case 'documents':
          url = `${API_URL}/admin/documents`;
          setter = setDocumentsData;
          currentData = documentsData;
          break;
        case 'users':
          url = `${API_URL}/admin/users`;
          setter = setUsersData;
          currentData = usersData;
          break;
        case 'admins':
          url = `${API_URL}/admin/moderators`;
          setter = setAdminsData;
          currentData = adminsData;
          break;
        case 'moderation':
          url = `${API_URL}/admin/documents/pending`;
          setter = setModerationData;
          currentData = moderationData;
          break;
        default:
          return;
      }
      const response = await fetch(url, {
        headers: { 'x-user-id': userId }
      });
      if (!response.ok) throw new Error('Ошибка загрузки данных');
      const data = await response.json();
      // Обновляем состояние только если данные изменились
      if (!isDataEqual(data, currentData)) {
        setter(data);
      }
    } catch (err) {
      console.error(`Error fetching ${categoryId}:`, err);
      setTableError('Не удалось загрузить данные. Попробуйте позже.');
    } finally {
      if (!silent) {
        setTableLoading(false);
      }
    }
  };

  // Функция загрузки статистики категорий (количество достижений)
  const fetchCategoriesStats = async (silent = false) => {
    if (!silent) {
      setCategoriesStatsLoading(true);
    }
    setCategoriesStatsError(null);
    try {
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setCategoriesStatsError('Не авторизован');
        setCategoriesStatsLoading(false);
        return;
      }
      const response = await fetch(`${API_URL}/admin/categories/stats`, {
        headers: { 'x-user-id': userId }
      });
      if (!response.ok) throw new Error('Ошибка загрузки статистики категорий');
      const data = await response.json();
      // Обновляем состояние только если данные изменились
      if (!isDataEqual(data, categoriesStatsData)) {
        setCategoriesStatsData(data);
      }
    } catch (err) {
      console.error('Ошибка загрузки статистики категорий:', err);
      setCategoriesStatsError('Не удалось загрузить статистику');
    } finally {
      if (!silent) {
        setCategoriesStatsLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchCategoryData(activeCategoryId);
    fetchCategoriesStats();
    
    const tableUpdateInterval = setInterval(() => {
      fetchCategoryData(activeCategoryId, true);
      fetchCategoriesStats(true);
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

  // Autocomplete состояния
  const [searchResults, setSearchResults] = useState([]);
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeoutRef = React.useRef(null);

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    localStorage.removeItem('sessionTime');
    navigate('/login');
  };

  // Autocomplete поиск для таблиц
  const performSearch = async (query) => {
    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setShowSearchDropdown(false);
      return;
    }

    setIsSearching(true);
    try {
      const userId = localStorage.getItem('userId');
      let url = '';
      
      switch (activeCategoryId) {
        case 'users':
          url = `${API_URL}/admin/users/search?query=${encodeURIComponent(query)}`;
          break;
        case 'documents':
        case 'moderation':
          url = `${API_URL}/admin/documents/search?query=${encodeURIComponent(query)}`;
          break;
        case 'events':
          url = `${API_URL}/admin/events/search?query=${encodeURIComponent(query)}`;
          break;
        case 'admins':
          url = `${API_URL}/admin/moderators/search?query=${encodeURIComponent(query)}`;
          break;
        default:
          return;
      }

      const response = await fetch(url, {
        headers: { 'x-user-id': userId }
      });

      if (response.ok) {
        const data = await response.json();
        let results = [];
        switch (activeCategoryId) {
          case 'users':
            results = data.users || [];
            break;
          case 'documents':
          case 'moderation':
            results = data.documents || [];
            break;
          case 'events':
            results = data.events || [];
            break;
          case 'admins':
            results = data.moderators || [];
            break;
        }
        setSearchResults(results);
        setShowSearchDropdown(results.length > 0);
      }
    } catch (err) {
      console.error('Ошибка поиска:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Обработка ввода в поле поиска
  const handleSearchInputChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!value || value.trim().length < 2) {
      setShowSearchDropdown(false);
      setSearchResults([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      performSearch(value);
    }, 300);
  };

  // Выбор результата из dropdown
  const handleSelectSearchResult = (item) => {
    let displayText = '';
    switch (activeCategoryId) {
      case 'users':
        displayText = item.full_name;
        break;
      case 'documents':
      case 'moderation':
        displayText = item.document_name;
        break;
      case 'events':
        displayText = item.event_name;
        break;
      case 'admins':
        displayText = item.full_name;
        break;
    }
    setSearchQuery(displayText);
    setShowSearchDropdown(false);
    setSearchResults([]);
  };

  // Закрытие dropdown при клике вне
  useEffect(() => {
    const handleClickOutside = (event) => {
      const dropdown = document.getElementById('search-autocomplete-dropdown');
      const input = document.getElementById('search-autocomplete-input');
      if (dropdown && !dropdown.contains(event.target) && !input.contains(event.target)) {
        setShowSearchDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUploadDocument = () => {
    openAddDocumentModal();
  };

  // Открыть модальное окно добавления документа
  const openAddDocumentModal = async () => {
    setIsAddDocumentModalOpen(true);
    
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
    // Сброс состояний доступных баллов
    setUploadAvailablePoints(null);
    setUploadCategoryStats(null);
    setIsLoadingUploadPoints(false);
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
    // Если есть выбранная категория, загружаем доступные баллы
    if (documentCategory) {
      fetchUploadAvailablePoints(user.user_id, documentCategory);
    }
  };

  // Обработка изменения категории в форме загрузки
  const handleDocumentCategoryChange = (categoryId) => {
    setDocumentCategory(categoryId);
    setUploadErrors(prev => ({ ...prev, category: null, points: null }));
    // Если есть выбранный пользователь, загружаем доступные баллы
    const targetUserId = selectedUser?.user_id;
    if (targetUserId && categoryId) {
      fetchUploadAvailablePoints(targetUserId, categoryId);
    }
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

  // Функция для получения доступных баллов для формы загрузки
  const fetchUploadAvailablePoints = async (userId, categoryId) => {
    if (!userId || !categoryId) return;

    setIsLoadingUploadPoints(true);
    try {
      const currentUserId = localStorage.getItem('userId');
      const url = `${API_URL}/admin/users/${userId}/category/${categoryId}/available-points`;

      const response = await fetch(url, {
        headers: { 'x-user-id': currentUserId }
      });

      if (response.ok) {
        const data = await response.json();
        setUploadCategoryStats(data);
        setUploadAvailablePoints(data.available_points);
      }
    } catch (err) {
      console.error('Ошибка получения доступных баллов:', err);
    } finally {
      setIsLoadingUploadPoints(false);
    }
  };

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
      }
      // Проверка против доступных баллов с сервера
      else if (uploadAvailablePoints !== null && pointsNum > uploadAvailablePoints) {
        errors.points = `Превышен лимит! Доступно: ${uploadAvailablePoints} из ${uploadCategoryStats?.max_points || '?'} баллов`;
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
  };

  const closeAddUserModal = () => {
    if (isAddingUser) return;
    setIsAddUserModalOpen(false);
    resetAddUserForm();
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
  };

  const closeAddModeratorModal = () => {
    if (isAddingModerator) return;
    setIsAddModeratorModalOpen(false);
    resetAddModeratorForm();
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
        position_name: moderatorPosition.trim(),
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
  const openViewModal = async (item, categoryOverride = null) => {
    setSelectedItem(item);
    setIsEditing(false);
    setEditErrors({});
    setEditSuccess(false);

    // Определяем категорию: либо переданную явно, либо текущую активную
    const effectiveCategory = categoryOverride || activeCategoryId;

    // Для пользователей загружаем полные данные (с родителями) и суммарные баллы
    if (effectiveCategory === 'users' && item.user_id) {
      try {
        const userId = localStorage.getItem('userId');
        const response = await fetch(`${API_URL}/admin/users/${item.user_id}`, {
          headers: { 'x-user-id': userId }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.status === 'yea' && data.user) {
            setSelectedItem(data.user);
          }
        }
        // Загружаем суммарные баллы пользователя
        const pointsResponse = await fetch(`${API_URL}/profile/${item.user_id}/total-points`);
        if (pointsResponse.ok) {
          const pointsData = await pointsResponse.json();
          setSelectedUserTotalPoints(pointsData.total_points || 0);
        } else {
          setSelectedUserTotalPoints(0);
        }

        // Загружаем документы пользователя
        const docsResponse = await fetch(`${API_URL}/admin/users/${item.user_id}/documents`, {
          headers: { 'x-user-id': userId }
        });
        console.log('Docs response status:', docsResponse.status);
        if (docsResponse.ok) {
          const docsData = await docsResponse.json();
          console.log('Docs data:', docsData);
          console.log('Docs array:', docsData.documents);
          console.log('Docs count:', docsData.documents?.length);
          setSelectedUserDocuments(docsData.documents || []);
        } else {
          console.log('Docs response not ok:', await docsResponse.text());
          setSelectedUserDocuments([]);
        }
      } catch (err) {
        console.error('Ошибка загрузки данных пользователя:', err);
        setSelectedUserTotalPoints(0);
        setSelectedUserDocuments([]);
      }
    }

    if ((effectiveCategory === 'documents' || effectiveCategory === 'moderation') && achievementCategories.length === 0) {
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
    switch (effectiveCategory) {
      case 'documents':
        setEditFormData({
          document_name: item.document_name || '',
          status: item.status || 'На рассмотрении',
          points: item.points || 0,
          comment: item.comment || '',
          received_date: item.received_date ? new Date(item.received_date).toISOString().split('T')[0] : '',
          category_id: item.category_id || '',
          student_name: item.student_name || item.full_name || '',
          user_id: item.user_id || ''
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
          position_name: item.position_name || ''
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
          category_id: item.category_id || '',
          student_name: item.student_name || item.full_name || '',
          user_id: item.user_id || ''
        });
        // Загружаем доступные баллы если есть категория и пользователь
        if (item.category_id && item.user_id) {
          fetchAvailablePoints(item.user_id, item.category_id, item.document_id);
        }
        break;
      default:
        setEditFormData({});
    }

    setIsViewModalOpen(true);
  };

  // Скачивание файла через диалог сохранения
  const handleDownloadFile = async (e, documentId, documentName) => {
    e.stopPropagation();
    if (!documentId) {
      alert('Документ не найден');
      return;
    }
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`${API_URL}/download/${documentId}`, {
        headers: { 'x-user-id': userId }
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Ошибка загрузки файла');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = documentName || 'document';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Ошибка скачивания:', err);
      alert(err.message || 'Не удалось скачать файл');
    }
  };

  // Закрыть модальное окно просмотра
  const closeViewModal = () => {
    if (isSaving) return;
    setIsViewModalOpen(false);
    setSelectedItem(null);
    setIsEditing(false);
    setEditFormData({});
    setEditErrors({});
    setSelectedUserTotalPoints(0);
    setSelectedUserDocuments([]);
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

  // Функция для получения доступных баллов категории
  const fetchAvailablePoints = async (userId, categoryId, excludeDocumentId = null) => {
    if (!userId || !categoryId) return;
    
    setIsLoadingEditPoints(true);
    try {
      const currentUserId = localStorage.getItem('userId');
      let url = `${API_URL}/admin/users/${userId}/category/${categoryId}/available-points`;
      if (excludeDocumentId) {
        url += `?exclude_document_id=${excludeDocumentId}`;
      }
      
      const response = await fetch(url, {
        headers: { 'x-user-id': currentUserId }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEditCategoryStats(data);
        setEditAvailablePoints(data.available_points);
      }
    } catch (err) {
      console.error('Ошибка получения доступных баллов:', err);
    } finally {
      setIsLoadingEditPoints(false);
    }
  };

  // Обработка изменения полей формы редактирования
  const handleEditFormChange = (field, value) => {
    setEditFormData(prev => ({ ...prev, [field]: value }));
    if (editErrors[field]) {
      setEditErrors(prev => ({ ...prev, [field]: null }));
    }
    
    // При изменении категории или пользователя - обновляем доступные баллы
    if (field === 'category_id' && value) {
      const userId = selectedItem?.user_id;
      if (userId) {
        fetchAvailablePoints(userId, value, selectedItem?.document_id);
      }
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
      }
      // Проверка против доступных баллов с сервера (только при одобрении)
      else if (editFormData.status === 'Одобрено' && editAvailablePoints !== null && pointsNum > editAvailablePoints) {
        errors.points = `Превышен лимит! Доступно: ${editAvailablePoints} из ${editCategoryStats?.max_points || '?'} баллов`;
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
          category_id: editFormData.category_id ? parseInt(editFormData.category_id) : null,
          user_id: editFormData.user_id || selectedItem.user_id
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
          position_name: editFormData.position_name?.trim() || null
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

  // Удаление модератора
  const handleDeleteModerator = async () => {
    if (!selectedItem || !selectedItem.user_id) return;
    
    const confirmed = window.confirm(
      `Вы уверены, что хотите удалить модератора "${selectedItem.full_name}"?\n\nЭто действие нельзя отменить.`
    );
    
    if (!confirmed) return;
    
    setIsSaving(true);
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`${API_URL}/admin/moderators/${selectedItem.user_id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': userId
        }
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Ошибка удаления модератора');
      }
      
      closeViewModal();
      fetchCategoryData('admins');
      alert('Модератор успешно удален');
    } catch (err) {
      console.error('Ошибка удаления:', err);
      alert(err.message || 'Не удалось удалить модератора');
    } finally {
      setIsSaving(false);
    }
  };

  // Удаление документа (заглушка)
  const handleDeleteDocument = async () => {
    alert('Функция удаления документа временно отключена');
  };

  // Поиск пользователя при редактировании документа
  const handleEditUserSearchChange = async (value) => {
    setEditFormData(prev => ({ ...prev, student_name: value }));

    if (editUserSearchTimeoutRef.current) {
      clearTimeout(editUserSearchTimeoutRef.current);
    }

    if (!value || value.trim().length < 2) {
      setShowEditUserDropdown(false);
      setEditUserSearchResults([]);
      return;
    }

    setIsSearchingEditUser(true);
    editUserSearchTimeoutRef.current = setTimeout(async () => {
      try {
        const userId = localStorage.getItem('userId');
        const response = await fetch(
          `${API_URL}/admin/users/search?query=${encodeURIComponent(value)}`,
          { headers: { 'x-user-id': userId } }
        );

        if (response.ok) {
          const data = await response.json();
          setEditUserSearchResults(data.users || []);
          setShowEditUserDropdown(data.users && data.users.length > 0);
        }
      } catch (err) {
        console.error('Ошибка поиска пользователей:', err);
      } finally {
        setIsSearchingEditUser(false);
      }
    }, 300);
  };

  // Выбор пользователя при редактировании документа
  const handleSelectEditUser = (user) => {
    setEditFormData(prev => ({
      ...prev,
      student_name: user.full_name,
      user_id: user.user_id
    }));
    setShowEditUserDropdown(false);
    setEditUserSearchResults([]);
  };

  // Подтверждение/отмена подтверждения аккаунта пользователя
  const handleVerifyUser = async () => {
    if (!selectedItem || !selectedItem.user_id) return;
    
    const newVerifiedStatus = !selectedItem.is_verified;
    const actionText = newVerifiedStatus ? 'подтвердить' : 'отменить подтверждение';
    
    const confirmed = window.confirm(
      `Вы уверены, что хотите ${actionText} аккаунт пользователя "${selectedItem.full_name}"?`
    );
    
    if (!confirmed) return;
    
    setIsSaving(true);
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`${API_URL}/admin/users/${selectedItem.user_id}/verify`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({ is_verified: newVerifiedStatus })
      });
      
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || 'Ошибка изменения статуса подтверждения');
      }
      
      const data = await response.json();
      
      // Обновляем selectedItem
      setSelectedItem(prev => ({ ...prev, is_verified: newVerifiedStatus }));
      
      // Обновляем список пользователей
      fetchCategoryData('users');
      
      alert(data.message || 'Статус подтверждения изменен');
    } catch (err) {
      console.error('Ошибка изменения статуса:', err);
      alert(err.message || 'Не удалось изменить статус подтверждения');
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
          { label: 'Телефон', key: 'phone_number' },
          { label: 'Статус', key: 'is_verified' }
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
              <td style={{ width: '5%' }}>{index + 1}</td>
              <td style={{ width: '15%' }}>{item.full_name}</td>
              <td style={{ width: '30%' }}>{item.email || '—'}</td>
              <td style={{ width: '25%' }}>{item.phone_number || '—'}</td>
              <td style={{ width: '30%', textAlign: 'center' }}>
                <span style={{
                  padding: '4px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: '500',
                  backgroundColor: item.is_verified ? '#4caf50' : '#ff9800',
                  color: 'white'
                }}>
                  {item.is_verified ? 'Подтвержден' : 'Не подтвержден'}
                </span>
              </td>
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
        return item.document_name?.toLowerCase().includes(searchLower) ||
            item.student_name?.toLowerCase().includes(searchLower);
      case 'documents':
        return item.document_name?.toLowerCase().includes(searchLower) ||
            item.status?.toLowerCase().includes(searchLower) ||
            item.student_name?.toLowerCase().includes(searchLower);
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

  // Сортировка данных категорий
  const sortedCategoriesData = React.useMemo(() => {
    if (!categorySortConfig.key) return categoriesStatsData;
    const sorted = [...categoriesStatsData];
    sorted.sort((a, b) => {
      let aVal = a[categorySortConfig.key];
      let bVal = b[categorySortConfig.key];
      if (aVal === undefined) aVal = '';
      if (bVal === undefined) bVal = '';
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return categorySortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return categorySortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [categoriesStatsData, categorySortConfig]);

  const requestCategorySort = (key) => {
    let direction = 'asc';
    if (categorySortConfig.key === key && categorySortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setCategorySortConfig({ key, direction });
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
          <div className="admin-stats__container">
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

          {/* Таблица категорий достижений */}
          <div className="admin-stats__container">
            <section className="admin-categories-table-section">
            <div className="admin-categories-table-header">
              <h2>Лидирующие категории</h2>
            </div>
            <div className="admin-categories-table-container">
              {categoriesStatsLoading ? (
                  <div className="loading-table">Загрузка статистики...</div>
              ) : categoriesStatsError ? (
                  <div className="error-table">{categoriesStatsError}</div>
              ) : (
                  <table className="admin-table admin-table--categories">
                    <thead>
                    <tr>
                      <th
                          onClick={() => requestCategorySort('category_name')}
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                          className="sortable-header"
                      >
                        Название категории
                        <span className={`sort-icon ${categorySortConfig.key === 'category_name' ? 'sort-icon--active' : 'sort-icon--inactive'}`}>
                {categorySortConfig.key === 'category_name' ? (categorySortConfig.direction === 'asc' ? ' ▲' : ' ▼') : '▲▼'}
              </span>
                      </th>
                      <th
                          onClick={() => requestCategorySort('achievement_count')}
                          style={{ cursor: 'pointer', userSelect: 'none' }}
                          className="sortable-header"
                      >
                        Количество достижений
                        <span className={`sort-icon ${categorySortConfig.key === 'achievement_count' ? 'sort-icon--active' : 'sort-icon--inactive'}`}>
                {categorySortConfig.key === 'achievement_count' ? (categorySortConfig.direction === 'asc' ? ' ▲' : ' ▼') : '▲▼'}
              </span>
                      </th>
                    </tr>
                    </thead>
                    <tbody>
                    {sortedCategoriesData.length > 0 ? (
                        sortedCategoriesData.map((item) => (
                            <tr key={item.category_id}>
                              <td>{item.category_name}</td>
                              <td>{item.achievement_count}</td>
                            </tr>
                        ))
                    ) : (
                        <tr><td colSpan={2}>Нет данных</td></tr>
                    )}
                    </tbody>
                  </table>
              )}
            </div>
          </section>
          </div>

          {/* Категории */}
          <section className="admin-category-section">
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
            <div className="admin-search-block" style={{ position: 'relative' }}>
              <div className="admin-search-input-wrapper">
                <input
                  id="search-autocomplete-input"
                  type="text"
                  className="admin-search-input"
                  placeholder={
                    activeCategoryId === 'users' ? 'Поиск по ФИО, email или телефону' :
                    activeCategoryId === 'documents' || activeCategoryId === 'moderation' ? 'Поиск по названию или ФИО' :
                    activeCategoryId === 'events' ? 'Поиск по названию мероприятия' :
                    activeCategoryId === 'admins' ? 'Поиск по ФИО модератора' :
                    'Поиск'
                  }
                  value={searchQuery}
                  onChange={handleSearchInputChange}
                  autoComplete="off"
                />
                {isSearching ? (
                  <span style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#999',
                    fontSize: '14px'
                  }}>🔍</span>
                ) : (
                  <svg className="admin-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 21L15 15M17 10C17 13.866 13.866 17 10 17C6.13401 17 3 13.866 3 10C3 6.13401 6.13401 3 10 3C13.866 3 17 6.13401 17 10Z" stroke="#7878FF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </div>
              
              {/* Выпадающий список результатов поиска */}
              {showSearchDropdown && searchResults.length > 0 && (
                <div 
                  id="search-autocomplete-dropdown"
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
                    maxHeight: '250px',
                    overflowY: 'auto',
                    marginTop: '4px'
                  }}
                >
                  {searchResults.map((item, index) => (
                    <div
                      key={item.user_id || item.document_id || item.event_id || index}
                      onClick={() => handleSelectSearchResult(item)}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: '1px solid #f0f0f0',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                    >
                      {/* Отображение в зависимости от категории */}
                      {activeCategoryId === 'users' && (
                        <>
                          <div style={{ fontWeight: '500', color: '#333' }}>{item.full_name}</div>
                          <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
                            {item.phone_number || item.email}
                            {item.created_by_admin && (
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
                        </>
                      )}
                      
                      {(activeCategoryId === 'documents' || activeCategoryId === 'moderation') && (
                        <>
                          <div style={{ fontWeight: '500', color: '#333' }}>{item.document_name}</div>
                          <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
                            {item.student_name && `Пользователь: ${item.student_name}`}
                            {item.status && (
                              <span style={{
                                marginLeft: item.student_name ? '8px' : '0',
                                padding: '2px 6px',
                                backgroundColor: item.status === 'Одобрено' ? '#e8f5e9' : 
                                                item.status === 'Отклонено' ? '#ffebee' : '#fff3e0',
                                color: item.status === 'Одобрено' ? '#2e7d32' : 
                                       item.status === 'Отклонено' ? '#c62828' : '#ef6c00',
                                borderRadius: '4px',
                                fontSize: '11px'
                              }}>
                                {item.status}
                              </span>
                            )}
                          </div>
                        </>
                      )}
                      
                      {activeCategoryId === 'events' && (
                        <>
                          <div style={{ fontWeight: '500', color: '#333' }}>{item.event_name}</div>
                          <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
                            {item.event_date && new Date(item.event_date).toLocaleDateString('ru-RU')}
                          </div>
                        </>
                      )}
                      
                      {activeCategoryId === 'admins' && (
                        <>
                          <div style={{ fontWeight: '500', color: '#333' }}>{item.full_name}</div>
                          <div style={{ fontSize: '13px', color: '#666', marginTop: '2px' }}>
                            {item.email} {item.position_name && `• ${item.position_name}`}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
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
                              userSelect: 'none',
                              width: activeCategoryId === 'users' && index === 1 ? '25%' :
                                     activeCategoryId === 'users' && index === 4 ? '15%' : undefined
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
                        setDocumentPoints(''); // Сбрасываем баллы при смене категории
                        handleDocumentCategoryChange(newCategory);
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
                    {/* Информация о доступных баллах с сервера */}
                    {isLoadingUploadPoints ? (
                      <span style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                        Загрузка информации о баллах...
                      </span>
                    ) : uploadCategoryStats ? (
                      <span style={{
                        fontSize: '12px',
                        color: uploadCategoryStats.is_capped ? '#c62828' : (uploadAvailablePoints === 0 ? '#c62828' : '#2e7d32'),
                        marginTop: '4px',
                        display: 'block',
                        fontWeight: uploadAvailablePoints === 0 ? 'bold' : 'normal'
                      }}>
                        {uploadCategoryStats.is_capped
                          ? `Лимит исчерпан! У пользователя ${uploadCategoryStats.current_points} из ${uploadCategoryStats.max_points} баллов`
                          : `Доступно: ${uploadAvailablePoints} из ${uploadCategoryStats.max_points} баллов (у пользователя ${uploadCategoryStats.current_points})`
                        }
                      </span>
                    ) : (
                      documentCategory && CATEGORY_MAX_POINTS[documentCategory] && (
                        <span style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                          Максимум баллов в категории: {CATEGORY_MAX_POINTS[documentCategory]}
                        </span>
                      )
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
                      placeholder="Введите должность"
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
                        {isEditing ? (
                          <>
                            <input
                              type="text"
                              id="edit-document-user-input"
                              className={`form-input ${editErrors.student_name ? 'form-input--error' : ''}`}
                              value={editFormData.student_name || ''}
                              onChange={(e) => handleEditUserSearchChange(e.target.value)}
                              disabled={isSaving}
                              placeholder="Введите ФИО для поиска..."
                              autoComplete="off"
                            />
                            {/* Выпадающий список результатов поиска пользователя */}
                            {showEditUserDropdown && editUserSearchResults.length > 0 && (
                              <div 
                                id="edit-user-search-dropdown"
                                style={{
                                  position: 'absolute',
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
                                {editUserSearchResults.map((user) => (
                                  <div
                                    key={user.user_id}
                                    onClick={() => handleSelectEditUser(user)}
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
                            {editErrors.student_name && <span className="form-error">{editErrors.student_name}</span>}
                            {/* Скрытое поле для хранения user_id */}
                            <input
                              type="hidden"
                              value={editFormData.user_id || ''}
                            />
                          </>
                        ) : (
                          <div style={{ padding: '10px', backgroundColor: '#e3f2fd', borderRadius: '6px', fontWeight: '500' }}>
                            {selectedItem.student_name || selectedItem.full_name || '—'}
                          </div>
                        )}
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
                            {/* Информация о доступных баллах с сервера */}
                            {isLoadingEditPoints ? (
                              <span style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                                Загрузка информации о баллах...
                              </span>
                            ) : editCategoryStats ? (
                              <span style={{
                                fontSize: '12px',
                                color: editCategoryStats.is_capped ? '#c62828' : (editAvailablePoints === 0 ? '#c62828' : '#2e7d32'),
                                marginTop: '4px',
                                display: 'block',
                                fontWeight: editAvailablePoints === 0 ? 'bold' : 'normal'
                              }}>
                                {editCategoryStats.is_capped
                                  ? `Лимит исчерпан! У пользователя ${editCategoryStats.current_points} из ${editCategoryStats.max_points} баллов`
                                  : `Доступно: ${editAvailablePoints} из ${editCategoryStats.max_points} баллов (у пользователя ${editCategoryStats.current_points})`
                                }
                              </span>
                            ) : (
                              editFormData.category_id && CATEGORY_MAX_POINTS[editFormData.category_id] && (
                                <span style={{ fontSize: '12px', color: '#666', marginTop: '4px', display: 'block' }}>
                                  Максимум баллов в категории: {CATEGORY_MAX_POINTS[editFormData.category_id]}
                                </span>
                              )
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
                            <button
                                type="button"
                                className="form-button form-button--secondary"
                                onClick={(e) => handleDownloadFile(e, selectedItem.document_id, selectedItem.document_name)}
                                style={{ flex: 1, textDecoration: 'none', textAlign: 'center', cursor: 'pointer' }}
                            >
                              Скачать
                            </button>
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

                      <div className="form-group">
                        <label className="form-label">Суммарное количество баллов</label>
                        <div style={{
                          padding: '10px',
                          backgroundColor: '#e8f5e9',
                          borderRadius: '6px',
                          fontWeight: '600',
                          color: '#2e7d32'
                        }}>
                          {selectedUserTotalPoints} баллов
                        </div>
                      </div>

                      <div className="form-group">
                        <label className="form-label">Статус аккаунта</label>
                        <div style={{
                          padding: '10px',
                          backgroundColor: selectedItem.is_verified ? '#e8f5e9' : '#fff3e0',
                          borderRadius: '6px',
                          color: selectedItem.is_verified ? '#2e7d32' : '#ef6c00',
                          fontWeight: '500',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between'
                        }}>
                          <span>{selectedItem.is_verified ? 'Подтвержден' : 'Не подтвержден'}</span>
                          <span style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            backgroundColor: selectedItem.is_verified ? '#4caf50' : '#ff9800'
                          }}></span>
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

                      {/* Данные родителей для несовершеннолетних */}
                      {selectedItem.is_adult === false && (
                        <div style={{
                          marginTop: '15px',
                          padding: '15px',
                          backgroundColor: '#fce4ec',
                          borderRadius: '8px',
                          border: '1px solid #f8bbd9'
                        }}>
                          <h4 style={{
                            margin: '0 0 12px 0',
                            color: '#c2185b',
                            fontSize: '14px',
                            fontWeight: '600',
                            textTransform: 'uppercase'
                          }}>
                            Данные законного представителя
                          </h4>
                          <div className="form-group" style={{ marginTop: '10px' }}>
                            <label className="form-label">ФИО родителя</label>
                            <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
                              {selectedItem.parent_name || '—'}
                            </div>
                          </div>
                          <div className="form-group">
                            <label className="form-label">Телефон родителя</label>
                            <div style={{ padding: '10px', backgroundColor: 'white', borderRadius: '6px' }}>
                              {selectedItem.parent_phone || '—'}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Достижения/Документы пользователя */}
                      <div style={{
                        marginTop: '20px',
                        padding: '15px',
                        backgroundColor: '#f3e5f5',
                        borderRadius: '8px',
                        border: '1px solid #ce93d8'
                      }}>
                        <h4 style={{
                          margin: '0 0 12px 0',
                          color: '#7b1fa2',
                          fontSize: '14px',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}>
                          Достижения ({selectedUserDocuments.length})
                        </h4>

                        {selectedUserDocuments.length > 0 ? (
                          <div style={{
                            maxHeight: '300px',
                            overflowY: 'auto',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px'
                          }}>
                            {selectedUserDocuments.map((doc) => (
                              <div
                                key={doc.document_id}
                                onClick={() => {
                                  // Закрываем окно пользователя и открываем окно документа
                                  setIsViewModalOpen(false);
                                  setTimeout(() => {
                                    setActiveCategoryId('documents');
                                    openViewModal({
                                      ...doc,
                                      student_name: selectedItem.full_name,
                                      full_name: selectedItem.full_name
                                    }, 'documents');
                                  }, 100);
                                }}
                                style={{
                                  padding: '12px',
                                  backgroundColor: 'white',
                                  borderRadius: '6px',
                                  borderLeft: `4px solid ${
                                    doc.status === 'Одобрено' ? '#4caf50' :
                                    doc.status === 'Отклонено' ? '#f44336' : '#ff9800'
                                  }`,
                                  cursor: 'pointer',
                                  transition: 'background-color 0.2s, transform 0.1s'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#f5f5f5';
                                  e.currentTarget.style.transform = 'translateX(4px)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = 'white';
                                  e.currentTarget.style.transform = 'translateX(0)';
                                }}
                              >
                                <div style={{
                                  fontWeight: '500',
                                  fontSize: '14px',
                                  color: '#333',
                                  marginBottom: '4px'
                                }}>
                                  {doc.document_name}
                                </div>
                                <div style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  fontSize: '12px',
                                  color: '#666'
                                }}>
                                  <span>{doc.category_name || 'Без категории'}</span>
                                  <span style={{
                                    padding: '2px 8px',
                                    borderRadius: '10px',
                                    backgroundColor: doc.status === 'Одобрено' ? '#e8f5e9' :
                                                     doc.status === 'Отклонено' ? '#ffebee' : '#fff3e0',
                                    color: doc.status === 'Одобрено' ? '#2e7d32' :
                                          doc.status === 'Отклонено' ? '#c62828' : '#ef6c00'
                                  }}>
                                    {doc.status}
                                  </span>
                                </div>
                                {doc.points > 0 && (
                                  <div style={{
                                    marginTop: '4px',
                                    fontSize: '12px',
                                    color: '#2e7d32',
                                    fontWeight: '500'
                                  }}>
                                    {doc.points} баллов
                                  </div>
                                )}
                                {doc.received_date && (
                                  <div style={{
                                    marginTop: '4px',
                                    fontSize: '11px',
                                    color: '#999'
                                  }}>
                                    Дата: {new Date(doc.received_date).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div style={{
                            padding: '20px',
                            textAlign: 'center',
                            color: '#999',
                            fontSize: '14px'
                          }}>
                            У пользователя пока нет достижений
                          </div>
                        )}
                      </div>
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
                            placeholder="Введите должность"
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
                            <button
                                type="button"
                                className="form-button form-button--secondary"
                                onClick={(e) => handleDownloadFile(e, selectedItem.document_id, selectedItem.document_name)}
                                style={{ flex: 1, textDecoration: 'none', textAlign: 'center', cursor: 'pointer' }}
                            >
                              Скачать
                            </button>
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
                          <>
                            <button
                              type="button"
                              className="form-button form-button--primary"
                              onClick={toggleEditMode}
                              disabled={isSaving}
                            >
                              Редактировать
                            </button>
                            <button
                              type="button"
                              className="form-button form-button--danger"
                              onClick={handleDeleteDocument}
                              disabled={isSaving}
                              style={{ backgroundColor: '#ef5350', color: 'white', marginLeft: '10px' }}
                            >
                              Удалить
                            </button>
                          </>
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
                          <>
                            <button
                              type="button"
                              className="form-button form-button--primary"
                              onClick={toggleEditMode}
                              disabled={isSaving}
                            >
                              Редактировать
                            </button>
                            <button
                              type="button"
                              className="form-button form-button--danger"
                              onClick={handleDeleteModerator}
                              disabled={isSaving}
                              style={{ backgroundColor: '#ef5350', color: 'white', marginLeft: '10px' }}
                            >
                              Удалить
                            </button>
                          </>
                        )}
                      </>
                    )}

                    {activeCategoryId === 'users' && (
                      <>
                        <button
                          type="button"
                          className="form-button form-button--primary"
                          onClick={handleVerifyUser}
                          disabled={isSaving}
                          style={{
                            backgroundColor: selectedItem?.is_verified ? '#ff9800' : '#4caf50',
                            color: 'white'
                          }}
                        >
                          {selectedItem?.is_verified ? 'Отменить подтверждение' : 'Подтвердить аккаунт'}
                        </button>
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
