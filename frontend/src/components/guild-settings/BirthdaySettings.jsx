// frontend/src/components/guild-settings/BirthdaySettings.jsx
import { useState, useEffect } from 'react';
import { Cake, Save, RotateCcw, AlertCircle } from 'lucide-react';
import { SectionCard } from '../ui/SectionCard';
import { SaveButton } from '../ui/SaveButton';
import { UnsavedChangesAlert } from '../ui/UnsavedChangesAlert';
import { InfoAlert } from '../ui/InfoAlert';
import toast from 'react-hot-toast';
import api from '../../services/api';

export function BirthdaySettings({ guildId, config, channels, roles }) {
  const [settings, setSettings] = useState({
    enabled: false,
    channelId: null,
    message: '🎂 ¡Feliz cumpleaños {mention}! 🎉 ¡Que tengas un día increíble!',
    mentionRole: null,
    embedEnabled: true,
    embedColor: '#FF69B4'
  });

  const [originalSettings, setOriginalSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, [guildId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/guilds/${guildId}/config/birthdays`);
      const birthdayConfig = response.data.birthdays || settings;
      setSettings(birthdayConfig);
      setOriginalSettings(birthdayConfig);
    } catch (error) {
      console.error('Error loading birthday settings:', error);
      toast.error('Error al cargar configuración de cumpleaños');
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  const handleSave = async () => {
    setSaving(true);
    try {
      const response = await api.post(`/api/guilds/${guildId}/config/birthdays`, settings);
      setSettings(response.data.birthdays);
      setOriginalSettings(response.data.birthdays);
      toast.success('Configuración de cumpleaños guardada');
    } catch (error) {
      console.error('Error saving birthday settings:', error);
      toast.error('Error al guardar configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('¿Estás seguro de resetear la configuración de cumpleaños?')) return;
    
    setSaving(true);
    try {
      const response = await api.delete(`/api/guilds/${guildId}/config/birthdays`);
      setSettings(response.data.birthdays);
      setOriginalSettings(response.data.birthdays);
      toast.success('Configuración reseteada');
    } catch (error) {
      console.error('Error resetting birthday settings:', error);
      toast.error('Error al resetear configuración');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
              <Cake className="w-8 h-8 text-pink-400" />
              <span>Cumpleaños</span>
            </h2>
            <p className="text-gray-400 mt-1">
              Celebra automáticamente los cumpleaños de los miembros
            </p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-pink-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      <UnsavedChangesAlert show={hasChanges} />

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
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
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
            <select
              value={settings.channelId || ''}
              onChange={(e) => setSettings({ ...settings, channelId: e.target.value || null })}
              disabled={!settings.enabled}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Selecciona un canal</option>
              {channels.map((ch) => (
                <option key={ch.id} value={ch.id}>
                  #{ch.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Canal donde se enviarán los mensajes de cumpleaños
            </p>
          </div>

          {/* Mensaje Personalizado */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Mensaje de cumpleaños
            </label>
            <textarea
              value={settings.message}
              onChange={(e) => setSettings({ ...settings, message: e.target.value })}
              disabled={!settings.enabled}
              rows={3}
              maxLength={1000}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed resize-none"
              placeholder="🎂 ¡Feliz cumpleaños {mention}! 🎉"
            />
            <div className="flex justify-between items-center mt-1">
              <p className="text-xs text-gray-400">
                Placeholders: {'{mention}'}, {'{username}'}, {'{server}'}
              </p>
              <p className="text-xs text-gray-500">
                {settings.message.length}/1000
              </p>
            </div>
          </div>

          {/* Rol a Mencionar */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Mencionar rol (opcional)
            </label>
            <select
              value={settings.mentionRole || ''}
              onChange={(e) => setSettings({ ...settings, mentionRole: e.target.value || null })}
              disabled={!settings.enabled}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="">Sin mención</option>
              <option value="@everyone">@everyone</option>
              <option value="@here">@here</option>
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  @{role.name}
                </option>
              ))}
            </select>
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
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
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
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Color del embed
              </label>
              <div className="flex items-center space-x-3">
                <input
                  type="color"
                  value={settings.embedColor}
                  onChange={(e) => setSettings({ ...settings, embedColor: e.target.value })}
                  disabled={!settings.enabled}
                  className="w-16 h-10 rounded cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                />
                <input
                  type="text"
                  value={settings.embedColor}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (/^#[0-9A-Fa-f]{0,6}$/.test(value)) {
                      setSettings({ ...settings, embedColor: value });
                    }
                  }}
                  disabled={!settings.enabled}
                  maxLength={7}
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white font-mono disabled:opacity-50 disabled:cursor-not-allowed"
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

      {/* Botones de Acción */}
      <div className="flex items-center justify-between pt-4">
        <button
          onClick={handleReset}
          disabled={saving}
          className="px-6 py-3 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
        >
          <RotateCcw className="w-5 h-5" />
          <span>Resetear</span>
        </button>

        <SaveButton
          onClick={handleSave}
          saving={saving}
          hasChanges={hasChanges}
        />
      </div>

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