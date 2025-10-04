import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import Navbar from './components/Navbar'
import GuildSettings from './pages/GuildSettings'
import Leaderboard from './pages/Leaderboard'
import Home from './pages/Home'

function App() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    fetch('/api/auth/me', { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => setUser(data))
      .catch(() => setUser(null))
  }, [])

  const onLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' })
    window.location.href = '/'
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-discord-dark">
        <div className="text-white">
          <a href="/api/auth/login" className="px-4 py-2 bg-discord-blurple rounded">Entrar con Discord</a>
        </div>
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Navbar user={user} onLogout={onLogout} />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<div className="p-6">Bienvenido al dashboard</div>} />
        <Route path="/guild/:guildId" element={<GuildSettings />} />
        <Route path="/guild/:guildId/leaderboard" element={<Leaderboard />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
