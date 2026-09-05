// frontend/src/components/guild-settings/LeaderboardSection.jsx
import { lazy, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, Users, Zap, MessageSquare, TrendingUp, Crown, Trophy, ExternalLink, AlertTriangle
} from 'lucide-react';
import { useGuildSettings } from '../../hooks/useGuildSettings';
import { useGuildStats, useLeaderboard } from '../../hooks/queries';
import { getApiError } from '../../services/api';
// recharts pesa ~390 kB: solo se descarga al abrir esta pestaña.
const TopMembersChart = lazy(() =>
  import('./TopMembersChart').then(module => ({ default: module.TopMembersChart }))
);

const formatNumber = (value) => Number(value ?? 0).toLocaleString('es-AR');

export function LeaderboardSection() {
  const { guildId } = useGuildSettings();
  const navigate = useNavigate();

  const { data: stats, isPending: statsLoading, error: statsError } = useGuildStats(guildId);
  // Misma clave que usa la página pública del ranking: se reaprovecha la caché.
  const { data: leaderboard, isPending: topLoading } = useLeaderboard(guildId, 1, 10);

  const top = leaderboard?.leaderboard ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <BarChart3 className="w-8 h-8 text-indigo-400" />
            Actividad del servidor
          </h1>
          <p className="text-gray-400 mt-1">
            Resumen de la participación y ranking de miembros
          </p>
        </div>

        <button
          onClick={() => navigate(`/guild/${guildId}/leaderboard`)}
          className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors inline-flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
        >
          <span>Ver ranking completo</span>
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>

      {statsError ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-medium">No se pudieron cargar las estadísticas</p>
            <p className="text-red-400/80 text-sm mt-0.5">{getApiError(statsError)}</p>
          </div>
        </div>
      ) : (
        <>
          {/* Cifras del servidor: son valores sueltos, no dan para un gráfico */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            <StatTile
              icon={Users} accent="text-indigo-400" bg="bg-indigo-500/20"
              label="Miembros con XP" value={formatNumber(stats?.totalUsers)} loading={statsLoading}
            />
            <StatTile
              icon={Zap} accent="text-yellow-400" bg="bg-yellow-500/20"
              label="XP total" value={formatNumber(stats?.totalXp)} loading={statsLoading}
            />
            <StatTile
              icon={MessageSquare} accent="text-sky-400" bg="bg-sky-500/20"
              label="Mensajes" value={formatNumber(stats?.totalMessages)} loading={statsLoading}
            />
            <StatTile
              icon={TrendingUp} accent="text-emerald-400" bg="bg-emerald-500/20"
              label="Nivel promedio"
              value={stats ? (Math.round((stats.avgLevel ?? 0) * 10) / 10).toLocaleString('es-AR') : '—'}
              loading={statsLoading}
            />
            <StatTile
              icon={Crown} accent="text-amber-400" bg="bg-amber-500/20"
              label="Nivel máximo" value={formatNumber(stats?.maxLevel)} loading={statsLoading}
            />
          </div>

          {/* Récords del servidor */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <RecordCard
              icon={Trophy}
              accent="text-amber-400"
              bg="bg-amber-500/20"
              title="Más XP acumulada"
              name={stats?.topUser?.username}
              detail={stats?.topUser
                ? `Nivel ${formatNumber(stats.topUser.level)} · ${formatNumber(stats.topUser.totalXp)} XP`
                : null}
              loading={statsLoading}
            />
            <RecordCard
              icon={MessageSquare}
              accent="text-sky-400"
              bg="bg-sky-500/20"
              title="Más mensajes enviados"
              name={stats?.mostActive?.username}
              detail={stats?.mostActive
                ? `${formatNumber(stats.mostActive.messageCount)} mensajes`
                : null}
              loading={statsLoading}
            />
          </div>

          <Suspense
            fallback={<div className="h-96 bg-gray-800/40 rounded-xl animate-pulse" />}
          >
            <TopMembersChart members={top} loading={topLoading} />
          </Suspense>
        </>
      )}
    </div>
  );
}

function StatTile({ icon: Icon, accent, bg, label, value, loading }) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4">
      <div className={`${bg} w-9 h-9 rounded-lg flex items-center justify-center mb-3`}>
        <Icon className={`w-5 h-5 ${accent}`} />
      </div>
      <p className="text-gray-400 text-xs">{label}</p>
      {loading ? (
        <div className="h-7 mt-1 bg-gray-700/50 rounded animate-pulse" />
      ) : (
        <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
      )}
    </div>
  );
}

function RecordCard({ icon: Icon, accent, bg, title, name, detail, loading }) {
  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-5">
      <div className="flex items-center gap-4">
        <div className={`${bg} p-3 rounded-lg flex-shrink-0`}>
          <Icon className={`w-6 h-6 ${accent}`} />
        </div>
        <div className="min-w-0">
          <p className="text-gray-400 text-xs mb-1">{title}</p>
          {loading ? (
            <div className="h-5 w-40 bg-gray-700/50 rounded animate-pulse" />
          ) : name ? (
            <>
              <p className="text-white font-semibold truncate">{name}</p>
              <p className="text-gray-400 text-sm">{detail}</p>
            </>
          ) : (
            <p className="text-gray-500 text-sm">Todavía no hay actividad registrada</p>
          )}
        </div>
      </div>
    </div>
  );
}
