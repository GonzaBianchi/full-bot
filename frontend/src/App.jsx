import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import './App.css'
import Navbar from './components/Navbar'
import GuildSettings from './pages/GuildSettings'
import Leaderboard from './pages/Leaderboard'
import Home from './pages/Home'
import RoleMenus from './pages/RoleMenus'
import { authService } from './services/api'

// Wrapper component to handle scroll behavior
function AppContent({ user, onLogout }) {
  const location = useLocation();
  
  // Determinar si la ruta actual necesita Navbar
  const showNavbar = !location.pathname.includes('/leaderboard');
  
  // Determinar si la ruta actual necesita layout con sidebar (GuildSettings)
  const isGuildSettingsRoute = location.pathname.includes('/guild/') && !location.pathname.includes('/leaderboard');
  
  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 overflow-hidden">
      {showNavbar && <Navbar user={user} onLogout={onLogout} />}
      <div className={`flex-1 ${isGuildSettingsRoute ? 'overflow-hidden' : 'overflow-y-auto'}`}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<div className="p-6">Bienvenido al dashboard</div>} />
          
          {/* ========== RUTA PÚBLICA: Leaderboard ========== */}
          <Route path="/guild/:guildId/leaderboard" element={<Leaderboard />} />
          {/* ================================================ */}
          
          {/* Rutas protegidas */}
          <Route path="/guild/:guildId" element={<GuildSettings />} />
          <Route path="/guild/:guildId/role-menus" element={<RoleMenus />} />
        </Routes>
      </div>
    </div>
  );
}

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

  // ========== IMPORTANTE: Permitir acceso sin autenticación a leaderboard ==========
  const currentPath = window.location.pathname;
  const isLeaderboardRoute = currentPath.includes('/leaderboard');
  
  if (!user && !isLeaderboardRoute) {
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
  // ================================================================================

  return (
    <BrowserRouter>
      <AppContent user={user} onLogout={onLogout} />
    </BrowserRouter>
  )
}

export default App