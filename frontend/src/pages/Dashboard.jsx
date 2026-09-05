// frontend/src/pages/Dashboard.jsx
// Selector de servidores: es la pantalla a la que aterriza el callback de
// OAuth (`/dashboard`), que antes mostraba un placeholder vacío.
import { Link } from 'react-router-dom';
import { Users, Settings, ExternalLink, AlertTriangle, Plus, Trophy } from 'lucide-react';
import { useAvailableGuilds, useBotInfo, useGlobalTop } from '../hooks/queries';
import { getApiError } from '../services/api';

const INVITE_PERMISSIONS = 8 | 1024 | 2048 | 268435456;

const guildIconUrl = (guild) =>
  guild.icon ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png` : null;

const inviteUrlFor = (clientId, guildId) =>
  `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${INVITE_PERMISSIONS}&scope=bot%20applications.commands&guild_id=${guildId}`;

function Dashboard({ user }) {
  const { data: botInfo } = useBotInfo();
  const { data: guilds, isPending, error, refetch } = useAvailableGuilds();
  const { data: globalTop = [], isPending: topPending } = useGlobalTop(5);

  const manageable = guilds?.manageable ?? [];
  const invitables = guilds?.invitables ?? [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">
          Hola, {user?.username ?? 'admin'} 👋
        </h1>
        <p className="text-gray-400 mt-1">
          Elegí el servidor que querés configurar.
        </p>
      </div>

      {error && (
        <div className="mb-8 bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start space-x-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-red-300 font-medium">No se pudieron cargar tus servidores</p>
            <p className="text-red-400/80 text-sm mt-0.5">{getApiError(error)}</p>
          </div>
          <button
            onClick={() => refetch()}
            className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-200 rounded-lg text-sm transition-colors cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
        {/* Servidores administrables */}
        <section className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
          <header className="bg-gradient-to-r from-indigo-500/20 to-purple-500/20 px-6 py-4 border-b border-gray-700/50">
            <div className="flex items-center space-x-3">
              <Settings className="w-6 h-6 text-indigo-400" />
              <h2 className="text-lg font-bold text-white">Tus servidores</h2>
            </div>
            <p className="text-gray-400 text-sm mt-1">
              Donde el bot ya está y tenés permisos de administración
            </p>
          </header>

          <div className="p-6">
            {isPending ? (
              <GuildListSkeleton />
            ) : manageable.length === 0 ? (
              <EmptyState
                icon={Settings}
                title="Todavía no hay servidores"
                text="Invitá el bot a un servidor donde seas administrador."
              />
            ) : (
              <ul className="space-y-3">
                {manageable.map(guild => (
                  <li key={guild.id}>
                    <Link
                      to={`/guild/${guild.id}`}
                      className="group flex items-center justify-between gap-3 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg p-4 transition-all border border-transparent hover:border-indigo-500/50"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <GuildAvatar guild={guild} accent="from-indigo-500 to-purple-500" />
                        <div className="min-w-0">
                          <h3 className="text-white font-semibold truncate group-hover:text-indigo-400 transition-colors">
                            {guild.name}
                          </h3>
                          {guild.memberCount != null && (
                            <p className="text-gray-400 text-sm flex items-center space-x-1">
                              <Users className="w-3 h-3" />
                              <span>{guild.memberCount.toLocaleString()} miembros</span>
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="px-4 py-2 bg-indigo-600 group-hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 flex-shrink-0">
                        <span className="hidden sm:inline">Configurar</span>
                        <ExternalLink className="w-4 h-4" />
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        {/* Servidores donde falta el bot */}
        <section className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
          <header className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 px-6 py-4 border-b border-gray-700/50">
            <div className="flex items-center space-x-3">
              <Plus className="w-6 h-6 text-purple-400" />
              <h2 className="text-lg font-bold text-white">Invitar el bot</h2>
            </div>
            <p className="text-gray-400 text-sm mt-1">
              Servidores tuyos donde el bot todavía no está
            </p>
          </header>

          <div className="p-6">
            {isPending ? (
              <GuildListSkeleton />
            ) : invitables.length === 0 ? (
              <EmptyState
                icon={Users}
                title="Nada pendiente"
                text="El bot ya está en todos los servidores que administrás."
              />
            ) : (
              <ul className="space-y-3">
                {invitables.map(guild => (
                  <li
                    key={guild.id}
                    className="group flex items-center justify-between gap-3 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg p-4 transition-all border border-transparent hover:border-purple-500/50"
                  >
                    <div className="flex items-center space-x-3 min-w-0">
                      <GuildAvatar guild={guild} accent="from-purple-500 to-pink-500" />
                      <h3 className="text-white font-semibold truncate">{guild.name}</h3>
                    </div>
                    <a
                      href={inviteUrlFor(botInfo?.id, guild.id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center space-x-2 flex-shrink-0 ${
                        botInfo?.id
                          ? 'bg-purple-600 hover:bg-purple-500 text-white'
                          : 'bg-gray-600 text-gray-300 pointer-events-none opacity-60'
                      }`}
                    >
                      <span>Invitar</span>
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>

      <GlobalTopCard entries={globalTop} loading={topPending} />
    </div>
  );
}

/** Top de miembros sumando todos los servidores del usuario. */
function GlobalTopCard({ entries, loading }) {
  if (!loading && entries.length === 0) return null;

  return (
    <section className="mt-6 lg:mt-8 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 overflow-hidden">
      <header className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-6 py-4 border-b border-gray-700/50">
        <div className="flex items-center space-x-3">
          <Trophy className="w-6 h-6 text-amber-400" />
          <h2 className="text-lg font-bold text-white">Top global</h2>
        </div>
        <p className="text-gray-400 text-sm mt-1">
          Miembros con más XP sumando todos tus servidores
        </p>
      </header>

      <div className="p-6">
        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map(i => (
              <div key={i} className="h-12 bg-gray-700/20 rounded-lg animate-pulse" />
            ))}
          </div>
        ) : (
          <ol className="space-y-2">
            {entries.map((entry, index) => (
              <li
                key={entry.userId}
                className="flex items-center gap-4 bg-gray-700/20 rounded-lg px-4 py-3"
              >
                <span className="text-gray-400 font-bold tabular-nums w-6 flex-shrink-0">
                  {index + 1}
                </span>
                <span className="text-white font-medium truncate flex-1 min-w-0">
                  {entry.username || 'Usuario desconocido'}
                </span>
                <span className="text-gray-400 text-sm whitespace-nowrap hidden sm:inline">
                  {entry.servers} servidor{entry.servers === 1 ? '' : 'es'}
                </span>
                <span className="text-indigo-400 font-semibold tabular-nums whitespace-nowrap">
                  {(entry.totalXp ?? 0).toLocaleString('es-AR')} XP
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function GuildAvatar({ guild, accent }) {
  const url = guildIconUrl(guild);

  if (url) {
    return <img src={url} alt="" className="w-12 h-12 rounded-full flex-shrink-0" />;
  }

  return (
    <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${accent} flex items-center justify-center text-white font-bold text-lg flex-shrink-0`}>
      {guild.name.charAt(0)}
    </div>
  );
}

function GuildListSkeleton() {
  return (
    <div className="space-y-3">
      {[0, 1, 2].map(i => (
        <div key={i} className="bg-gray-700/20 rounded-lg p-4 animate-pulse">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 rounded-full bg-gray-700/60" />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-gray-700/60 rounded w-1/3" />
              <div className="h-3 bg-gray-700/40 rounded w-1/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon: Icon, title, text }) {
  return (
    <div className="text-center py-12">
      <div className="bg-gray-700/30 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-8 h-8 text-gray-500" />
      </div>
      <p className="text-gray-400 mb-2">{title}</p>
      <p className="text-gray-500 text-sm">{text}</p>
    </div>
  );
}

export default Dashboard;
