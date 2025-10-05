// frontend/src/pages/GuildSettings.jsx (REFACTORIZADO)
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useGuildConfig } from '../hooks/useGuildConfig';
import { useGeneralSettings } from '../hooks/useGeneralSettings';
import { useNotificationSettings } from '../hooks/useNotificationSettings';
import { useRoleSettings } from '../hooks/useRoleSettings';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { Sidebar } from '../components/guild-settings/Sidebar';
import { GeneralSettings } from '../components/guild-settings/GeneralSettings';
import { NotificationSettings } from '../components/guild-settings/NotificationSettings';
import { RoleSettings } from '../components/guild-settings/RoleSettings';
import { LeaderboardSection } from '../components/guild-settings/LeaderboardSection';
import RoleMenus from './RoleMenus';

function GuildSettings() {
  const { guildId } = useParams();
  const [activeSection, setActiveSection] = useState('general');

  // Cargar configuración base
  const { config, channels, roles, loading } = useGuildConfig(guildId);

  // Obtener estado de cambios de cada sección
  const generalSettings = useGeneralSettings(guildId, config);
  const notificationSettings = useNotificationSettings(guildId, config);
  const roleSettings = useRoleSettings(guildId, config);

  // Mapa de cambios sin guardar por sección
  const hasChanges = {
    general: generalSettings.hasChanges,
    notifications: notificationSettings.hasChanges,
    roles: roleSettings.hasChanges,
    'role-menus': false,
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
            {activeSection === 'general' && (
              <GeneralSettings 
                guildId={guildId} 
                config={config} 
                channels={channels} 
              />
            )}

            {activeSection === 'notifications' && (
              <NotificationSettings 
                guildId={guildId} 
                config={config} 
                channels={channels} 
              />
            )}

            {activeSection === 'roles' && (
              <RoleSettings 
                guildId={guildId} 
                config={config} 
                roles={roles} 
              />
            )}

            {activeSection === 'role-menus' && (
              <div>
                <RoleMenus />
              </div>
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