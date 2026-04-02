import React from 'react';
import '../styles/AdminPanelStyles.css'; // Подключение стилей из исходного HTML

const AdminPanel = () => {
  // Данные для списка опций профиля
  const profileOptions = [
    { icon: 'https://app.codigma.io/api/uploads/2026/04/02/svg-2aa5856e-d149-490c-bbeb-708bae6ed238.svg', label: 'Список мероприятий' },
    { icon: 'https://app.codigma.io/api/uploads/2026/04/02/svg-ac9ac9a4-f910-4ec5-ae06-757a9b384815.svg', label: 'Список документов' },
    { icon: 'https://app.codigma.io/api/uploads/2026/04/02/svg-bc78fcf7-3e36-40de-8edd-0a6d232914fb.svg', label: 'Список пользователей' },
    { icon: 'https://app.codigma.io/api/uploads/2026/04/02/svg-5b834d54-ace8-449c-95f1-17cf87800278.svg', label: 'Список администраторов' },
    { icon: 'https://app.codigma.io/api/uploads/2026/04/02/svg-a0c26474-3ab4-4cf9-8968-2ac15cc01f45.svg', label: 'Документы не прошедшие модерацию' }
  ];

  // Данные для списка мероприятий (15 одинаковых элементов)
  const events = Array(15).fill('Название мероприятия');

  // Обработчики кликов (заглушки)
  const handleUploadDocument = () => console.log('Загрузить документ');
  const handleCreateEvent = () => console.log('Создать мероприятие');
  const handleLogout = () => console.log('Выход');

  return (
    <div className="container">
      {/* Верхнее меню */}
      <div className="header">
        <div className="header-item header-item--primary">Профиль</div>
        <div className="header-item">О проекте</div>
        <div className="header-item">Таблица лидеров</div>
        <div className="header-item">Контакты</div>
      </div>

      <div className="main">
        {/* Боковая панель профиля */}
        <aside className="profile-sidebar">
          <div className="profile-card">
            <div className="profile-image">
              <img src="https://placehold.co/100x100" alt="Profile Picture" />
            </div>
            <div className="profile-name">Иванов Иван Иванович</div>
            <div className="login-role">administrator</div>
          </div>

          <div className="panel-action" onClick={handleUploadDocument}>
            Загрузить новый документ
          </div>

          <ul className="profile-options">
            {profileOptions.map((option, idx) => (
              <li key={idx} className="profile-option">
                <img src={option.icon} width="24" height="24" alt="Icon" />
                {option.label}
              </li>
            ))}
          </ul>

          <div className="divider"></div>

          <div className="panel-action action-logout" onClick={handleLogout}>
            Выход
          </div>
        </aside>
        <div className='block'>
            <div className='users'>
                    {/* Блок "Пользователей онлайн" */}
                    <section className="online-users">
                    <h2>Пользователей онлайн</h2>
                    <div className="user-count">150 / 150</div>
                    </section>

                    {/* Блок "Зарегистрированных пользователей" */}
                    <section className="registered-users">
                    <h2>Зарегистрированных пользователей</h2>
                    <img
                        src="https://app.codigma.io/api/uploads/2026/04/02/svg-5a33b5c6-bb6e-46f0-91c7-55f00e98ca90.svg"
                        alt="User Icon"
                        width="131"
                        height="131"
                    />
                    <div className="user-count">234</div>
                
                </section>
            </div>
                    {/* Вторичное меню */}
              <div className='secondary-menu-div'>
                    <nav className="secondary-menu">
                        <div className="menu-item">Документы</div>
                        <div className="menu-item menu-item-active">Мероприятия</div>
                        <div className="menu-item">Пользователи</div>
                        <div className="menu-item">Администраторы</div>
                    </nav>
                </div>

            {/* Список мероприятий */}
            <section className="event-list">
                <div className="event-list-header">
                <h2>Список мероприятий</h2>
                <div className="create-event" onClick={handleCreateEvent}>
                    Создать новое мероприятие
                </div>
                </div>
        

                <ul className="events">
                {events.map((event, idx) => (
                    <li key={idx} className="events-item">{event}</li>
                ))}
                </ul>
            </section>
        </div>
      
    </div>
    
    </div>
  );
};

export default AdminPanel;