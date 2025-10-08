import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { leaderboardService, guildService } from '../services/api';
import { Trophy, Medal, Award, ArrowLeft, ChevronLeft, ChevronRight, Home } from 'lucide-react';
import toast from 'react-hot-toast';

function Leaderboard() {
  const { guildId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [leaderboard, setLeaderboard] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(parseInt(searchParams.get('page')) || 1);
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [guildInfo, setGuildInfo] = useState(null);

  useEffect(() => {
    loadLeaderboard(currentPage);
  }, [guildId, currentPage]);

  const loadLeaderboard = async (page) => {
    setLoading(true);
    try {
      // Intentar con endpoint autenticado primero
      try {
        const response = await leaderboardService.getLeaderboard(guildId, page);
        setLeaderboard(response.data.leaderboard);
        setPagination(response.data.pagination);
        setIsAuthenticated(true);
      } catch (authError) {
        // Si falla autenticación, usar endpoint público
        console.log('Usando endpoint público');
        const response = await leaderboardService.getPublic(guildId, page);
        setLeaderboard(response.data.leaderboard);
        setPagination(response.data.pagination);
        setIsAuthenticated(false);
      }

      // Fetch public guild info (name + icon)
      const infoRes = await guildService.getPublicInfo(guildId).catch((err) => {
        console.warn('Failed to load guild info', err);
        return null;
      });
      if (infoRes && infoRes.data) {
        setGuildInfo(infoRes.data);
      }
    } catch (error) {
      console.error('Error al cargar leaderboard:', error);
      toast.error('Error cargando leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <Award className="w-5 h-5 text-gray-500" />;
  };

  const getRankColor = (rank) => {
    if (rank === 1) return 'text-yellow-400 bg-yellow-400/10';
    if (rank === 2) return 'text-gray-400 bg-gray-400/10';
    if (rank === 3) return 'text-amber-600 bg-amber-600/10';
    return 'text-gray-400 bg-gray-700/30';
  };

  const getProgressPercentage = (user) => {
    if (!user.progress) return 0;
    return user.progress.percent || 0;
  };

  const changePage = (newPage) => {
    setCurrentPage(newPage);
    window.history.pushState({}, '', `?page=${newPage}`);
    // Scroll to top cuando cambie de página
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  if (loading && leaderboard.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando leaderboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-full overflow-y-auto bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => isAuthenticated ? navigate(`/guild/${guildId}`) : navigate('/')}
              className="flex items-center space-x-2 text-indigo-400 hover:text-indigo-300 transition-colors group"
            >
              {isAuthenticated ? (
                <div className="flex items-center space-x-2 hover:cursor-pointer hover:scale-105 transition-all">
                  <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                  <span>Volver al Dashboard</span>
                </div>
              ) : (
                <div className="flex items-center space-x-2 hover:cursor-pointer hover:scale-105 transition-all">
                  <Home className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <span>Ir al Inicio</span>
                </div>
              )}
            </button>

            {!isAuthenticated && (
              <a
                href={`${import.meta.env.VITE_API_URL || 'https://therifthavenfullbot.onrender.com'}/api/auth/login?redirect=/guild/${guildId}/leaderboard`}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                Iniciar Sesión
              </a>
            )}
          </div>

          <div className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
            <div className="flex items-center space-x-4">
              <div className="bg-indigo-500/20 p-3 rounded-lg">
                <Trophy className="w-8 h-8 text-indigo-400" />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-white mb-1 flex items-center gap-3">
                  🏆 Leaderboard del Servidor 
                  {/* Guild Info */}
                  {guildInfo && (
                    <div className="flex items-center gap-2">
                      {guildInfo.iconURL ? (
                        <img 
                          src={guildInfo.iconURL} 
                          alt={guildInfo.name} 
                          className="w-12 h-12 rounded-full border-2 border-gray-700" 
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-700 flex items-center justify-center">
                          <span className="text-gray-400 text-xl font-bold">
                            {guildInfo.name?.charAt(0)}
                          </span>
                        </div>
                      )}
                      <p className="text-white font-semibold truncate">
                        {guildInfo.name}
                      </p>
                    </div>
                  )}
                </h1>
                <p className="text-gray-400">
                  Top {pagination?.totalUsers || 0} usuarios más activos
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Leaderboard Cards (Mobile-friendly) */}
        <div className="space-y-3">
          {leaderboard.map((user, index) => (
            <div
              key={user.userId || index}
              className={`bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border transition-all hover:scale-[1.01] ${
                user.rank <= 3 ? 'border-indigo-500/50 shadow-lg shadow-indigo-500/20' : 'border-gray-700/50'
              }`}
            >
              <div className="flex items-center space-x-4">
                {/* Rank Badge */}
                <div className={`p-2 flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${getRankColor(user.rank)}`}>
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-0.5">
                      {getRankIcon(user.rank)}
                    </div>
                    <span className={`text-sm font-bold ${user.rank <= 3 ? getRankColor(user.rank).split(' ')[0] : 'text-gray-400'}`}>
                      #{user.rank}
                    </span>
                  </div>
                </div>

                {/* Avatar */}
                <img
                  src={
                    user.avatar ||
                    `https://cdn.discordapp.com/embed/avatars/${(parseInt(user.discriminator || '0') % 5)}.png`
                  }
                  alt={user.username}
                  className="w-12 h-12 rounded-full border-2 border-gray-700"
                />

                {/* User Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-white font-semibold truncate">
                    {user.username || 'Usuario Desconocido'}
                  </p>
                  <div className="flex items-center space-x-4 text-sm text-gray-400">
                    <span className="flex items-center space-x-1">
                      <span className="font-semibold text-indigo-400">Nivel {user.level}</span>
                    </span>
                    <span>•</span>
                    <span>{user.totalXp?.toLocaleString() || 0} XP</span>
                  </div>

                  {/* Progress Bar */}
                  {user.progress && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                        <span>{user.progress.xp?.toLocaleString() || 0} XP</span>
                        <span>{user.progress.xpForNextLevel?.toLocaleString() || 0} XP</span>
                      </div>
                      <div className="w-full bg-gray-700/50 rounded-full h-2">
                        <div
                          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${getProgressPercentage(user)}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 mt-1 text-center">
                        {getProgressPercentage(user)}% al siguiente nivel
                      </p>
                    </div>
                  )}
                </div>

                {/* Messages Count */}
                <div className="hidden sm:block text-right">
                  <p className="text-gray-400 text-xs">Mensajes</p>
                  <p className="text-white font-semibold">
                    {user.messageCount?.toLocaleString() || 0}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {leaderboard.length === 0 && !loading && (
          <div className="text-center py-16 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50">
            <Trophy className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 font-medium mb-2">No hay datos de leaderboard</p>
            <p className="text-gray-500 text-sm">
              Los usuarios comenzarán a aparecer cuando empiecen a ganar XP
            </p>
          </div>
        )}

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-8 mb-8 bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-400">
                Mostrando <span className="text-white font-medium">{((currentPage - 1) * (pagination.limit || 10)) + 1}</span> - <span className="text-white font-medium">{Math.min(currentPage * (pagination.limit || 10), pagination.totalUsers)}</span> de <span className="text-white font-medium">{pagination.totalUsers}</span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => changePage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Página anterior"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <span className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-semibold min-w-[80px] text-center">
                  {currentPage} / {pagination.totalPages}
                </span>

                <button
                  onClick={() => changePage(Math.min(pagination.totalPages, currentPage + 1))}
                  disabled={currentPage === pagination.totalPages}
                  className="p-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  title="Página siguiente"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Leaderboard;