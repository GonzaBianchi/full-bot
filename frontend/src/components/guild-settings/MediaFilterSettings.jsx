// frontend/src/components/guild-settings/MediaFilterSettings.jsx
import { useState, useEffect } from 'react';
import { Film, Hash, MessageSquare, Image, Video, FileImage, Link, AlertCircle } from 'lucide-react';
import { SectionCard } from '../ui/SectionCard';
import { StickyActionBar } from '../ui/StickyActionBar';
import { StyledSelect } from '../ui/StyledSelect';
import { InfoAlert } from '../ui/InfoAlert';
import toast from 'react-hot-toast';
import api from '../../services/api';

// ========== Configuración por defecto ==========
const DEFAULT_SETTINGS = {
  enabled: false,
  sourceChannels: [],
  targetChannelId: null,
  types: {
    images: true,
    videos: true,
    gifs: true
  },
  includeEmbeds: false,
  customMessage: '📎 **{author}** compartió multimedia desde #{channel}'
};

export function MediaFilterSettings({ guildId, config, channels, roles }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [originalSettings, setOriginalSettings] = useState(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, [guildId]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/guilds/${guildId}/config/media-filter`);
      
      const mediaFilterConfig = response.data?.mediaFilter || DEFAULT_SETTINGS;
      
      const validatedConfig = {
        enabled: mediaFilterConfig.enabled ?? DEFAULT_SETTINGS.enabled,
        sourceChannels: mediaFilterConfig.sourceChannels || DEFAULT_SETTINGS.sourceChannels,
        targetChannelId: mediaFilterConfig.targetChannelId ?? DEFAULT_SETTINGS.targetChannelId,
        types: mediaFilterConfig.types || DEFAULT_SETTINGS.types,
        includeEmbeds: mediaFilterConfig.includeEmbeds ?? DEFAULT_SETTINGS.includeEmbeds,
        customMessage: mediaFilterConfig.customMessage || DEFAULT_SETTINGS.customMessage
      };
      
      setSettings(validatedConfig);
      setOriginalSettings(validatedConfig);
    } catch (error) {
      console.error('Error loading media filter settings:', error);
      toast.error('Error al cargar configuración del filtro multimedia');
      setSettings(DEFAULT_SETTINGS);
      setOriginalSettings(DEFAULT_SETTINGS);
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(originalSettings);

  const handleSave = async () => {
    if (settings.enabled && settings.sourceChannels.length === 0) {
      toast.error('Debes seleccionar al menos un canal de origen');
      return;
    }

    if (settings.enabled && !settings.targetChannelId) {
      toast.error('Debes seleccionar un canal destino');
      return;
    }

    setSaving(true);
    try {
      const response = await api.post(`/api/guilds/${guildId}/config/media-filter`, settings);
      
      if (response.data && response.data.mediaFilter) {
        const updatedConfig = {
          enabled: response.data.mediaFilter.enabled ?? settings.enabled,
          sourceChannels: response.data.mediaFilter.sourceChannels || settings.sourceChannels,
          targetChannelId: response.data.mediaFilter.targetChannelId ?? settings.targetChannelId,
          types: response.data.mediaFilter.types || settings.types,
          includeEmbeds: response.data.mediaFilter.includeEmbeds ?? settings.includeEmbeds,
          customMessage: response.data.mediaFilter.customMessage || settings.customMessage
        };
        
        setSettings(updatedConfig);
        setOriginalSettings(updatedConfig);
        toast.success('✅ Configuración del filtro multimedia guardada');
      } else {
        setOriginalSettings(settings);
        toast.success('✅ Configuración guardada');
      }
    } catch (error) {
      console.error('Error saving media filter settings:', error);
      const errorMsg = error.response?.data?.error || 'Error al guardar configuración';
      toast.error(errorMsg);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('¿Estás seguro de resetear la configuración del filtro multimedia?')) return;
    
    setSaving(true);
    try {
      const response = await api.delete(`/api/guilds/${guildId}/config/media-filter`);
      
      if (response.data && response.data.mediaFilter) {
        const resetConfig = {
          enabled: response.data.mediaFilter.enabled ?? DEFAULT_SETTINGS.enabled,
          sourceChannels: response.data.mediaFilter.sourceChannels || DEFAULT_SETTINGS.sourceChannels,
          targetChannelId: response.data.mediaFilter.targetChannelId ?? DEFAULT_SETTINGS.targetChannelId,
          types: response.data.mediaFilter.types || DEFAULT_SETTINGS.types,
          includeEmbeds: response.data.mediaFilter.includeEmbeds ?? DEFAULT_SETTINGS.includeEmbeds,
          customMessage: response.data.mediaFilter.customMessage || DEFAULT_SETTINGS.customMessage
        };
        
        setSettings(resetConfig);
        setOriginalSettings(resetConfig);
      } else {
        setSettings(DEFAULT_SETTINGS);
        setOriginalSettings(DEFAULT_SETTINGS);
      }
      
      toast.success('✅ Configuración reseteada');
    } catch (error) {
      console.error('Error resetting media filter settings:', error);
      toast.error('Error al resetear configuración');
    } finally {
      setSaving(false);
    }
  };

  const handleSourceChannelToggle = (channelId) => {
    setSettings(prev => ({
      ...prev,
      sourceChannels: prev.sourceChannels.includes(channelId)
        ? prev.sourceChannels.filter(id => id !== channelId)
        : [...prev.sourceChannels, channelId]
    }));
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
              <Film className="w-8 h-8 text-purple-400" />
              <span>Filtro de Multimedia</span>
            </h2>
            <p className="text-gray-400 mt-1">
              Captura y reenvía automáticamente contenido multimedia
            </p>
          </div>
        </div>
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500 mx-auto"></div>
          <p className="text-gray-400 mt-4">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  // Preparar opciones para los selects
  const channelOptions = channels.map(ch => ({ id: ch.id, name: `# ${ch.name}` }));

  const placeholders = [
    { key: '{author}', description: 'Nombre del usuario' },
    { key: '{mention}', description: 'Mención del usuario' },
    { key: '{channel}', description: 'Nombre del canal de origen' }
  ];

  return (
    <div className="space-y-6">
      {/* Sticky Action Bar */}
      <StickyActionBar
        hasChanges={hasChanges}
        saving={saving}
        onSave={handleSave}
        onReset={handleReset}
        saveText="Guardar Configuración"
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center space-x-3">
            <Film className="w-8 h-8 text-purple-400" />
            <span>Filtro de Multimedia</span>
          </h2>
          <p className="text-gray-400 mt-1">
            El bot capturará y reenviará automáticamente contenido multimedia
          </p>
        </div>
      </div>

      {/* Información */}
      <InfoAlert
        title="¿Cómo funciona?"
        variant="blue"
        items={[
          'El bot monitoreará los canales de origen seleccionados',
          'Cuando detecte multimedia (imágenes, videos, GIFs), la reenviará automáticamente',
          'Se incluirá un enlace al mensaje original y el autor',
          'El contenido de texto del mensaje original también se incluirá si existe',
          'Los embeds de links externos (YouTube, Tenor) solo se incluyen si activas esa opción'
        ]}
      />

      {/* Estado del Filtro */}
      <SectionCard
        icon={Film}
        iconBgColor="bg-purple-500/20"
        iconColor="text-purple-400"
        title="Estado del Filtro"
        description="Activa o desactiva el filtro de multimedia"
      >
        <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
          <div>
            <p className="text-white font-medium">Habilitar filtro multimedia</p>
            <p className="text-sm text-gray-400">
              Activar captura automática de contenido multimedia
            </p>
          </div>
          <button
            onClick={() => setSettings({ ...settings, enabled: !settings.enabled })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
              settings.enabled ? 'bg-purple-500' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                settings.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>
      </SectionCard>

      {settings.enabled && (
        <>
          {/* Canales de Origen */}
          <SectionCard
            icon={Hash}
            iconBgColor="bg-blue-500/20"
            iconColor="text-blue-400"
            title="Canales de Origen"
            description="Selecciona los canales donde el bot capturará multimedia"
          >
            <div className="space-y-3">
              {channels.length === 0 ? (
                <div className="text-gray-400 text-sm p-4 bg-gray-700/30 rounded-lg text-center">
                  No hay canales disponibles
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto p-1">
                    {channels.map((channel) => (
                      <label
                        key={channel.id}
                        className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={settings.sourceChannels.includes(channel.id)}
                          onChange={() => handleSourceChannelToggle(channel.id)}
                          className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        />
                        <Hash className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="text-white text-sm truncate">{channel.name}</span>
                      </label>
                    ))}
                  </div>
                  
                  {settings.sourceChannels.length > 0 && (
                    <div className="mt-2 p-3 bg-indigo-500/10 border border-indigo-500/30 rounded-lg">
                      <p className="text-sm text-indigo-400">
                        ✓ {settings.sourceChannels.length} canal{settings.sourceChannels.length !== 1 ? 'es' : ''} seleccionado{settings.sourceChannels.length !== 1 ? 's' : ''}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </SectionCard>

          {/* Canal Destino */}
          <SectionCard
            icon={MessageSquare}
            iconBgColor="bg-green-500/20"
            iconColor="text-green-400"
            title="Canal Destino"
            description="Donde se reenviará la multimedia capturada"
          >
            <div>
              <StyledSelect
                value={settings.targetChannelId || ''}
                onChange={(val) => setSettings({ ...settings, targetChannelId: val || null })}
                options={channelOptions}
                placeholder="Selecciona un canal destino"
                icon={Hash}
              />
              <p className="text-xs text-gray-400 mt-2">
                Canal donde se reenviará el contenido multimedia capturado
              </p>
            </div>
          </SectionCard>

          {/* Tipos de Multimedia */}
          <SectionCard
            icon={Image}
            iconBgColor="bg-pink-500/20"
            iconColor="text-pink-400"
            title="Tipos de Multimedia"
            description="Selecciona qué tipos de contenido capturar"
          >
            <div className="space-y-3">
              {/* Imágenes */}
              <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <FileImage className="w-5 h-5 text-pink-400" />
                  <div>
                    <p className="text-white font-medium">Imágenes</p>
                    <p className="text-sm text-gray-400">JPG, PNG, WEBP, etc.</p>
                  </div>
                </div>
                <button
                  onClick={() => setSettings(prev => ({
                    ...prev,
                    types: { ...prev.types, images: !prev.types.images }
                  }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    settings.types.images ? 'bg-pink-500' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.types.images ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Videos */}
              <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Video className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-white font-medium">Videos</p>
                    <p className="text-sm text-gray-400">MP4, MOV, WEBM, etc.</p>
                  </div>
                </div>
                <button
                  onClick={() => setSettings(prev => ({
                    ...prev,
                    types: { ...prev.types, videos: !prev.types.videos }
                  }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    settings.types.videos ? 'bg-purple-500' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.types.videos ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* GIFs */}
              <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Film className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-white font-medium">GIFs</p>
                    <p className="text-sm text-gray-400">GIFs animados</p>
                  </div>
                </div>
                <button
                  onClick={() => setSettings(prev => ({
                    ...prev,
                    types: { ...prev.types, gifs: !prev.types.gifs }
                  }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    settings.types.gifs ? 'bg-blue-500' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.types.gifs ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Incluir Embeds */}
              <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                <div className="flex items-center space-x-3">
                  <Link className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="text-white font-medium">Incluir Embeds</p>
                    <p className="text-sm text-gray-400">Links de YouTube, Tenor, etc.</p>
                  </div>
                </div>
                <button
                  onClick={() => setSettings({ ...settings, includeEmbeds: !settings.includeEmbeds })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors cursor-pointer ${
                    settings.includeEmbeds ? 'bg-yellow-500' : 'bg-gray-600'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.includeEmbeds ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </SectionCard>

          {/* Mensaje Personalizado */}
          <SectionCard
            icon={MessageSquare}
            iconBgColor="bg-indigo-500/20"
            iconColor="text-indigo-400"
            title="Mensaje Personalizado"
            description="Personaliza el mensaje que acompañará la multimedia reenviada"
          >
            <div className="space-y-4">
              <div>
                <label htmlFor="custom-message" className="block text-sm font-medium text-gray-300 mb-2">
                  Mensaje personalizado
                </label>
                <textarea
                  id="custom-message"
                  value={settings.customMessage}
                  onChange={(e) => setSettings({ ...settings, customMessage: e.target.value })}
                  rows={3}
                  maxLength={500}
                  className="w-full bg-gray-700/50 border-2 border-gray-600 rounded-lg px-4 py-3 text-white resize-none focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/50 transition-all"
                  placeholder="📎 **{author}** compartió multimedia desde #{channel}"
                />
                <div className="flex justify-between items-center mt-2">
                  <p className="text-xs text-gray-400">
                    Variables: {placeholders.map(p => p.key).join(', ')}
                  </p>
                  <div className="flex items-center space-x-3">
                    <p className="text-xs text-gray-500">
                      {settings.customMessage?.length || 0}/500
                    </p>
                    <button
                      onClick={() => setSettings({ ...settings, customMessage: DEFAULT_SETTINGS.customMessage })}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Restaurar
                    </button>
                  </div>
                </div>
              </div>

              {/* Placeholders disponibles */}
              <div className="bg-gray-700/30 rounded-lg p-4">
                <p className="text-white font-medium mb-2 text-sm">Variables disponibles:</p>
                <div className="space-y-1">
                  {placeholders.map((ph) => (
                    <div key={ph.key} className="flex items-center justify-between text-sm">
                      <code className="text-indigo-400 bg-gray-800/50 px-2 py-1 rounded font-mono">
                        {ph.key}
                      </code>
                      <span className="text-gray-400">{ph.description}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Vista previa */}
              <div className="bg-gray-700/30 rounded-lg p-4">
                <p className="text-white font-medium mb-2 text-sm">Vista previa:</p>
                <div className="bg-gray-800/50 rounded-lg p-3 text-sm text-gray-300">
                  {settings.customMessage
                    .replace(/\{author\}/g, 'NombreUsuario')
                    .replace(/\{mention\}/g, '@NombreUsuario')
                    .replace(/\{channel\}/g, 'canal-ejemplo')}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Advertencias */}
          {settings.sourceChannels.length === 0 && (
            <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-yellow-300 font-medium">Canales de origen no configurados</p>
                <p className="text-yellow-400/80 text-sm mt-1">
                  Selecciona al menos un canal de origen para que el bot pueda capturar multimedia
                </p>
              </div>
            </div>
          )}

          {!settings.targetChannelId && (
            <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <p className="text-yellow-300 font-medium">Canal destino no configurado</p>
                <p className="text-yellow-400/80 text-sm mt-1">
                  Selecciona un canal destino para que el bot pueda reenviar la multimedia capturada
                </p>
              </div>
            </div>
          )}
        </>
      )}

      {!settings.enabled && (
        <InfoAlert
          title="El filtro está desactivado"
          variant="yellow"
          items={[
            'Activa el filtro para comenzar a capturar multimedia',
            'Recuerda configurar los canales de origen y destino',
            'Puedes personalizar el mensaje y seleccionar qué tipos de contenido capturar'
          ]}
        />
      )}
    </div>
  );
}