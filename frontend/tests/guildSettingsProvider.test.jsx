import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { GuildSettingsProvider } from '../src/context/GuildSettingsProvider';
import { useGuildSettings } from '../src/hooks/useGuildSettings';

const CONFIG = {
  guildId: '1',
  xpMultiplier: 1,
  ignoredChannels: [],
  levelUpEnabled: true,
  levelUpChannelId: null,
  levelUpMessage: 'subiste',
  levelRoles: [],
  stackRoles: false,
  autoRoles: { enabled: false, roles: [], restoreLevelRoles: true, welcomeChannelId: null, welcomeMessage: 'hola' },
  mediaFilter: { enabled: false, sourceChannels: [], targetChannelId: null, types: {}, includeEmbeds: false, customMessage: 'media' },
  birthdays: { enabled: false, channelId: null, message: 'feliz', mentionRole: null, embedEnabled: true, embedColor: '#FF69B4' }
};

vi.mock('../src/services/api', () => ({
  guildService: {
    getConfig: vi.fn(() => Promise.resolve({ data: { config: CONFIG } })),
    getResources: vi.fn(() => Promise.resolve({ data: { channels: [], roles: [], emojis: [] } }))
  },
  autoRolesService: { update: vi.fn() },
  leaderboardService: {},
  roleMenuService: {},
  authService: {},
  getApiError: (error, fallback) => fallback,
  loginUrl: () => '/login'
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() }
}));

/** Espía del contexto: edita una sección y muestra el mapa de cambios. */
function Probe() {
  const { general, hasChanges, isDirty } = useGuildSettings();

  return (
    <div>
      <button onClick={() => general.setMultiplier('2')}>subir multiplicador</button>
      <span data-testid="xp-system">{String(hasChanges['xp-system'])}</span>
      <span data-testid="dirty">{String(isDirty)}</span>
    </div>
  );
}

function renderProvider() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } }
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <GuildSettingsProvider guildId="1">
        <Probe />
      </GuildSettingsProvider>
    </QueryClientProvider>
  );
}

describe('GuildSettingsProvider', () => {
  beforeEach(() => vi.clearAllMocks());

  it('marca la sección como modificada cuando se edita', async () => {
    // La regresión que cubre: antes el panel y la sección instanciaban copias
    // distintas de los hooks, así que el indicador del sidebar nunca se encendía.
    const user = userEvent.setup();
    renderProvider();

    await waitFor(() => expect(screen.getByTestId('xp-system')).toHaveTextContent('false'));

    await user.click(screen.getByRole('button', { name: 'subir multiplicador' }));

    expect(screen.getByTestId('xp-system')).toHaveTextContent('true');
    expect(screen.getByTestId('dirty')).toHaveTextContent('true');
  });

  it('pide la configuración y los recursos una sola vez', async () => {
    const { guildService } = await import('../src/services/api');
    renderProvider();

    await waitFor(() => expect(screen.getByTestId('xp-system')).toHaveTextContent('false'));

    expect(guildService.getConfig).toHaveBeenCalledTimes(1);
    expect(guildService.getResources).toHaveBeenCalledTimes(1);
  });
});
