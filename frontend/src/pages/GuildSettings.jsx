// frontend/src/pages/GuildSettings.jsx
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, Menu } from 'lucide-react';
import { GuildSettingsProvider } from '../context/GuildSettingsProvider';
import { useGuildSettings } from '../hooks/useGuildSettings';
import { useAvailableGuilds } from '../hooks/queries';
import { getApiError } from '../services/api';
import { LoadingSpinner } from '../components/ui/LoadingSpinner';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { Sidebar } from '../components/guild-settings/Sidebar';
import { XPSystemSettings } from '../components/guild-settings/XPSystemSettings';
import { LeaderboardSection } from '../components/guild-settings/LeaderboardSection';
import { AutoRolesSettings } from '../components/guild-settings/AutoRolesSettings';
import { AchievementsSettings } from '../components/guild-settings/AchievementsSettings';
import { CustomMessages } from '../components/guild-settings/CustomMessages';
import { MediaFilterSettings } from '../components/guild-settings/MediaFilterSettings';
import { BirthdaySettings } from '../components/guild-settings/BirthdaySettings';
import { AuditLogSection } from '../components/guild-settings/AuditLogSection';
import RoleMenus from './RoleMenus';

const SECTIONS = {
  'xp-system': { component: XPSystemSettings, label: 'Sistema XP' },
  'auto-roles': { component: AutoRolesSettings, label: 'Roles Bienvenida' },
  achievements: { component: AchievementsSettings, label: 'Logros' },
  'role-menus': { component: RoleMenus, label: 'Menú AutoRoles' },
  'custom-messages': { component: CustomMessages, label: 'Mensajes' },
  'media-filter': { component: MediaFilterSettings, label: 'Filtro Multimedia' },
  birthdays: { component: BirthdaySettings, label: 'Cumpleaños' },
  leaderboard: { component: LeaderboardSection, label: 'Estadísticas' },
  'audit-log': { component: AuditLogSection, label: 'Historial' }
};

function GuildSettingsContent() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('xp-system');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pendingRoute, setPendingRoute] = useState(null);

  const { guildId, isLoading, error, refetch, hasChanges, isDirty } = useGuildSettings();
  const { data: guilds } = useAvailableGuilds();

  // Volver a la primera sección al cambiar de servidor desde el selector.
  useEffect(() => {
    setActiveSection('xp-system');
  }, [guildId]);

  // Aviso del navegador al cerrar la pestaña con cambios pendientes.
  useEffect(() => {
    if (!isDirty) return;

    const warn = (event) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty]);

  // Cambiar de sección no pierde nada: los borradores viven en el contexto.
  // Salir del panel sí desmonta el proveedor, así que ahí hay que preguntar.
  const requestNavigateAway = (to) => {
    if (isDirty) {
      setPendingRoute(to);
      return;
    }
    navigate(to);
  };

  if (isLoading) {
    return <LoadingSpinner text="Cargando configuración..." />;
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-gray-800/50 backdrop-blur-sm rounded-xl border border-red-500/30 p-6 text-center">
          <div className="bg-red-500/20 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-7 h-7 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-white mb-2">No se pudo cargar el servidor</h1>
          <p className="text-gray-400 text-sm mb-6">{getApiError(error)}</p>
          <button
            onClick={refetch}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors cursor-pointer"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  const section = SECTIONS[activeSection] ?? SECTIONS['xp-system'];
  const Section = section.component;

  return (
    <div className="flex h-full">
      <Sidebar
        activeSection={activeSection}
        setActiveSection={setActiveSection}
        hasChanges={hasChanges}
        guilds={guilds?.manageable ?? []}
        mobileOpen={mobileMenuOpen}
        onCloseMobile={() => setMobileMenuOpen(false)}
        onNavigateAway={requestNavigateAway}
      />

      <div className="flex-1 flex flex-col min-w-0">
        {/* Acceso al menú cuando el sidebar es un cajón (pantallas chicas) */}
        <div className="lg:hidden flex items-center gap-3 px-4 py-3 border-b border-gray-700/50 bg-gray-900/40 backdrop-blur-sm flex-shrink-0">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-gray-300 hover:text-white hover:bg-gray-700/50 rounded-lg transition-colors cursor-pointer"
            aria-label="Abrir el menú de secciones"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="text-white font-medium truncate">{section.label}</span>
          {isDirty && (
            <span
              className="w-2 h-2 bg-yellow-400 rounded-full flex-shrink-0"
              title="Cambios sin guardar"
            />
          )}
        </div>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="max-w-7xl mx-auto">
            <Section />
          </div>
        </main>
      </div>

      <ConfirmDialog
        open={Boolean(pendingRoute)}
        danger
        title="Tenés cambios sin guardar"
        description="Si salís del panel ahora, los cambios que no guardaste se pierden."
        confirmText="Salir sin guardar"
        cancelText="Seguir editando"
        onConfirm={() => {
          const to = pendingRoute;
          setPendingRoute(null);
          navigate(to);
        }}
        onCancel={() => setPendingRoute(null)}
      />
    </div>
  );
}

function GuildSettings() {
  const { guildId } = useParams();

  return (
    <GuildSettingsProvider guildId={guildId}>
      <GuildSettingsContent />
    </GuildSettingsProvider>
  );
}

export default GuildSettings;
