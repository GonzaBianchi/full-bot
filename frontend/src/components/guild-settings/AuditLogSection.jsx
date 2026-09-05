// frontend/src/components/guild-settings/AuditLogSection.jsx
import {
  History, Zap, Hash, Bell, Shield, UserCog, Plus, Minus, AlertTriangle, RefreshCw
} from 'lucide-react';
import { useGuildSettings } from '../../hooks/useGuildSettings';
import { useAuditLog } from '../../hooks/queries';
import { getApiError } from '../../services/api';

// El backend registra estas acciones desde el panel y desde el propio bot.
const ACTIONS = {
  update_xp_multiplier: {
    label: 'Multiplicador de XP',
    icon: Zap,
    accent: 'text-yellow-400',
    bg: 'bg-yellow-500/20',
    describe: (data) => `Nuevo valor: ${data?.multiplier ?? '?'}x`
  },
  update_ignored_channels: {
    label: 'Canales ignorados',
    icon: Hash,
    accent: 'text-sky-400',
    bg: 'bg-sky-500/20',
    describe: (data) => {
      const count = data?.channels?.length ?? 0;
      return count === 0 ? 'Sin canales ignorados' : `${count} canal${count === 1 ? '' : 'es'} sin XP`;
    }
  },
  update_levelup_config: {
    label: 'Notificaciones de nivel',
    icon: Bell,
    accent: 'text-indigo-400',
    bg: 'bg-indigo-500/20',
    describe: (data) => {
      if (data?.levelUpEnabled === false) return 'Anuncios desactivados';
      if (data?.levelUpChannelId) return 'Canal de anuncios actualizado';
      return 'Mensaje de nivel actualizado';
    }
  },
  update_level_roles: {
    label: 'Roles de nivel',
    icon: Shield,
    accent: 'text-purple-400',
    bg: 'bg-purple-500/20',
    describe: (data) => {
      const count = data?.rolesCount ?? 0;
      const stack = data?.stackRoles ? 'apilados' : 'sin apilar';
      return `${count} rol${count === 1 ? '' : 'es'} configurados (${stack})`;
    }
  },
  level_roles_updated: {
    label: 'Roles asignados por el bot',
    icon: Shield,
    accent: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
    describe: (data) => {
      const added = data?.assigned?.length ?? 0;
      const removed = data?.removed?.length ?? 0;
      return `Nivel ${data?.level ?? '?'}: +${added} / -${removed} roles`;
    }
  },
  level_set: {
    label: 'Nivel fijado por un admin',
    icon: UserCog,
    accent: 'text-amber-400',
    bg: 'bg-amber-500/20',
    describe: (data) => `Nivel ${data?.oldLevel ?? '?'} → ${data?.newLevel ?? '?'}`
  },
  xp_added: {
    label: 'XP sumada',
    icon: Plus,
    accent: 'text-emerald-400',
    bg: 'bg-emerald-500/20',
    describe: (data) => `Nivel ${data?.oldLevel ?? '?'} → ${data?.newLevel ?? '?'}`
  },
  xp_removed: {
    label: 'XP restada',
    icon: Minus,
    accent: 'text-red-400',
    bg: 'bg-red-500/20',
    describe: (data) => `Nivel ${data?.oldLevel ?? '?'} → ${data?.newLevel ?? '?'}`
  }
};

const FALLBACK = {
  label: 'Cambio en la configuración',
  icon: History,
  accent: 'text-gray-400',
  bg: 'bg-gray-700/50',
  describe: () => null
};

const dateFormatter = new Intl.DateTimeFormat('es-AR', {
  day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit'
});

const relativeFormatter = new Intl.RelativeTimeFormat('es-AR', { numeric: 'auto' });

function relativeTime(date) {
  const diffMinutes = Math.round((date.getTime() - Date.now()) / 60000);

  if (Math.abs(diffMinutes) < 60) return relativeFormatter.format(diffMinutes, 'minute');
  if (Math.abs(diffMinutes) < 60 * 24) return relativeFormatter.format(Math.round(diffMinutes / 60), 'hour');
  return relativeFormatter.format(Math.round(diffMinutes / (60 * 24)), 'day');
}

export function AuditLogSection() {
  const { guildId } = useGuildSettings();
  const { data: entries = [], isPending, isFetching, error, refetch } = useAuditLog(guildId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <History className="w-8 h-8 text-indigo-400" />
            Historial de cambios
          </h1>
          <p className="text-gray-400 mt-1">
            Últimos 50 movimientos, del panel y del bot. Se conservan 30 días.
          </p>
        </div>

        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="px-4 py-2 bg-gray-700/70 hover:bg-gray-700 disabled:opacity-50 text-gray-200 rounded-lg text-sm font-medium transition-colors inline-flex items-center justify-center gap-2 cursor-pointer flex-shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
          <span>Actualizar</span>
        </button>
      </div>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-300 font-medium">No se pudo cargar el historial</p>
            <p className="text-red-400/80 text-sm mt-0.5">{getApiError(error)}</p>
          </div>
        </div>
      ) : isPending ? (
        <div className="space-y-3">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-gray-800/40 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-16 bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50">
          <History className="w-14 h-14 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 font-medium mb-1">Todavía no hay cambios registrados</p>
          <p className="text-gray-500 text-sm">
            Cuando alguien edite la configuración o el bot ajuste roles, va a aparecer acá.
          </p>
        </div>
      ) : (
        <ol className="space-y-3">
          {entries.map(entry => {
            const meta = ACTIONS[entry.action] ?? FALLBACK;
            const Icon = meta.icon;
            const detail = meta.describe(entry.data);
            const date = new Date(entry.createdAt);

            return (
              <li
                key={entry._id}
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-4 flex items-start gap-4"
              >
                <div className={`${meta.bg} p-2.5 rounded-lg flex-shrink-0`}>
                  <Icon className={`w-5 h-5 ${meta.accent}`} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium">{meta.label}</p>
                  {detail && <p className="text-gray-400 text-sm mt-0.5">{detail}</p>}
                  <p className="text-gray-500 text-xs mt-1 font-mono truncate">
                    ID de usuario: {entry.userId}
                  </p>
                </div>

                <time
                  dateTime={entry.createdAt}
                  title={dateFormatter.format(date)}
                  className="text-gray-500 text-xs whitespace-nowrap flex-shrink-0"
                >
                  {relativeTime(date)}
                </time>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
