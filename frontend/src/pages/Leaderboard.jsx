import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { Trophy, Medal, Award, ArrowLeft, ChevronLeft, ChevronRight, Home, Search, X } from 'lucide-react';
import { useLeaderboard, useGuildPublicInfo, useMe, useLeaderboardSearch } from '../hooks/queries';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { getApiError, loginUrl } from '../services/api';

// Un evento por cada mensaje que da XP inundaría de refetches: se agrupan.
const LIVE_REFRESH_MS = 3000;

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

const getProgressPercentage = (user) => user.progress?.percent ?? 0;

function Leaderboard() {
  const { guildId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const currentPage = Math.max(1, parseInt(searchParams.get('page'), 10) || 1);

  const { data, isPending, isPlaceholderData } = useLeaderboard(guildId, currentPage);
  const { data: guildInfo } = useGuildPublicInfo(guildId);
  const { data: user } = useMe();

  const leaderboard = data?.leaderboard ?? [];
  const pagination = data?.pagination ?? null;
  const loading = isPending || isPlaceholderData;
  const isAuthenticated = Boolean(user);

  const [liveUpdate, setLiveUpdate] = useState(false);

  // La búsqueda usa un endpoint que exige sesión y pertenencia al servidor.
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search.trim());
  const isSearching = isAuthenticated && debouncedSearch.length >= 2;
  const {
    data: searchResults = [],
    isPending: searchPending,
    isFetching: searchFetching,
    error: searchError
  } = useLeaderboardSearch(guildId, debouncedSearch, isAuthenticated);
  const searchLoading = isSearching && (searchPending || searchFetching);
  const clearSearch = () => setSearch('');

  // SSE: solo depende del servidor. Antes dependía también de la página, así
  // que cada cambio de página cerraba y reabría la conexión.
  const refreshTimer = useRef(null);

  useEffect(() => {
    if (!guildId) return;

    const url = `${import.meta.env.VITE_API_URL ?? ''}/api/leaderboard/public/${guildId}/events`;
    const source = new EventSource(url);

    source.onmessage = (event) => {
      let payload;
      try {
        payload = JSON.parse(event.data);
      } catch (error) {
        console.warn('Evento SSE ilegible:', error);
        return;
      }

      if (payload.event === 'connected') return;

      setLiveUpdate(true);
      if (refreshTimer.current) return;

      refreshTimer.current = setTimeout(() => {
        refreshTimer.current = null;
        setLiveUpdate(false);
        queryClient.invalidateQueries({ queryKey: ['leaderboard', guildId] });
      }, LIVE_REFRESH_MS);
    };

    // Sin handler propio, EventSource reconecta solo. El anterior cerraba la
    // conexión al primer error y el "en vivo" ya no volvía nunca.
    source.onerror = () => {
      if (source.readyState === EventSource.CLOSED) {
        console.warn('Conexión de leaderboard en vivo cerrada por el servidor');
      }
    };

    return () => {
      source.close();
      if (refreshTimer.current) {
        clearTimeout(refreshTimer.current);
        refreshTimer.current = null;
      }
    };
  }, [guildId, queryClient]);

  // La página vive en la URL: así el botón "atrás" del navegador funciona y el
  // enlace se puede compartir apuntando a una página concreta.
  const changePage = useCallback((newPage) => {
    setSearchParams(newPage === 1 ? {} : { page: String(newPage) });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [setSearchParams]);

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
                href={loginUrl(`/guild/${guildId}/leaderboard`)}
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
                <p className="text-gray-400 flex items-center gap-2">
                  Top {pagination?.totalUsers || 0} usuarios más activos
                  <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-all ${liveUpdate ? 'bg-green-500/20 text-green-400' : 'bg-gray-700/50 text-gray-500'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${liveUpdate ? 'bg-green-400 animate-pulse' : 'bg-gray-500'}`}></span>
                    En vivo
                  </span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Buscador: el endpoint pide sesión y pertenencia al servidor */}
        {isAuthenticated && (
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar un miembro por nombre..."
              aria-label="Buscar un miembro en el ranking"
              className="w-full bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 focus:border-indigo-500/70 focus:outline-none rounded-xl pl-12 pr-11 py-3 text-white placeholder-gray-500 transition-colors"
            />
            {search && (
              <button
                onClick={clearSearch}
                aria-label="Limpiar la búsqueda"
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {search.trim().length === 1 && (
              <p className="text-gray-500 text-xs mt-2 ml-1">Escribí al menos 2 caracteres.</p>
            )}
          </div>
        )}

        {/* Resultados de búsqueda o ranking paginado */}
        {isSearching ? (
          <SearchResults
            term={debouncedSearch}
            results={searchResults}
            loading={searchLoading}
            error={searchError}
            onClear={clearSearch}
          />
        ) : (
          <div className="space-y-3">
            {leaderboard.map((user, index) => (
              <MemberCard key={user.userId || index} user={user} />
            ))}
          </div>
        )}

        {/* Empty State */}
        {!isSearching && leaderboard.length === 0 && !loading && (
          <div className="text-center py-16 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50">
            <Trophy className="w-16 h-16 text-gray-500 mx-auto mb-4" />
            <p className="text-gray-400 font-medium mb-2">No hay datos de leaderboard</p>
            <p className="text-gray-500 text-sm">
              Los usuarios comenzarán a aparecer cuando empiecen a ganar XP
            </p>
          </div>
        )}

        {/* Pagination */}
        {!isSearching && pagination && pagination.totalPages > 1 && (
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


function MemberCard({ user }) {
  return (
            <div
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
  );
}

function SearchResults({ term, results, loading, error, onClear }) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="text-gray-400">
          {loading
            ? 'Buscando...'
            : `${results.length} resultado${results.length === 1 ? '' : 's'} para "${term}"`}
        </p>
        <button
          onClick={onClear}
          className="text-indigo-400 hover:text-indigo-300 transition-colors cursor-pointer"
        >
          Volver al ranking
        </button>
      </div>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm">
          {getApiError(error, 'No se pudo buscar en el ranking')}
        </div>
      ) : loading ? (
        <div className="space-y-3">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-24 bg-gray-800/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="text-center py-12 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50">
          <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400">Ningún miembro coincide con la búsqueda</p>
        </div>
      ) : (
        results.map(user => <MemberCard key={user.userId} user={user} />)
      )}
    </div>
  );
}

export default Leaderboard;
