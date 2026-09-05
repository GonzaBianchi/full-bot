// frontend/src/components/guild-settings/BirthdaySettings.jsx
import { useState } from 'react';
import { Cake, AlertCircle, Hash, Users } from 'lucide-react';
import { StickyActionBar } from '../ui/StickyActionBar';
import { StyledSelect } from '../ui/StyledSelect';
import { SectionCard } from '../ui/SectionCard';
import { InfoAlert } from '../ui/InfoAlert';
import { ConfirmDialog } from '../ui/ConfirmDialog';
import toast from 'react-hot-toast';
import { birthdayService, getApiError } from '../../services/api';
import { useGuildSettings } from '../../hooks/useGuildSettings';
import { useGuildInvalidation } from '../../hooks/queries';

// ========== Configuración por defecto ==========
const DEFAULT_SETTINGS = {
  enabled: false,
  channelId: null,
  message: '🎂 ¡Feliz cumpleaños {mention}! 🎉 ¡Que tengas un día increíble!',
  mentionRole: null,
  embedEnabled: true,
  embedColor: '#FF69B4'
};

export function BirthdaySettings() {
  // El bloque `birthdays` ya viene en `GET /config`: este componente pedía la
  // misma información otra vez en cada montaje de la pestaña.
  const {
    guildId,
    channels,
    roles,
    birthdays: { draft: settings, setDraft: setSettings, hasChanges, markSaved, discard }
  } = useGuildSettings();

  const [saving, setSaving] = useState(false);
  const [confirmingReset, setConfirmingReset] = useState(false);
  const { invalidateConfig } = useGuildInvalidation(guildId);

  const handleSave = async () => {
    if (settings.enabled && !settings.channelId) {
      toast.error('Debes seleccionar un canal de cumpleaños');
      return;
    }

    setSaving(true);
    try {
      const { data } = await birthdayService.update(guildId, settings);
      markSaved(data?.birthdays ?? settings);
      await invalidateConfig();
      toast.success('✅ Configuración de cumpleaños guardada');
    } catch (error) {
      console.error('Error saving birthday settings:', error);
      toast.error(getApiError(error, 'Error al guardar configuración'));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setConfirmingReset(false);
    setSaving(true);
    try {
      const { data } = await birthdayService.reset(guildId);
      markSaved(data?.birthdays ?? DEFAULT_SETTINGS);
      await invalidateConfig();
      toast.success('✅ Configuración reseteada');
    } catch (error) {
      console.error('Error resetting birthday settings:', error);
      toast.error(getApiError(error, 'Error al resetear configuración'));
    } finally {
      setSaving(false);
    }
  };

  // Preparar opciones para los selects
  const channelOptions = channels.map(ch => ({ id: ch.id, name: `# ${ch.name}` }));
  const roleOptions = [
    { id: '', name: 'Sin mención' },
    { id: '@everyone', name: '@everyone' },
    { id: '@here', name: '@here' },
    ...roles.map(r => ({ id: r.id, name: `@${r.name}` }))
  ];

  return (
    <div className="space-y-6">
      {/* Sticky Action Bar */}
      <StickyActionBar
        hasChanges={hasChanges}
        saving={saving}
        onSave={handleSave}
        onReset={() => setConfirmingReset(true)}
        onDiscard={discard}
        resetText="Valores por defecto"
        saveText="Guardar Configuración"
      />

      <ConfirmDialog
        open={confirmingReset}
        danger
        title="Restablecer los cumpleaños"
        description="Se borra la configuración guardada y vuelve a los valores por defecto. Esta acción no se puede deshacer."
        confirmText="Restablecer"
        onConfirm={handleReset}
        onCancel={() => setConfirmingReset(false)}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
            <Cake className="w-8 h-8 text-pink-400" />
            <span>Cumpleaños</span>
          </h2>
          <p className="text-gray-400 mt-1">
            El bot felicitará automáticamente a los usuarios en su cumpleaños
          </p>
        </div>
      </div>

      {/* Información */}
      <InfoAlert
        title="¿Cómo funciona?"
        variant="blue"
        items={[
          'Los usuarios configuran su cumpleaños con /cumpleanos set',
          'El bot verifica cada hora si es medianoche en el timezone del usuario',
          'Si encuentra un cumpleaños, envía un mensaje al canal configurado',
          'Los cumpleaños se celebran una vez al día automáticamente'
        ]}
      />

      {/* Configuración General */}
      <SectionCard
        icon={Cake}
        iconBgColor="bg-pink-500/20"
        iconColor="text-pink-400"
        title="Configuración General"
        description="Habilita y configura las notificaciones de cumpleaños"
      >
        <div className="space-y-4">
          {/* Toggle Enable */}
          <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
            <div>
              <p className="text-white font-medium">Habilitar cumpleaños</p>
              <p className="text-sm text-gray-400">
                Activar mensajes automáticos de cumpleaños
              </p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                settings.enabled ? 'bg-pink-500' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Canal de Cumpleaños */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Canal de cumpleaños
            </label>
            <StyledSelect
              value={settings.channelId || ''}
              onChange={(val) => setSettings({ ...settings, channelId: val || null })}
              options={channelOptions}
              placeholder="Selecciona un canal"
              icon={Hash}
              disabled={!settings.enabled}
            />
            <p className="text-xs text-gray-400 mt-1">
              Canal donde se enviarán los mensajes de cumpleaños
            </p>
          </div>

          {/* Mensaje Personalizado */}
          <div>
            <label htmlFor="birthday-message" className="block text-sm font-medium text-gray-300 mb-2">
              Mensaje de cumpleaños
            </label>
            <textarea
              id="birthday-message"
              value={settings.message}
              onChange={(e) => setSettings({ ...settings, message: e.target.value })}
              disabled={!settings.enabled}
              rows={3}
              maxLength={1000}
              className="w-full bg-gray-700/50 border-2 border-gray-600 rounded-lg px-4 py-3 text-white disabled:opacity-50 disabled:cursor-not-allowed resize-none focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all"
              placeholder="🎂 ¡Feliz cumpleaños {mention}! 🎉"
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-gray-400">
                Placeholders: {'{mention}'}, {'{username}'}, {'{server}'}
              </p>
              <p className="text-xs text-gray-500">
                {settings.message?.length || 0}/1000
              </p>
            </div>
          </div>

          {/* Rol a Mencionar */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Mencionar rol (opcional)
            </label>
            <StyledSelect
              value={settings.mentionRole || ''}
              onChange={(val) => setSettings({ ...settings, mentionRole: val || null })}
              options={roleOptions}
              placeholder="Sin mención"
              icon={Users}
              disabled={!settings.enabled}
            />
            <p className="text-xs text-gray-400 mt-1">
              Rol que será mencionado en el mensaje de cumpleaños
            </p>
          </div>
        </div>
      </SectionCard>

      {/* Personalización Visual */}
      <SectionCard
        icon={Cake}
        iconBgColor="bg-purple-500/20"
        iconColor="text-purple-400"
        title="Personalización Visual"
        description="Personaliza cómo se ven los mensajes de cumpleaños"
      >
        <div className="space-y-4">
          {/* Usar Embed */}
          <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
            <div>
              <p className="text-white font-medium">Usar embed</p>
              <p className="text-sm text-gray-400">
                Mostrar el mensaje en un embed bonito
              </p>
            </div>
            <button
              onClick={() => setSettings({ ...settings, embedEnabled: !settings.embedEnabled })}
              disabled={!settings.enabled}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                settings.embedEnabled ? 'bg-purple-500' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  settings.embedEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Color del Embed */}
          {settings.embedEnabled && (
            <div>
              <label htmlFor="embed-color" className="block text-sm font-medium text-gray-300 mb-2">
                Color del embed
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  id="embed-color-picker"
                  value={settings.embedColor}
                  onChange={(e) => setSettings({ ...settings, embedColor: e.target.value })}
                  disabled={!settings.enabled}
                  className="w-16 h-12 rounded-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-2 border-gray-600 bg-gray-700"
                />
                <input
                  type="text"
                  id="embed-color"
                  value={settings.embedColor}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                      setSettings({ ...settings, embedColor: value });
                    }
                  }}
                  disabled={!settings.enabled}
                  maxLength={7}
                  className="flex-1 bg-gray-700/50 border-2 border-gray-600 rounded-lg px-4 py-3 text-white font-mono disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  placeholder="#FF69B4"
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Color hexadecimal del embed (ej: #FF69B4 para rosa)
              </p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Vista Previa */}
      {settings.enabled && settings.embedEnabled && (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Vista Previa</h3>
          <div className="bg-gray-900/50 rounded-lg p-4 border-l-4" style={{ borderColor: settings.embedColor }}>
            <div className="flex items-start space-x-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-pink-500 to-purple-500"></div>
              <div>
                <p className="text-white font-semibold">Bot</p>
                <p className="text-xs text-gray-400">Hoy a las 00:00</p>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-xl font-bold text-white">🎂 ¡Feliz Cumpleaños! 🎉</p>
              <p className="text-gray-300">
                {settings.message
                  .replace('{mention}', '@Usuario')
                  .replace('{username}', 'Usuario')
                  .replace('{server}', 'Tu Servidor')}
              </p>
              <p className="text-xs text-gray-400 pt-2 border-t border-gray-700">
                ¡Que tengas un día increíble, Usuario!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Advertencia */}
      {settings.enabled && !settings.channelId && (
        <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-yellow-300 font-medium">Canal no configurado</p>
            <p className="text-yellow-400/80 text-sm mt-1">
              Selecciona un canal para que el bot pueda enviar los mensajes de cumpleaños
            </p>
          </div>
        </div>
      )}
    </div>
  );
}