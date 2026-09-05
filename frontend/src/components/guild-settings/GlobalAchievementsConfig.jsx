import { useState } from 'react';
import { Bell, Hash, Save } from 'lucide-react';
import api, { getApiError } from '../../services/api';
import toast from 'react-hot-toast';
import { useGuildSettings } from '../../hooks/useGuildSettings';
import { useDraft } from '../../hooks/useDraft';
import { useGuildInvalidation } from '../../hooks/queries';

const DEFAULT_CONFIG = {
  notificationChannelId: '',
  defaultMessage: '🎉 {mention} ha desbloqueado: **{achievement}** - {tier}!'
};

export function GlobalAchievementsConfig({ guildId, channels }) {
  // `achievementsConfig` viaja dentro de `GET /config`, así que no hace falta
  // una petición aparte a `/config/achievements-global`.
  const { config: guildConfig } = useGuildSettings();
  const { draft: config, setDraft: setConfig, markSaved } = useDraft(
    guildConfig?.achievementsConfig ?? DEFAULT_CONFIG
  );
  const [saving, setSaving] = useState(false);
  const { invalidateConfig } = useGuildInvalidation(guildId);

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.post(`/api/guilds/${guildId}/config/achievements-global`, config);
      markSaved();
      await invalidateConfig();
      toast.success('✅ Configuración global de logros guardada');
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error(getApiError(error, 'Error al guardar configuración'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
      <div className="flex items-center gap-3 mb-6">
        <Bell className="w-6 h-6 text-indigo-400" />
        <div>
          <h3 className="text-xl font-bold text-white">Configuración Global de Notificaciones</h3>
          <p className="text-gray-400 text-sm">
            Configura dónde se enviarán las notificaciones de todos los logros
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Canal global */}
        <div>
          <label className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
            <Hash className="w-4 h-4" />
            Canal de Notificaciones Global
          </label>
          <select
            value={config.notificationChannelId || ''}
            onChange={(e) => setConfig({ ...config, notificationChannelId: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2"
          >
            <option value="">No enviar notificaciones (deshabilitado)</option>
            {channels.map(channel => (
              <option key={channel.id} value={channel.id}>
                # {channel.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-gray-400 mt-2">
            Todas las notificaciones de logros se enviarán a este canal. 
            Los logros individuales pueden sobreescribir esto si es necesario.
          </p>
        </div>

        {/* Mensaje predeterminado */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Mensaje Predeterminado
          </label>
          <textarea
            value={config.defaultMessage}
            onChange={(e) => setConfig({ ...config, defaultMessage: e.target.value })}
            className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2"
            rows={3}
            placeholder="🎉 {mention} ha desbloqueado: **{achievement}** - {tier}!"
            maxLength={500}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            {[
              { key: '{mention}', desc: 'Menciona al usuario' },
              { key: '{username}', desc: 'Nombre del usuario' },
              { key: '{achievement}', desc: 'Nombre del logro' },
              { key: '{tier}', desc: 'Tier desbloqueado (con emoji)' },
              { key: '{tierTitle}', desc: 'Solo título del tier' },
              { key: '{emoji}', desc: 'Solo emoji del tier' },
              { key: '{icon}', desc: 'Icono del logro' }
            ].map(tag => (
              <span key={tag.key} className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded border border-gray-600">
                <span className="font-mono text-indigo-400">{tag.key}</span> - {tag.desc}
              </span>
            ))}
          </div>
        </div>

        {/* Botón guardar */}
        <div className="flex justify-end pt-4 border-t border-gray-700">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Guardando...' : 'Guardar Configuración'}
          </button>
        </div>
      </div>
    </div>
  );
}