// frontend/src/components/guild-settings/Sidebar.jsx
import { ArrowLeft, Zap, UserPlus, Trophy, Shield, BarChart3, MessageSquare, ChevronDown, Check, Film, Cake } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';

export function Sidebar({ activeSection, setActiveSection, hasChanges, guilds = [] }) {
  const navigate = useNavigate();
  const { guildId } = useParams();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Encontrar el servidor actual
  const currentGuild = guilds.find(g => g.id === guildId);

  const menuItems = [
    { id: 'xp-system', label: 'Sistema XP', icon: Zap },
    { id: 'auto-roles', label: 'Auto-Roles', icon: UserPlus },
    { id: 'achievements', label: 'Logros', icon: Trophy },
    { id: 'role-menus', label: 'Role Menus', icon: Shield },
    { id: 'custom-messages', label: 'Mensajes', icon: MessageSquare },
    { id: 'media-filter', label: 'Filtro Multimedia', icon: Film },
    { id: 'birthdays', label: 'Cumpleaños', icon: Cake },
    { id: 'leaderboard', label: 'Leaderboard', icon: BarChart3 }
  ];

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getGuildIcon = (guild) => {
    if (guild.icon) {
      return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
    }
    return null;
  };

  const handleGuildChange = (newGuildId) => {
    if (newGuildId !== guildId) {
      navigate(`/guild/${newGuildId}`);
    }
    setIsDropdownOpen(false);
  };

  return (
    <aside className="w-64 h-full bg-gray-800/50 backdrop-blur-sm border-r border-gray-700/50 overflow-y-auto">
      <div className="p-6">
        {/* Botón Volver */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center space-x-2 text-gray-400 hover:text-white mb-6 group cursor-pointer hover:scale-105 transition-all"
        >
          <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
          <span>Volver</span>
        </button>

        {/* Dropdown de Servidores */}
        {currentGuild && (
          <div className="mb-6 relative" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full bg-gray-700/50 hover:bg-gray-700 rounded-lg hover:cursor-pointer p-3 transition-all border border-gray-600/50 hover:border-indigo-500/50"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  {getGuildIcon(currentGuild) ? (
                    <img 
                      src={getGuildIcon(currentGuild)} 
                      alt={currentGuild.name} 
                      className="w-8 h-8 rounded-full flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                      {currentGuild.name.charAt(0)}
                    </div>
                  )}
                  <div className="text-left flex-1 min-w-0">
                    <p className="text-white font-medium truncate text-sm">
                      {currentGuild.name}
                    </p>
                    <p className="text-gray-400 text-xs">
                      Cambiar servidor
                    </p>
                  </div>
                </div>
                <ChevronDown 
                  className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${
                    isDropdownOpen ? 'rotate-180' : ''
                  }`}
                />
              </div>
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-gray-800 rounded-lg border border-gray-700 shadow-xl z-50 max-h-80 overflow-y-auto">
                <div className="p-2">
                  {guilds.length === 0 ? (
                    <div className="px-4 py-6 text-center">
                      <p className="text-gray-400 text-sm">No hay servidores disponibles</p>
                    </div>
                  ) : (
                    guilds.map((guild) => (
                      <button
                        key={guild.id}
                        onClick={() => handleGuildChange(guild.id)}
                        className={`w-full hover:cursor-pointer flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all ${
                          guild.id === guildId
                            ? 'bg-indigo-500/20 text-indigo-400'
                            : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                        }`}
                      >
                        {getGuildIcon(guild) ? (
                          <img 
                            src={getGuildIcon(guild)} 
                            alt={guild.name} 
                            className="w-8 h-8 rounded-full flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                            {guild.name.charAt(0)}
                          </div>
                        )}
                        <div className="flex-1 text-left min-w-0">
                          <p className="font-medium truncate text-sm">{guild.name}</p>
                          {guild.memberCount && (
                            <p className="text-xs text-gray-400">
                              {guild.memberCount.toLocaleString()} miembros
                            </p>
                          )}
                        </div>
                        {guild.id === guildId && (
                          <Check className="w-5 h-5 text-indigo-400 flex-shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <h2 className="text-xl font-bold text-white mb-6">Configuración</h2>

        {/* Menu Items */}
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const itemHasChanges = hasChanges[item.id] || false;
            
            return (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all hover:cursor-pointer ${
                  isActive
                    ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
                    : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                }`}
              >
                <div className="flex items-center space-x-3">
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