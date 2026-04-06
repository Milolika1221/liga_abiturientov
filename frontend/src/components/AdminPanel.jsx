import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminPanelStyles.css';
import avatar from '../assets/user-image-l@2x.png'
import khpi from '../assets/logo_of_1x.png'
import LA from '../assets/Лого ЛА (без кгпи кемгу).png'

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
  
  // Состояние для категорий
  const categories = [
    { id: 'documents', name: 'Документы' },
    { id: 'events', name: 'Мероприятия' },
    { id: 'users', name: 'Пользователи' },
    { id: 'admins', name: 'Модераторы' }
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

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    localStorage.removeItem('sessionTime');
    navigate('/login');
  };

  const handleUploadDocument = () => {
    console.log('Загрузить документ');
  };

  const handleCreateEvent = () => {
    console.log('Создать мероприятие');
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
      case 'events': return ['№', 'Название мероприятия', 'Дата'];
      case 'documents': return ['№', 'Название документа', 'Дата получения', 'Баллы', 'Статус'];
      case 'users': return ['№', 'ФИО', 'Email', 'Телефон'];
      case 'admins': return ['№', 'ФИО', 'Email'];
      case 'moderation': return ['№', 'Название документа', 'Дата загрузки'];
      default: return ['№', 'Название', 'Дата'];
    }
  };
  
  // Рендер строки таблицы в зависимости от категории
  const renderTableRow = (item, index) => {
    switch (activeCategoryId) {
      case 'events':
        return (
            <tr key={item.event_id}>
              <td>{index + 1}</td>
              <td>{item.event_name}</td>
              <td>{item.event_date ? new Date(item.event_date).toLocaleDateString() : '—'}</td>
            </tr>
        );
      case 'documents':
        return (
            <tr key={item.document_id}>
              <td>{index + 1}</td>
              <td>{item.document_name}</td>
              <td>{item.received_date ? new Date(item.received_date).toLocaleDateString() : '—'}</td>
              <td>{item.points || 0}</td>
              <td>{item.status}</td>
            </tr>
        );
      case 'users':
        return (
            <tr key={item.user_id}>
              <td>{index + 1}</td>
              <td>{item.full_name}</td>
              <td>{item.email || '—'}</td>
              <td>{item.phone_number || '—'}</td>
            </tr>
        );
      case 'admins':
        return (
            <tr key={item.user_id}>
              <td>{index + 1}</td>
              <td>{item.full_name}</td>
              <td>{item.email || '—'}</td>
            </tr>
        );
      case 'moderation':
        return (
            <tr key={item.document_id}>
              <td>{index + 1}</td>
              <td>{item.document_name}</td>
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
      
      // Проверка прав администратора
      const isAdmin = userObj?.is_admin === true || userObj?.is_moderator === true || userObj?.login === 'abitur';
      if (!isAdmin) {
        navigate('/profile');
        return;
      }

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
            <h2 className="profile-section__name">{adminData.email || 'Администратор'}</h2>
            <p className="profile-section__role">{adminData.role}</p>
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
            <li className="profile-option" onClick={() => handleCategoryClick('admins')}>
              <img 
                src="https://app.codigma.io/api/uploads/2026/04/02/svg-5b834d54-ace8-449c-95f1-17cf87800278.svg" 
                width="32" 
                height="32" 
                alt="Icon" 
              />
              <span>Список администраторов</span>
            </li>
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
              <button className="admin-list-button" onClick={handleCreateEvent}>
                {getButtonText()}
              </button>
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
                      {getTableHeaders().map((header, index) => (
                          <th key={index}>{header}</th>
                      ))}
                    </tr>
                    </thead>
                    <tbody>
                    {filteredData.length > 0 ? (
                        filteredData.map((item, index) => renderTableRow(item, index))
                    ) : (
                        <tr>
                          <td colSpan={getTableHeaders().length} className="admin-table-no-data">
                            Нет данных для отображения
                          </td>
                        </tr>
                    )}
                    </tbody>
                  </table>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
