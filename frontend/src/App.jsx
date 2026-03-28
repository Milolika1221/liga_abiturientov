import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Registration from './components/Registration'
import Login from './components/Login'
import ResetPassword from './components/ResetPassword'
import Profile from './components/Profile'

function App() {
  return (
    <Router>
      <div className = "App">
        <Routes>
          <Route path = "/" element = {<Navigate to="/login" />} />
          <Route path = "/register" element = {<Registration />} />
          <Route path = "/login" element = {<Login />} />
          <Route path = "/reset-password" element = {<ResetPassword />} />
          <Route path = "/profile" element = {<Profile/>} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
