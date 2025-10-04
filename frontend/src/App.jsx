import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import './App.css'
import Navbar from './components/Navbar'
import GuildSettings from './pages/GuildSettings'
import Leaderboard from './pages/Leaderboard'
import Home from './pages/Home'
import { authService } from './services/api'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUser()
  }, [])

  const loadUser = async () => {
    try {
      const response = await authService.getMe()
      setUser(response.data)
    } catch (error) {
      console.error('Error loading user:', error)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }

  const onLogout = async () => {
    const API_BASE = import.meta.env.VITE_API_URL || 'https://therifthavenfullbot.onrender.com'
    try {
      await fetch(`${API_BASE}/api/auth/logout`, { 
        method: 'POST', 
        credentials: 'include' 
      })
      window.location.href = '/'
    } catch (error) {
      console.error('Error logging out:', error)
      window.location.href = '/'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-discord-dark">
        <div className="text-white">Cargando...</div>
      </div>
    )
  }

  if (!user) {
    const API_BASE = import.meta.env.VITE_API_URL || 'https://therifthavenfullbot.onrender.com'
    const loginUrl = `${API_BASE}/api/auth/login?redirect=${encodeURIComponent('/')}`
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-discord-dark">
        <div className="text-white">
          <a href={loginUrl} className="px-4 py-2 bg-discord-blurple rounded">
            Entrar con Discord
          </a>
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