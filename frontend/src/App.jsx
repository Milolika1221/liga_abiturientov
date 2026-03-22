import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Registration from './components/Registration'
import Login from './components/Login'
import Portfolio from './components/Portfolio'
import ResetPassword from './components/ResetPassword'

function App() {
  return (
    <Router>
      <div className = "App">
        <Routes>
          <Route path = "/" element = {<Navigate to="/login" />} />
          <Route path = "/register" element = {<Registration />} />
          <Route path = "/login" element = {<Login />} />
          <Route path = "/portfolio" element = {<Portfolio />} />
          <Route path = "/reset-password" element = {<ResetPassword />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
