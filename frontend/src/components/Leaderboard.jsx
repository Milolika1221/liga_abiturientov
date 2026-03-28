import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import LA from '../assets/Лого ЛА (без кгпи кемгу).png';
import khpi from '../assets/logo_of_1x.png';

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
  }, []);

  const navLinks = [
    { id: 1, title: 'Профиль' },
    { id: 2, title: 'Таблица лидеров' },
    { id: 3, title: 'О проекте' },
    { id: 4, title: 'Контакты' },
  ];

  const handleNavClick = (id) => {
    setActiveNavId(id);
    if (id === 1) {
      const userId = localStorage.getItem('userId');
      const userStr = localStorage.getItem('user');
      const userObj = userStr ? JSON.parse(userStr) : null;
      if (userObj?.login) {
        navigate(`/profile?login=${userObj.login}`);
      } else {
        navigate('/profile');
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#fafafa',
      position: 'relative',
      overflowX: 'hidden'
    }}>
      {/* Декоративные звезды на фоне */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
        opacity: 0.3
      }}>
        <div style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: 'radial-gradient(2px 2px at 20px 30px, #eee, rgba(0,0,0,0)), radial-gradient(2px 2px at 40px 70px, rgba(255,255,255,0.8), rgba(0,0,0,0)), radial-gradient(2px 2px at 50px 160px, #ddd, rgba(0,0,0,0)), radial-gradient(2px 2px at 90px 40px, #fff, rgba(0,0,0,0))',
          backgroundSize: '200px 200px'
        }} />
      </div>

      {/* Хедер (как в Profile) */}
      <header style={{
        width: '100%',
        background: 'white',
        boxShadow: '0px -1px 4px rgba(0, 0, 0, 0.54)',
        position: 'relative',
        height: '160px',
        display: 'flex',
        alignItems: 'center',
        zIndex: 10
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '90%',
          margin: '0 auto',
          paddingLeft: '60px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            height: '100px'
          }}>
            <img src={LA} alt="Logo" style={{ height: '140px', width: 'auto' }} />
            <img src={khpi} alt="Logo" style={{ height: '80px', width: 'auto' }} />
          </div>

          <nav style={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            width: '100%',
            margin: 0
          }}>
            <ul style={{
              listStyle: 'none',
              display: 'flex',
              gap: '45px',
              justifyContent: 'center',
              margin: 0,
              padding: 0,
              width: '100%',
              maxWidth: '1200px'
            }}>
              {navLinks.map((link) => (
                <li key={link.id}>
                  <a 
                    href="#" 
                    style={{
                      textDecoration: activeNavId === link.id ? 'underline' : 'none',
                      color: activeNavId === link.id ? '#0808e4' : 'black',
                      fontWeight: 700,
                      fontSize: '14px',
                      letterSpacing: '0.6px',
                      fontFamily: '"Widock TRIAL", sans-serif',
                      textTransform: 'uppercase'
                    }}
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

      {/* Контент */}
      <main style={{
        position: 'relative',
        zIndex: 10,
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '40px 20px'
      }}>
        <h1 style={{
          fontFamily: '"Widock TRIAL", sans-serif',
          fontSize: '64px',
          color: '#0808E4',
          textAlign: 'center',
          marginBottom: '40px',
          fontWeight: 700,
          letterSpacing: '2px',
          textTransform: 'uppercase'
        }}>
          ТАБЛИЦА ЛИДЕРОВ
        </h1>

        {loading ? (
          <div style={{ textAlign: 'center', fontSize: '18px', color: '#0808E4' }}>
            Загрузка...
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', fontSize: '18px', color: '#ff3c3c' }}>
            {error}
          </div>
        ) : (
          <div style={{
            background: 'white',
            borderRadius: '20px',
            overflow: 'hidden',
            boxShadow: '0px 0px 4px 1px rgba(0, 0, 0, 0.25)',
            border: '1px solid #000'
          }}>
            <table style={{
              width: '100%',
              borderSpacing: '0',
              fontFamily: '"Montserrat", sans-serif'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#C9E410' }}>
                  <th style={{
                    padding: '25px 20px',
                    textAlign: 'center',
                    fontWeight: 600,
                    fontSize: '18px',
                    color: '#000',
                    width: '60px',
                    border: '1px solid #000',
                    borderTop: 'none'
                  }}>№</th>
                  <th style={{
                    padding: '25px 20px',
                    textAlign: 'center',
                    fontWeight: 600,
                    fontSize: '18px',
                    color: '#000',
                    border: '1px solid #000',
                    borderTop: 'none'
                  }}>ФИО</th>
                  <th style={{
                    padding: '25px 20px',
                    textAlign: 'center',
                    fontWeight: 600,
                    fontSize: '18px',
                    color: '#000',
                    border: '1px solid #000',
                    borderTop: 'none'
                  }}>Образовательная организация</th>
                  <th style={{
                    padding: '25px 20px',
                    textAlign: 'center',
                    fontWeight: 600,
                    fontSize: '18px',
                    color: '#000',
                    width: '150px',
                    border: '1px solid #000',
                    borderTop: 'none'
                  }}>Количество баллов</th>
                </tr>
              </thead>
              <tbody>
                {leaders.length > 0 ? (
                  leaders.map((leader, index) => (
                    <tr key={leader.user_id}>
                      <td style={{
                        padding: '22px 20px',
                        textAlign: 'center',
                        fontWeight: 500,
                        fontSize: '18px',
                        color: leader.user_id == currentUserId ? '#0808E4' : '#000',
                        border: '1px solid #000'
                      }}>{index + 1}</td>
                      <td style={{
                        padding: '22px 20px',
                        textAlign: 'center',
                        fontWeight: 500,
                        fontSize: '18px',
                        color: leader.user_id == currentUserId ? '#0808E4' : '#000',
                        border: '1px solid #000'
                      }}>{leader.full_name}</td>
                      <td style={{
                        padding: '22px 20px',
                        textAlign: 'center',
                        fontWeight: 500,
                        fontSize: '18px',
                        color: leader.user_id == currentUserId ? '#0808E4' : '#000',
                        border: '1px solid #000'
                      }}>{leader.school || 'Не указана'}</td>
                      <td style={{
                        padding: '22px 20px',
                        textAlign: 'center',
                        fontWeight: 500,
                        fontSize: '18px',
                        color: leader.user_id == currentUserId ? '#0808E4' : '#000',
                        border: '1px solid #000'
                      }}>{leader.total_points || 0}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{
                      padding: '40px',
                      textAlign: 'center',
                      color: '#666',
                      border: '1px solid #000'
                    }}>
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
