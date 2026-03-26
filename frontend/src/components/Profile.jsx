import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import './ProfileStyles.css'; 
import avatar from '../assets/user-image-l@2x.png'
import documentplaceholder from '../assets/elementor-placeholder-image.png'
import khpi from '../assets/logo_of_1x.png'
import LA from '../assets/Лого ЛА (без кгпи кемгу).png'
import lol from '../assets/Lol.png'
import msg from '../assets/Message_alt_fill.png'
import book from '../assets/Book_check_fill.png'
import chart from '../assets/Chart_fill.png'
import paper from '../assets/Paper_alt_fill.png'
import mortar from '../assets/Mortarboard_fill.png'


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

const Profile = () => {

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const categoriesRef = React.useRef(null);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    localStorage.removeItem('sessionTime');
    navigate('/login');
  };
  
  // Состояние для данных профиля с сервера
  const [profileData, setProfileData] = useState(null);
  const [totalPoints, setTotalPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userDocuments, setUserDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);

  // Получаем login из URL параметров
  const searchParams = new URLSearchParams(location.search);
  const login = searchParams.get('login') || localStorage.getItem('user')?.login;
  // Загрузка данных профиля при монтировании компонента
  useEffect(() => {
    const fetchProfile = async () => {
      if (!login) {
        setError('Не указан логин пользователя');
        setLoading(false);
        // Перенаправляем на страницу входа, если нет логина
        setTimeout(() => {ё
          navigate('/login');
        }, 2000);
        return;
      }

      try {
        // Загружаем данные профиля
        const profileResponse = await fetch(`${API_URL}/profile-by-login/${login}`);
        
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
          
          // Загружаем документы пользователя
          const docsResponse = await fetch(`${API_URL}/user-documents/${profileData.user_id}`);
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

  // Данные профиля по умолчанию (если сервер не вернул данные)
  const profile = {
    name: profileData?.full_name || 'Иванов Иван Иванович',
    email: profileData?.email || 'sample01@gmail.com',
    school: 'Школа:',
    totalPoints: totalPoints,
    position: 1,
    age: profileData?.birth_date ? calculateAge(profileData.birth_date) : 18,
    accountStatus: profileData?.is_verified ? 'Подтверждённая' : 'Не подтверждённая',
    avatar: avatar,
    classCourse: profileData?.class_course || '11',
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
    { id: 3, title: 'О проекте', active: false },
    { id: 4, title: 'Контакты', active: false },
  ];

  const [categories, setCategories] = useState([{ id: 'all', name: 'Все документы' }]);
  const [activeCategoryId, setActiveCategoryId] = useState(categories.find(c => c.active)?.id || 1);
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

            <img

              src={LA}

              alt="Secondary Logo"

              className="header__secondary-logo"

            />

            <img

              src={khpi}

              alt="Logo"

              className="header__logo"

            />

          </div>

          <nav className="navigation">

            <ul className="navigation__list">

              {navLinks.map((link) => (

                <li key={link.id}>

                  <a

                    href="#"

                    className={`navigation__link ${activeNavId === link.id ? 'navigation__link--active' : ''}`}

                    onClick={(e) => {

                      e.preventDefault();

                      handleNavClick(link.id);

                    }}

                  >

                    {link.title}

                  </a>

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

          

          <button className="profile-section__edit-button">Редактировать профиль</button>

          

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
          <button className="profile-section__upload-button">Загрузить новый документ</button>
          <button className="profile-section__logout-button" onClick={handleLogout}>Выход</button>

        </section>

        <div className="right-column">

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
                  <article key={doc.document_id} className="document">
                    <img src={documentplaceholder} alt="Document Image" className="document__image" />
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

    </div>

  );

};



export default Profile;