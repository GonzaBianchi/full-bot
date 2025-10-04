// ...existing code...
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { leaderboardService } from '../services/api';
import { Trophy, Medal, Award, ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';

function Leaderboard() {
  const { guildId } = useParams();
  const [leaderboard, setLeaderboard] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard(currentPage);
  }, [guildId, currentPage]);

  const loadLeaderboard = async (page) => {
    setLoading(true);
    try {
      const response = await leaderboardService.getLeaderboard(guildId, page);
      setLeaderboard(response.data.leaderboard);
      setPagination(response.data.pagination);
    } catch (error) {
      console.error('Error al cargar leaderboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Trophy className="w-5 h-5 text-yellow-400" />;
    if (rank === 2) return <Medal className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Medal className="w-5 h-5 text-amber-600" />;
    return <Award className="w-5 h-5 text-discord-lightgray" />;
  };

  const getRankColor = (rank) => {
    if (rank === 1) return 'text-yellow-400';
    if (rank === 2) return 'text-gray-400';
    if (rank === 3) return 'text-amber-600';
    return 'text-discord-lightgray';
  };

  const getProgressPercentage = (user) => {
    const denom = user.xpForNextLevel || 1;
    return Math.floor((user.xp / denom) * 100);
  };

  if (loading && leaderboard.length === 0) {
    return (
      <div className="min-h-screen bg-discord-dark flex items-center justify-center">
        <div className="text-white text-xl">Cargando leaderboard...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-discord-dark">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <Link
              to={`/guild/${guildId}`}
              className="flex items-center space-x-2 text-discord-blurple hover:text-blue-400 transition-colors mb-4"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Volver al Dashboard</span>
            </Link>
            <h1 className="text-3xl font-bold text-white mb-2">
              Leaderboard
            </h1>
            <p className="text-discord-lightgray">
              Top {pagination?.totalUsers || 0} usuarios del servidor
            </p>
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="bg-discord-gray rounded-lg border border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-discord-dark border-b border-gray-700">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-discord-lightgray uppercase tracking-wider">
                    Ranking
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-discord-lightgray uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-discord-lightgray uppercase tracking-wider">
                    Nivel
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-discord-lightgray uppercase tracking-wider">
                    XP
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-discord-lightgray uppercase tracking-wider">
                    Mensajes
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold text-discord-lightgray uppercase tracking-wider">
                    Progreso
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {leaderboard.map(user => (
                  <tr
                    key={user.userId}
                    className="hover:bg-discord-dark/50 transition-colors"
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {getRankIcon(user.rank)}
                        <span className={`font-bold ${getRankColor(user.rank)}`}>
                          #{user.rank}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-3">
                        <img
                          src={
                            user.avatar ||
                            `https://cdn.discordapp.com/embed/avatars/${(parseInt(user.discriminator || '0') % 5)}.png`
                          }
                          alt={user.username}
                          className="w-10 h-10 rounded-full"
                        />
                        <div>
                          <p className="text-white font-medium">
                            {user.displayName || user.username}
                          </p>
                          <p className="text-discord-lightgray text-sm">
                            {user.username}#{user.discriminator}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-discord-blurple text-white">
                        {user.level}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-white">
                        <p className="font-semibold">{user.totalXp.toLocaleString()}</p>
                        <p className="text-xs text-discord-lightgray">
                          {user.xp} / {user.xpForNextLevel}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-white font-medium">
                        {user.messageCount.toLocaleString()}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="w-32">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-discord-dark rounded-full h-2">
                            <div
                              className="bg-discord-blurple h-2 rounded-full transition-all"
                              style={{ width: `${getProgressPercentage(user)}%` }}
                            />
                          </div>
                          <span className="text-xs text-discord-lightgray font-medium">
                            {getProgressPercentage(user)}%
                          </span>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="bg-discord-dark px-6 py-4 flex items-center justify-between border-t border-gray-700">
              <div className="text-sm text-discord-lightgray">
                Mostrando {((currentPage - 1) * pagination.limit) + 1} - {Math.min(currentPage * pagination.limit, pagination.totalUsers)} de {pagination.totalUsers}
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-discord-gray hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <span className="px-4 py-2 bg-discord-blurple text-white rounded font-semibold">
                  {currentPage} / {pagination.totalPages}
                </span>

                <button
                  onClick={() => setCurrentPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={currentPage === pagination.totalPages}
                  className="px-3 py-2 bg-discord-gray hover:bg-gray-600 text-white rounded disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Leaderboard;