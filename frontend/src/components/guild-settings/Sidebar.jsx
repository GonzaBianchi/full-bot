// frontend/src/components/guild-settings/Sidebar.jsx
import {
  ArrowLeft, Zap, UserPlus, Trophy, Shield, BarChart3, MessageSquare,
  ChevronDown, Check, Film, Cake, History, PanelLeftClose, PanelLeftOpen, X
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

const MENU_ITEMS = [
  { id: 'xp-system', label: 'Sistema XP', icon: Zap },
  { id: 'auto-roles', label: 'Roles Bienvenida', icon: UserPlus },
  { id: 'achievements', label: 'Logros', icon: Trophy },
  { id: 'role-menus', label: 'Menú AutoRoles', icon: Shield },
  { id: 'custom-messages', label: 'Mensajes', icon: MessageSquare },
  { id: 'media-filter', label: 'Filtro Multimedia', icon: Film },
  { id: 'birthdays', label: 'Cumpleaños', icon: Cake },
  { id: 'leaderboard', label: 'Estadísticas', icon: BarChart3 },
  { id: 'audit-log', label: 'Historial', icon: History }
];

const guildIconUrl = (guild) =>
  guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null;

export function Sidebar({
  activeSection,
  setActiveSection,
  hasChanges,
  guilds = [],
  mobileOpen = false,
  onCloseMobile,
  onNavigateAway
}) {
  const navigate = useNavigate();
  const { guildId } = useParams();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);

  const currentGuild = guilds.find(g => g.id === guildId);

  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setIsDropdownOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  // El cajón móvil se cierra con Escape, como cualquier capa superpuesta.
  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') onCloseMobile?.();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileOpen, onCloseMobile]);

  const leave = (to) => {
    if (onNavigateAway) {
      onNavigateAway(to);
    } else {
      navigate(to);
    }
  };

  const handleGuildChange = (newGuildId) => {
    setIsDropdownOpen(false);
    if (newGuildId !== guildId) leave(`/guild/${newGuildId}`);
  };

  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId);
    onCloseMobile?.();
  };

  return (
    <>
      {/* Fondo del cajón: solo existe en pantallas chicas */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onCloseMobile}
          role="presentation"
        />
      )}

      <aside
        aria-label="Secciones de configuración"
        className={`
          fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300
          lg:static lg:z-auto lg:translate-x-0 lg:transition-all
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          ${isCollapsed ? 'lg:w-16' : 'lg:w-64'}
          h-full bg-gray-800 lg:bg-gray-800/50 backdrop-blur-sm
          border-r border-gray-700/50 overflow-y-auto
        `}
      >
        <div className="p-4">
          <div className="flex items-center justify-between mb-6 gap-2">
            {!isCollapsed && (
              <button
                onClick={() => leave('/dashboard')}
                className="flex items-center space-x-2 text-gray-400 hover:text-white group cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                <span>Volver</span>
              </button>
            )}

            {/* Cerrar el cajón (móvil) / colapsar la columna (escritorio) */}
            <button
              onClick={onCloseMobile}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all cursor-pointer ml-auto lg:hidden"
              aria-label="Cerrar el menú"
            >
              <X className="w-5 h-5" />
            </button>

            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="hidden lg:block p-2 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-all cursor-pointer ml-auto"
              aria-label={isCollapsed ? 'Expandir el menú' : 'Colapsar el menú'}
              aria-pressed={isCollapsed}
            >
              {isCollapsed ? <PanelLeftOpen className="w-5 h-5" /> : <PanelLeftClose className="w-5 h-5" />}
            </button>
          </div>

          {isCollapsed && (
            <button
              onClick={() => leave('/dashboard')}
              className="hidden lg:flex w-full items-center justify-center px-4 py-3 hover:bg-gray-700/50 rounded-lg transition-all cursor-pointer mb-2"
              aria-label="Volver al panel"
            >
              <ArrowLeft className="w-5 h-5 text-white" />
            </button>
          )}

          {/* Selector de servidor */}
          {currentGuild && !isCollapsed && (
            <div className="mb-6 relative" ref={dropdownRef}>
              <button
                ref={triggerRef}
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                aria-haspopup="listbox"
                aria-expanded={isDropdownOpen}
                className="w-full bg-gray-700/50 hover:bg-gray-700 rounded-lg cursor-pointer p-3 transition-all border border-gray-600/50 hover:border-indigo-500/50"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <GuildAvatar guild={currentGuild} />
                    <div className="text-left flex-1 min-w-0">
                      <p className="text-white font-medium truncate text-sm">{currentGuild.name}</p>
                      <p className="text-gray-400 text-xs">Cambiar servidor</p>
                    </div>
                  </div>
                  <ChevronDown
                    className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${
                      isDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </div>
              </button>

              {isDropdownOpen && (
                <div
                  role="listbox"
                  aria-label="Servidores disponibles"
                  className="absolute top-full left-0 right-0 mt-2 bg-gray-800 rounded-lg border border-gray-700 shadow-xl z-50 max-h-80 overflow-y-auto"
                >
                  <div className="p-2">
                    {guilds.length === 0 ? (
                      <p className="px-4 py-6 text-center text-gray-400 text-sm">
                        No hay servidores disponibles
                      </p>
                    ) : (
                      guilds.map((guild) => (
                        <button
                          key={guild.id}
                          role="option"
                          aria-selected={guild.id === guildId}
                          onClick={() => handleGuildChange(guild.id)}
                          className={`w-full cursor-pointer flex items-center space-x-3 px-3 py-2.5 rounded-lg transition-all ${
                            guild.id === guildId
                              ? 'bg-indigo-500/20 text-indigo-400'
                              : 'text-gray-300 hover:bg-gray-700/50 hover:text-white'
                          }`}
                        >
                          <GuildAvatar guild={guild} />
                          <div className="flex-1 text-left min-w-0">
                            <p className="font-medium truncate text-sm">{guild.name}</p>
                            {guild.memberCount != null && (
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

          {!isCollapsed && (
            <h2 className="text-xl font-bold text-white mb-6">Configuración</h2>
          )}

          <nav aria-label="Secciones">
            <ul className="space-y-2">
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                const itemHasChanges = hasChanges[item.id] || false;

                return (
                  <li key={item.id}>
                    <button
                      onClick={() => handleSectionChange(item.id)}
                      aria-current={isActive ? 'page' : undefined}
                      className={`relative w-full flex items-center ${
                        isCollapsed ? 'lg:justify-center' : 'justify-between'
                      } px-4 py-3 rounded-lg transition-all cursor-pointer ${
                        isActive
                          ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
                          : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                      }`}
                      title={isCollapsed ? item.label : undefined}
                    >
                      <span className={`flex items-center ${isCollapsed ? 'lg:space-x-0' : 'space-x-3'}`}>
                        <Icon className="w-5 h-5 flex-shrink-0" />
                        <span className={`font-medium ${isCollapsed ? 'lg:hidden' : ''}`}>
                          {item.label}
                        </span>
                      </span>

                      {itemHasChanges && (
                        <span
                          title="Cambios sin guardar"
                          className={`w-2 h-2 bg-yellow-400 rounded-full flex-shrink-0 ${
                            isCollapsed ? 'lg:absolute lg:right-2 lg:top-2' : ''
                          }`}
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>
      </aside>
    </>
  );
}

function GuildAvatar({ guild }) {
  const url = guildIconUrl(guild);

  if (url) {
    return <img src={url} alt="" className="w-8 h-8 rounded-full flex-shrink-0" />;
  }

  return (
    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
      {guild.name.charAt(0)}
    </div>
  );
}
