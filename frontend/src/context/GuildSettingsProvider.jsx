// frontend/src/context/GuildSettingsProvider.jsx
import { useMemo } from 'react';
import { useGuildConfig, useGuildResources } from '../hooks/queries';
import { useGeneralSettings } from '../hooks/useGeneralSettings';
import { useNotificationSettings } from '../hooks/useNotificationSettings';
import { useRoleSettings } from '../hooks/useRoleSettings';
import { useAutoRoles } from '../hooks/useAutoRoles';
import { useDraft } from '../hooks/useDraft';
import { GuildSettingsContext } from '../hooks/useGuildSettings';

const MEDIA_FILTER_DEFAULTS = {
  enabled: false,
  sourceChannels: [],
  targetChannelId: null,
  types: { images: true, videos: true, gifs: true },
  includeEmbeds: false,
  customMessage: '📎 **{author}** compartió multimedia desde #{channel}'
};

const BIRTHDAY_DEFAULTS = {
  enabled: false,
  channelId: null,
  message: '🎂 ¡Feliz cumpleaños {mention}! 🎉 ¡Que tengas un día increíble!',
  mentionRole: null,
  embedEnabled: true,
  embedColor: '#FF69B4'
};

/**
 * Fuente única del estado del panel de un servidor.
 *
 * Antes cada sección instanciaba sus propios hooks y `GuildSettings` instanciaba
 * otra copia para pintar el indicador del sidebar: eran dos estados distintos,
 * así que el punto de "cambios sin guardar" leía una copia que nadie editaba.
 */
export function GuildSettingsProvider({ guildId, children }) {
  const configQuery = useGuildConfig(guildId);
  const resourcesQuery = useGuildResources(guildId);

  const config = configQuery.data;

  const general = useGeneralSettings(guildId, config);
  const notifications = useNotificationSettings(guildId, config);
  const levelRoles = useRoleSettings(guildId, config);
  const autoRoles = useAutoRoles(guildId, config);
  const mediaFilter = useDraft(config?.mediaFilter ?? MEDIA_FILTER_DEFAULTS);
  const birthdays = useDraft(config?.birthdays ?? BIRTHDAY_DEFAULTS);

  const value = useMemo(() => {
    const xpSystemChanges =
      general.hasChanges || notifications.hasChanges || levelRoles.hasChanges;

    return {
      guildId,
      config,
      channels: resourcesQuery.data?.channels ?? [],
      roles: resourcesQuery.data?.roles ?? [],
      emojis: resourcesQuery.data?.emojis ?? [],

      isLoading: configQuery.isPending || resourcesQuery.isPending,
      error: configQuery.error || resourcesQuery.error,
      refetch: () => {
        configQuery.refetch();
        resourcesQuery.refetch();
      },

      general,
      notifications,
      levelRoles,
      autoRoles,
      mediaFilter,
      birthdays,

      // Las secciones que faltan guardan al instante (logros, menús de roles)
      // o son acciones sueltas (enviar mensaje, ver leaderboard): no tienen
      // borrador que perder.
      hasChanges: {
        'xp-system': xpSystemChanges,
        'auto-roles': autoRoles.hasChanges,
        'media-filter': mediaFilter.hasChanges,
        birthdays: birthdays.hasChanges,
        'role-menus': false,
        'custom-messages': false,
        achievements: false,
        leaderboard: false,
        'audit-log': false
      },

      /** ¿Queda algo sin guardar en cualquier sección? */
      get isDirty() {
        return (
          xpSystemChanges ||
          autoRoles.hasChanges ||
          mediaFilter.hasChanges ||
          birthdays.hasChanges
        );
      }
    };
  }, [
    guildId,
    config,
    configQuery,
    resourcesQuery,
    general,
    notifications,
    levelRoles,
    autoRoles,
    mediaFilter,
    birthdays
  ]);

  return (
    <GuildSettingsContext.Provider value={value}>
      {children}
    </GuildSettingsContext.Provider>
  );
}
