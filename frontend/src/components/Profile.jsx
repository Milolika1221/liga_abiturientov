import React, { useState } from 'react';
import './style1.css'; 
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

const Profile = () => {

  const profile = {
    name: 'Иванов Иван Иванович',
    email: 'sample01@gmail.com',
    school: 'Название школы №1',
    totalPoints: 99,
    position: 1,
    avatar: avatar
  };

 
  const navLinks = [
    { id: 1, title: 'Профиль', active: true },
    { id: 2, title: 'О проекте', active: false },
    { id: 3, title: 'таблица лидеров', active: false },
    { id: 4, title: 'Контакты', active: false },
  ];

  
  const categories = [
    { id: 1, name: 'Все документы', active: true, count: 25 },
    { id: 2, name: 'Категория 1', active: false, count: 0 }, 
    { id: 3, name: 'Категория 2', active: false, count: 0 },
    { id: 4, name: 'Категория 3', active: false, count: 0 },
  ];


  const documents = [
    {
      id: 1,
      image: documentplaceholder,
      title: 'Название документа 1',
      status: 'confirmed', // confirmed / rejected / pending
      points: 5,
    },
    {
      id: 2,
      image: documentplaceholder,
      title: 'Название документа 2',
      status: 'rejected',
      points: 0,
    },
  ];
  const [activeCategoryId, setActiveCategoryId] = useState(categories.find(c => c.active)?.id || 1);
  const [activeNavId, setActiveNavId] = useState(navLinks.find(l => l.active)?.id || 1);

  const handleCategoryClick = (id) => {
    setActiveCategoryId(id);
  };

  const handleNavClick = (id) => {
    setActiveNavId(id);
  };


  const getStatusClass = (status) => {
    switch (status) {
      case 'confirmed':
        return 'document__status--confirmed';
      case 'rejected':
        return 'document__status--rejected';
      default:
        return '';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'confirmed':
        return 'Подтвержедно';
      case 'rejected':
        return 'Отклонён';
      default:
        return 'На рассмотрении';
    }
  };

  return (
    <div className="profile-page">
      <header className="header">
        <div className="header__content">
          <img
            src = {khpi}
            alt="Logo"
            className="header__logo"
          />
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
          <img
            src={LA}
            alt="Secondary Logo"
            className="header__secondary-logo"
          />
        </div>
      </header>

      <main className="main-content">
        <section className="profile-section">
          <div className="profile-section__header">
            <img src={profile.avatar} alt="Profile Picture" className="profile-section__avatar" />
            <h2 className="profile-section__name">{profile.name}</h2>
            <p className="profile-section__email">{profile.email}</p>
          </div>
          <div className="profile-section__details">
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
          <div className='profile-section__AddDocument'>
            <button className='profile-section__AddDocumentButton'>Добавить Документ</button>
          </div>
              <button className="profile-section__logout-button">Выход</button>
        </section>

        <section className="document-slider">
          <div className="document-slider__categories">
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
          <div className="document-slider__stats">
            <span>
              Документов в категории{' '}
              {categories.find(c => c.id === activeCategoryId)?.name}:
              {categories.find(c => c.id === activeCategoryId)?.count}
            </span>
          </div>
        </section>

        <section className="document-list">
          {documents.map((doc) => (
            <article key={doc.id} className="document">
              <img src={doc.image} alt="Document Image" className="document__image" />
              <h3 className="document__title">{doc.title}</h3>
              <p className="document__status">
                Статус: <span className={getStatusClass(doc.status)}>{getStatusText(doc.status)}</span>
              </p>
              <p className="document__points">Кол-во баллов: {doc.points}</p>
            </article>
          ))}
        </section>
      </main>
    </div>
  );
};

export default Profile;