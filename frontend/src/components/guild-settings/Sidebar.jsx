// frontend/src/components/guild-settings/Sidebar.jsx
import { ArrowLeft, Settings, Bell, Award, Shield, BarChart3, UserPlus, Trophy, Image } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function Sidebar({ activeSection, setActiveSection, hasChanges }) {
  const navigate = useNavigate();

  const menuItems = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'roles', label: 'Roles de Nivel', icon: Award },
    { id: 'auto-roles', label: 'Auto-Roles', icon: UserPlus },
    { id: 'achievements', label: 'Logros', icon: Trophy }, // ← NUEVO
    { id: 'role-menus', label: 'Role Menus', icon: Shield },
    { id: 'leaderboard', label: 'Leaderboard', icon: BarChart3 },
    { id: 'images', label: 'Imágenes', icon: Image }
  ];

  return (
    <aside className="w-64 min-h-screen bg-gray-800/50 backdrop-blur-sm border-r border-gray-700/50">
      <div className="p-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-gray-400 hover:text-white mb-8 group cursor-pointer hover:scale-105 transition-all"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>Volver</span>
        </button>

        <h2 className="text-xl font-bold text-white mb-6">Configuración</h2>

        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const itemHasChanges = hasChanges[item.id] || false;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
                    : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3 hover:cursor-pointer">
                  <Icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </div>
                {itemHasChanges && (
                  <div className="w-2 h-2 bg-yellow-400 rounded-full" title="Cambios sin guardar"></div>
                )}
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}