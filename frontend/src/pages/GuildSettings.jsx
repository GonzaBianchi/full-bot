// frontend/src/pages/GuildSettings.jsx
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useGuildConfig } from '../hooks/useGuildConfig';
import { useGeneralSettings } from '../hooks/useGeneralSettings';
import { useNotificationSettings } from '../hooks/useNotificationSettings';
import { useRoleSettings } from '../hooks/useRoleSettings';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Sidebar } from '../components/guild-settings/Sidebar';
import { XPSystemSettings } from '../components/guild-settings/XPSystemSettings';
import { LeaderboardSection } from '../components/guild-settings/LeaderboardSection';
import RoleMenus from './RoleMenus';
import { useAutoRoles } from '../hooks/useAutoRoles';
import { AutoRolesSettings } from '../components/guild-settings/AutoRolesSettings';
import { AchievementsSettings } from '../components/guild-settings/AchievementsSettings';

function GuildSettings() {
  const { guildId } = useParams();
  const [activeSection, setActiveSection] = useState('xp-system');

  // Cargar configuración base
  const { config, channels, roles, loading } = useGuildConfig(guildId);

  // Obtener estado de cambios de cada sección
  const generalSettings = useGeneralSettings(guildId, config);
  const notificationSettings = useNotificationSettings(guildId, config);
  const roleSettings = useRoleSettings(guildId, config);
  const autoRolesSettings = useAutoRoles(guildId, config);

  // Mapa de cambios sin guardar por sección
  const hasChanges = {
    'xp-system': generalSettings.hasChanges || notificationSettings.hasChanges || roleSettings.hasChanges,
    'auto-roles': autoRolesSettings.hasChanges,
    'role-menus': false,
    achievements: false,
    leaderboard: false
  };

  if (loading) {
    return <LoadingSpinner text="Cargando configuración..." />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />

      <div className="flex">
        <Sidebar 
          activeSection={activeSection} 
          setActiveSection={setActiveSection}
          hasChanges={hasChanges}
        />

        <main className="flex-1 p-8">
          <div className="max-w-4xl">
            {activeSection === 'xp-system' && (
              <XPSystemSettings 
                guildId={guildId} 
                config={config} 
                channels={channels}
                roles={roles}
              />
            )}

            {activeSection === 'role-menus' && (
              <div>
                <RoleMenus />
              </div>
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

            {activeSection === 'leaderboard' && (
              <LeaderboardSection guildId={guildId} />
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default GuildSettings;