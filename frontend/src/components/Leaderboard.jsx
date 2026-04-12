import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LA from '../assets/Лого ЛА (без кгпи кемгу).png';
import khpi from '../assets/logo_of_1x.png';
import grafity1 from '../assets/grafity1.png';
import grafity2 from '../assets/grafity2.png';
import '../styles/Leaderboard.css';

// Определяем API_URL
const getApiUrl = () => {
  const hostname = window.location.hostname;
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:3000';
  }
  if (hostname.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
    return `http://${hostname}:3000`;
  }
  return 'http://localhost:3000';
};

const API_URL = getApiUrl();

const Leaderboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeNavId, setActiveNavId] = useState(2);
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [isUpdating, setIsUpdating] = useState(false);
  
  // Получаем userId из URL параметров как в Profile
  const searchParams = new URLSearchParams(location.search);
  const currentUserId = searchParams.get('userId') || localStorage.getItem('userId');

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const response = await fetch(`${API_URL}/leaderboard`);
        if (response.ok) {
          const data = await response.json();
          setLeaders(data);
        } else {
          setError('Ошибка загрузки данных');
        }
      } catch (err) {
        setError('Ошибка соединения');
      } finally {
        setLoading(false);
      }
    };

    fetchLeaderboard();

    let updateInterval;
    let websocket = null;

    try {
      const wsUrl = API_URL.replace('http://', 'ws://').replace('https://', 'wss://') + '/ws';
      websocket = new WebSocket(wsUrl);
      
      websocket.onopen = () => {
        console.log('WebSocket connected for real-time leaderboard updates');
        if (websocket.readyState === WebSocket.OPEN) {
          websocket.send(JSON.stringify({ type: 'subscribe_leaderboard' }));
        }
      };

      websocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'leaderboard_update') {
            setLeaders(data.leaders);
          }
        } catch (err) {
          console.error('Error parsing WebSocket message:', err);
        }
      };

      websocket.onclose = () => {
        console.log('WebSocket disconnected, falling back to polling');
        updateInterval = setInterval(fetchLeaderboard, 5000);
      };

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        websocket.close();
      };

    } catch (err) {
      console.log('WebSocket not supported, using polling');
      updateInterval = setInterval(fetchLeaderboard, 5000); 
    }

    return () => {
      if (websocket) {
        websocket.close();
      }
      if (updateInterval) {
        clearInterval(updateInterval);
      }
    };
  }, []);

  // Автопрокрутка к позиции пользователя после загрузки данных
  useEffect(() => {
    if (!loading && leaders.length > 0 && currentUserId) {
      const userIndex = leaders.findIndex(leader => leader.user_id == currentUserId);
      if (userIndex !== -1) {
        setTimeout(() => {
          const userRow = document.querySelector(`tr:nth-child(${userIndex + 1})`);
          if (userRow) {
            userRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
            
            // Добавляем подсветку строки
            userRow.style.transition = 'background-color 0.5s ease';
            userRow.style.backgroundColor = '#E8F5E9';
            setTimeout(() => {
              userRow.style.backgroundColor = '';
            }, 2000);
          }
        }, 500);
      }
    }
  }, [loading, leaders, currentUserId]);

  const navLinks = [
    { id: 1, title: 'Профиль' },
    { id: 2, title: 'Таблица лидеров' },
    { id: 3, title: 'О проекте', url: 'https://school.khpi.ru/liga_abitur/' },
    { id: 4, title: 'Контакты', url: 'https://taplink.cc/khpi' },
  ];

  const handleNavClick = (id) => {
    setActiveNavId(id);
    if (id === 1) {
      const userId = localStorage.getItem('userId');
      const userStr = localStorage.getItem('user');
      const userObj = userStr ? JSON.parse(userStr) : null;
      
      // Проверяем, является ли пользователь админом
      const isAdmin = userObj?.role === 'admin' || userObj?.login === 'abitur' || userObj?.isAdmin;
      
      // Если пришли из админ-панели или пользователь админ, возвращаемся в админку
      if (isAdmin || location.state?.fromAdmin) {
        navigate('/adminpanel');
      } else if (userObj?.login) {
        navigate(`/profile?login=${userObj.login}`);
      } else {
        navigate('/profile');
      }
    }
  };

  return (
    <div className="leaderboard-container">
      {/* Декоративные элементы */}
      <img 
        src={grafity2} 
        alt="Декорация" 
        className="decoration-graphity2"
      />
      <img 
        src={grafity1} 
        alt="Декорация" 
        className="decoration-graphity1"
      />

      {/* Декоративные звезды на фоне */}
      <div className="leaderboard-stars" />

      {/* Хедер (как в Profile) */}
      <header className="leaderboard-header">
        <div className="leaderboard-header-content">
          <div className="leaderboard-logos">
            <img src={LA} alt="Logo" className="leaderboard-logo-la" />
            <img src={khpi} alt="Logo" className="leaderboard-logo-khpi" />
          </div>

          <nav className="leaderboard-nav">
            <ul className="leaderboard-nav-list">
              {navLinks.map((link) => (
                <li key={link.id}>
                  {link.url ? (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`leaderboard-nav-link ${activeNavId === link.id ? 'active' : ''}`}
                      onClick={() => setActiveNavId(link.id)}
                    >
                      {link.title}
                    </a>
                  ) : (
                    <a
                      href="#"
                      className={`leaderboard-nav-link ${activeNavId === link.id ? 'active' : ''}`}
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

      {/* Контент */}
      <main className="leaderboard-main">
        <h1 className="leaderboard-title">
          ТАБЛИЦА ЛИДЕРОВ
        </h1>

        {loading ? (
          <div className="leaderboard-loading">
            Загрузка...
          </div>
        ) : error ? (
          <div className="leaderboard-error">
            {error}
          </div>
        ) : (
          <div className="leaderboard-table-container">
            <table className="leaderboard-table">
              <thead>
                <tr style={{ backgroundColor: '#C9E410' }}>
                  <th>№</th>
                  <th>ФИО</th>
                  <th>Образовательная организация</th>
                  <th>Количество баллов</th>
                </tr>
              </thead>
              <tbody>
                {leaders.length > 0 ? (
                  leaders.map((leader, index) => (
                    <tr key={leader.user_id}>
                      <td className={leader.user_id == currentUserId ? 'current-user' : ''}>{index + 1}</td>
                      <td className={leader.user_id == currentUserId ? 'current-user' : ''}>{leader.full_name}</td>
                      <td className={leader.user_id == currentUserId ? 'current-user' : ''}>{leader.school || 'Не указана'}</td>
                      <td className={leader.user_id == currentUserId ? 'current-user' : ''}>{leader.total_points || 0}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" className="leaderboard-table-no-data">
                      Пока нет данных для отображения
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
};

export default Leaderboard;
