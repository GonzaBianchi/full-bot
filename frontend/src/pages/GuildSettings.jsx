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
      // La recarga ya se maneja automáticamente por useGuildConfig
      // pero puedes agregar lógica adicional aquí si es necesario
      setActiveSection('xp-system'); // Resetear a la primera sección
    }
  }, [guildId]);

  const loadGuilds = async () => {
    setGuildsLoading(true);
    try {
      const response = await guildService.getAvailable();
      // Solo los servidores donde el usuario es admin y el bot está presente
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
    achievements: false,
    leaderboard: false
  };

  if (loading || guildsLoading) {
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
          guilds={guilds}
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