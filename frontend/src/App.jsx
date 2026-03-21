import React from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Registration from './components/Registration'
import Portfolio from './components/Portfolio'

function App() {
  return (
    <Router>
      <div className = "App">
        <Routes>
          <Route path = "/" element = {<Registration />} />
          <Route path = "/portfolio" element = {<Portfolio />} />
        </Routes>
      </div>
    </Router>
  )
}

export default App
