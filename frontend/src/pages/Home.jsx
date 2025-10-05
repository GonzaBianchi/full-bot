import { useEffect, useState } from 'react';
import { Users, Settings, TrendingUp, Shield, ExternalLink } from 'lucide-react';
import { authService, guildService } from '../services/api';

function Home() {
  const [botInfo, setBotInfo] = useState(null);
  const [available, setAvailable] = useState({ manageable: [], invitables: [] });
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  const loadUser = async () => {
    try {
      const response = await authService.getMe();
      setUser(response.data);
    } catch (error) {
      setUser(null);
    }
  };

  const load = async () => {
    try {
      await loadUser();
      const [botRes, availRes] = await Promise.all([
        guildService.getBotInfo().catch(() => null),
        guildService.getAvailable().catch(() => ({ data: { manageable: [], invitables: [] } }))
      ]);
      
      setBotInfo(botRes?.data);
      setAvailable(availRes?.data || { manageable: [], invitables: [] });
    } catch (e) {
      console.error('Error loading data:', e);
    } finally {
      setLoading(false);
    }
  };

  const inviteUrlFor = (clientId, guildId) => {
    const perms = 8 | 1024 | 2048 | 268435456;
    return `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${perms}&scope=bot%20applications.commands&guild_id=${guildId}`;
  };

  const getGuildIcon = (guild) => {
    if (guild.icon) {
      return `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`;
    }
    return null;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Hero Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            {botInfo && (
              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <img 
                    src={botInfo.avatarURL} 
                    alt="bot" 
                    className="w-24 h-24 rounded-full ring-4 ring-indigo-500/50 shadow-2xl"
                  />
                  <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1">
                    <div className="w-4 h-4 bg-white rounded-full"></div>
                  </div>
                </div>
                <div>
                  <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 mb-2">
                    {botInfo.username}
                  </h1>
                  <p className="text-xl text-gray-400">
                    Sistema de niveles y gestión para Discord
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Stats Cards */}
          {botInfo && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-indigo-500/50 hover:scale-105 transition-all cursor-pointer">
                <div className="flex items-center space-x-4">
                  <div className="bg-indigo-500/20 p-3 rounded-lg">
                    <Users className="w-6 h-6 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Servidores</p>
                    <p className="text-2xl font-bold text-white">{botInfo.guildCount || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-purple-500/50 hover:scale-105 transition-all cursor-pointer">
                <div className="flex items-center space-x-4">
                  <div className="bg-purple-500/20 p-3 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Usuarios Activos</p>
                    <p className="text-2xl font-bold text-white">{botInfo.userCount?.toLocaleString() || 0}</p>
                  </div>
                </div>
              </div>

              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-green-500/50 hover:scale-105 transition-all cursor-pointer">
                <div className="flex items-center space-x-4">
                  <div className="bg-green-500/20 p-3 rounded-lg">
                    <Shield className="w-6 h-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Estado</p>
                    <p className="text-2xl font-bold text-white">Operativo</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Manageable Servers */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
            <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 px-6 py-4 border-b border-gray-700/50">
              <div className="flex items-center space-x-3">
                <Settings className="w-6 h-6 text-indigo-400" />
                <h2 className="text-xl font-bold text-white">Tus Servidores</h2>
              </div>
              <p className="text-gray-400 text-sm mt-1">Servidores donde tienes permisos de administración</p>
            </div>
            
            <div className="p-6">
              {available.manageable.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-700/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Settings className="w-8 h-8 text-gray-500" />
                  </div>
                  <p className="text-gray-400 mb-2">No hay servidores disponibles</p>
                  <p className="text-gray-500 text-sm">Invita el bot a un servidor donde seas administrador</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {available.manageable.map(g => (
                    <div 
                      key={g.id} 
                      className="group bg-gray-700/30 hover:bg-gray-700/50 rounded-lg p-4 transition-all hover:scale-[1.02] cursor-pointer border border-transparent hover:border-indigo-500/50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getGuildIcon(g) ? (
                            <img src={getGuildIcon(g)} alt={g.name} className="w-12 h-12 rounded-full" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold text-lg">
                              {g.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <h3 className="text-white font-semibold group-hover:text-indigo-400 transition-colors">
                              {g.name}
                            </h3>
                            {g.memberCount && (
                              <p className="text-gray-400 text-sm flex items-center space-x-1">
                                <Users className="w-3 h-3" />
                                <span>{g.memberCount.toLocaleString()} miembros</span>
                              </p>
                            )}
                          </div>
                        </div>
                        {user ? (
                          <Link 
                            to={`/guild/${g.id}`}
                            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                          >
                            <span>Configurar</span>
                            <ExternalLink className="w-4 h-4" />
                          </Link>
                        ) : (
                          <a 
                            href={authService.login(`/guild/${g.id}`)}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            Iniciar sesión
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Invitable Servers */}
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-6 py-4 border-b border-gray-700/50">
              <div className="flex items-center space-x-3">
                <Users className="w-6 h-6 text-purple-400" />
                <h2 className="text-xl font-bold text-white">Invitar Bot</h2>
              </div>
              <p className="text-gray-400 text-sm mt-1">Servidores donde puedes agregar el bot</p>
            </div>
            
            <div className="p-6">
              {available.invitables.length === 0 ? (
                <div className="text-center py-12">
                  <div className="bg-gray-700/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-gray-500" />
                  </div>
                  <p className="text-gray-400 mb-2">No hay servidores disponibles</p>
                  <p className="text-gray-500 text-sm">Necesitas permisos para invitar bots</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {available.invitables.map(g => (
                    <div 
                      key={g.id} 
                      className="group bg-gray-700/30 hover:bg-gray-700/50 rounded-lg p-4 transition-all hover:scale-[1.02] border border-transparent hover:border-purple-500/50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {getGuildIcon(g) ? (
                            <img src={getGuildIcon(g)} alt={g.name} className="w-12 h-12 rounded-full" />
                          ) : (
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-lg">
                              {g.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <h3 className="text-white font-semibold group-hover:text-purple-400 transition-colors">
                              {g.name}
                            </h3>
                          </div>
                        </div>
                        {user ? (
                          <a 
                            href={inviteUrlFor('YOUR_CLIENT_ID', g.id)}
                            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2"
                          >
                            <span>Invitar</span>
                            <ExternalLink className="w-4 h-4" />
                          </a>
                        ) : (
                          <a 
                            href={authService.login('/')}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-sm font-medium transition-colors"
                          >
                            Iniciar sesión
                          </a>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-gray-700/50"></div>
      </div>

      {/* Features Section with Background */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/10 to-purple-500/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-3xl font-bold text-center text-white mb-3">Características Principales</h2>
          <p className="text-center text-gray-400 mb-12">Descubre todo lo que el bot puede hacer por tu servidor</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-indigo-500/50 hover:scale-105 transition-all cursor-pointer">
              <div className="bg-indigo-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <TrendingUp className="w-6 h-6 text-indigo-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Sistema de XP</h3>
              <p className="text-gray-400">Gana experiencia por participar en el servidor y sube de nivel automáticamente.</p>
            </div>

            <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-purple-500/50 hover:scale-105 transition-all cursor-pointer">
              <div className="bg-purple-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-purple-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Roles Automáticos</h3>
              <p className="text-gray-400">Asigna roles automáticamente cuando los usuarios alcancen ciertos niveles.</p>
            </div>

            <div className="bg-gradient-to-r from-green-500/20 to-teal-500/20 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-green-500/50 hover:scale-105 transition-all cursor-pointer">
              <div className="bg-green-500/20 w-12 h-12 rounded-lg flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-green-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">Leaderboards</h3>
              <p className="text-gray-400">Visualiza los usuarios más activos de tu servidor con rankings detallados.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;