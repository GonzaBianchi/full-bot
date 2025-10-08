// frontend/src/pages/GuildSettings.jsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useGuildConfig } from '../hooks/useGuildConfig';
import { useGeneralSettings } from '../hooks/useGeneralSettings';
import { useNotificationSettings } from '../hooks/useNotificationSettings';
import { useRoleSettings } from '../hooks/useRoleSettings';
import { useAutoRoles } from '../hooks/useAutoRoles';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Sidebar } from '../components/guild-settings/Sidebar';
import { XPSystemSettings } from '../components/guild-settings/XPSystemSettings';
import { LeaderboardSection } from '../components/guild-settings/LeaderboardSection';
import { AutoRolesSettings } from '../components/guild-settings/AutoRolesSettings';
import { AchievementsSettings } from '../components/guild-settings/AchievementsSettings';
import { CustomMessages } from '../components/guild-settings/CustomMessages';
import { MediaFilterSettings } from '../components/guild-settings/MediaFilterSettings';
import { BirthdaySettings } from '../components/guild-settings/BirthdaySettings';
import RoleMenus from './RoleMenus';
import { guildService } from '../services/api';

function GuildSettings() {
  const { guildId } = useParams();
  const [activeSection, setActiveSection] = useState('xp-system');
  const [guilds, setGuilds] = useState([]);
  const [guildsLoading, setGuildsLoading] = useState(true);

  // Cargar configuración base
  const { config, channels, roles, loading } = useGuildConfig(guildId);

  // Obtener estado de cambios de cada sección
  const generalSettings = useGeneralSettings(guildId, config);
  const notificationSettings = useNotificationSettings(guildId, config);
  const roleSettings = useRoleSettings(guildId, config);
  const autoRolesSettings = useAutoRoles(guildId, config);

  // Cargar lista de servidores disponibles
  useEffect(() => {
    loadGuilds();
  }, []);

  // Recargar configuración cuando cambie el guildId
  useEffect(() => {
    if (guildId) {
      setActiveSection('xp-system');
    }
  }, [guildId]);

  const loadGuilds = async () => {
    setGuildsLoading(true);
    try {
      const response = await guildService.getAvailable();
      setGuilds(response.data.manageable || []);
    } catch (error) {
      console.error('Error loading guilds:', error);
      setGuilds([]);
    } finally {
      setGuildsLoading(false);
    }
  };

  // Mapa de cambios sin guardar por sección
  const hasChanges = {
    'xp-system': generalSettings.hasChanges || notificationSettings.hasChanges || roleSettings.hasChanges,
    'auto-roles': autoRolesSettings.hasChanges,
    'role-menus': false,
    'custom-messages': false,
    'media-filter': false,
    'birthdays': false,
    achievements: false,
    leaderboard: false
  };

  if (loading || guildsLoading) {
    return <LoadingSpinner text="Cargando configuración..." />;
  }

  return (
    <>
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />

      <div className="flex min-h-screen">
        <Sidebar 
          activeSection={activeSection} 
          setActiveSection={setActiveSection}
          hasChanges={hasChanges}
          guilds={guilds}
        />

        <main className="flex-1 p-8 overflow-y-auto">
          <div className="max-w-4xl mx-auto">
            {activeSection === 'xp-system' && (
              <XPSystemSettings 
                guildId={guildId} 
                config={config} 
                channels={channels}
                roles={roles}
              />
            )}

            {activeSection === 'role-menus' && (
              <RoleMenus />
            )}

            {activeSection === 'auto-roles' && (
              <AutoRolesSettings 
                guildId={guildId} 
                config={config} 
                channels={channels}
                roles={roles} 
              />
            )}

            {activeSection === 'achievements' && (
              <AchievementsSettings 
                guildId={guildId} 
                roles={roles}
                channels={channels}
              />
            )}

            {activeSection === 'custom-messages' && (
              <CustomMessages 
                guildId={guildId} 
                channels={channels}
              />
            )}

            {activeSection === 'media-filter' && (
              <MediaFilterSettings 
                guildId={guildId} 
                config={config}
                channels={channels}
                roles={roles}
              />
            )}

            {activeSection === 'birthdays' && (
              <BirthdaySettings 
                guildId={guildId} 
                config={config}
                channels={channels}
                roles={roles}
              />
            )}

            {activeSection === 'leaderboard' && (
              <LeaderboardSection guildId={guildId} />
            )}
          </div>
        </main>
      </div>
    </>
  );
}

export default GuildSettings;