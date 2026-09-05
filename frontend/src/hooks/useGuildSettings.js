// frontend/src/hooks/useGuildSettings.js
import { createContext, useContext } from 'react';

export const GuildSettingsContext = createContext(null);

/** Estado compartido del panel de un servidor. Ver `GuildSettingsProvider`. */
export function useGuildSettings() {
  const context = useContext(GuildSettingsContext);
  if (!context) {
    throw new Error('useGuildSettings debe usarse dentro de <GuildSettingsProvider>');
  }
  return context;
}
