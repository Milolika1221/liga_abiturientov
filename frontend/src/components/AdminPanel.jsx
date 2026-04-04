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
  
  // Данные для админ-панели
  const [onlineUsers, setOnlineUsers] = useState(150);
  const [maxOnlineUsers, setMaxOnlineUsers] = useState(150);
  const [registeredUsers, setRegisteredUsers] = useState(234);
  
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
  
  // Данные для таблицы по категориям
  const dataByCategory = {
    events: [
      { id: 1, name: 'Олимпиада по математике', date: '15.03.2024' },
      { id: 2, name: 'Конкурс рисунков', date: '20.03.2024' },
      { id: 3, name: 'Спортивные соревнования', date: '25.03.2024' },
      { id: 4, name: 'Науная конференция', date: '01.04.2024' },
      { id: 5, name: 'Творческий фестиваль', date: '10.04.2024' },
    ],
    documents: [
      { id: 1, name: 'Справка об обучении', receivedDate: '10.01.2024', points: 5, status: 'Одобрено' },
      { id: 2, name: 'Диплом победителя', receivedDate: '15.02.2024', points: 15, status: 'Одобрено' },
      { id: 3, name: 'Сертификат участника', receivedDate: '01.03.2024', points: 10, status: 'На рассмотрении' },
      { id: 4, name: 'Грамота за отличие', receivedDate: '20.03.2024', points: 8, status: 'Одобрено' },
      { id: 5, name: 'Удостоверение', receivedDate: '05.04.2024', points: 12, status: 'Отклонено' },
    ],
    users: [
      { id: 1, fullName: 'Иванов Иван Иванович', email: 'ivanov@mail.ru', phone: '+7 (999) 123-45-67' },
      { id: 2, fullName: 'Петрова Мария Сергеевна', email: 'petrova@mail.ru', phone: '+7 (999) 234-56-78' },
      { id: 3, fullName: 'Сидоров Алексей Владимирович', email: 'sidorov@mail.ru', phone: '+7 (999) 345-67-89' },
      { id: 4, fullName: 'Козлова Анна Петровна', email: 'kozlova@mail.ru', phone: '+7 (999) 456-78-90' },
      { id: 5, fullName: 'Новиков Дмитрий Александрович', email: 'novikov@mail.ru', phone: '+7 (999) 567-89-01' },
    ],
    admins: [
      { id: 1, fullName: 'Админов Админ Админович', email: 'admin@khpi.ru' },
      { id: 2, fullName: 'Модераторов Модератор Иванович', email: 'moderator@khpi.ru' },
      { id: 3, fullName: 'Проверяйло Проверка Петровна', email: 'checker@khpi.ru' },
    ],
    moderation: [
      { id: 1, name: 'Справка о временной нетрудоспособности', uploadDate: '01.04.2024' },
      { id: 2, name: 'Скан паспорта (некачественный)', uploadDate: '02.04.2024' },
      { id: 3, name: 'Диплом без подписи', uploadDate: '03.04.2024' },
      { id: 4, name: 'Сертификат с ошибкой в ФИО', uploadDate: '04.04.2024' },
    ],
  };
  
  // Получение данных для текущей категории
  const getCurrentData = () => dataByCategory[activeCategoryId] || dataByCategory.events;
  
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
          <tr key={item.id}>
            <td>{index + 1}</td>
            <td>{item.name}</td>
            <td>{item.date}</td>
          </tr>
        );
      case 'documents':
        return (
          <tr key={item.id}>
            <td>{index + 1}</td>
            <td>{item.name}</td>
            <td>{item.receivedDate}</td>
            <td>{item.points}</td>
            <td>{item.status}</td>
          </tr>
        );
      case 'users':
        return (
          <tr key={item.id}>
            <td>{index + 1}</td>
            <td>{item.fullName}</td>
            <td>{item.email}</td>
            <td>{item.phone}</td>
          </tr>
        );
      case 'admins':
        return (
          <tr key={item.id}>
            <td>{index + 1}</td>
            <td>{item.fullName}</td>
            <td>{item.email}</td>
          </tr>
        );
      case 'moderation':
        return (
          <tr key={item.id}>
            <td>{index + 1}</td>
            <td>{item.name}</td>
            <td>{item.uploadDate}</td>
          </tr>
        );
      default:
        return (
          <tr key={item.id}>
            <td>{index + 1}</td>
            <td>{item.name}</td>
            <td>{item.date}</td>
          </tr>
        );
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
  useEffect(() => {
    const fetchAdminData = async () => {
      const currentUserId = localStorage.getItem('userId');
      if (!currentUserId) {
        navigate('/login');
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
      case 'moderation':
        return item.name.toLowerCase().includes(searchLower);
      case 'documents':
        return item.name.toLowerCase().includes(searchLower) || 
               item.status.toLowerCase().includes(searchLower);
      case 'users':
        return item.fullName.toLowerCase().includes(searchLower) || 
               item.email.toLowerCase().includes(searchLower) ||
               item.phone.toLowerCase().includes(searchLower);
      case 'admins':
        return item.fullName.toLowerCase().includes(searchLower) || 
               item.email.toLowerCase().includes(searchLower);
      default:
        return item.name.toLowerCase().includes(searchLower);
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
            <h2 className="profile-section__name">Администратор</h2>
            <p className="profile-section__role">administrator</p>
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
              <table className="admin-table">
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
            </div>
          </section>
        </div>
      </main>
    </div>
  );
};

export default AdminPanel;
