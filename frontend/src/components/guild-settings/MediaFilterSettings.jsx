// frontend/src/components/guild-settings/MediaFilterSettings.jsx
import { useState } from 'react';
import { Film, Hash, MessageSquare, Image, Video, FileImage, Link, RotateCcw } from 'lucide-react';
import { SectionCard } from '../ui/SectionCard';
import { SaveButton } from '../ui/SaveButton';
import { UnsavedChangesAlert } from '../ui/UnsavedChangesAlert';
import { InfoAlert } from '../ui/InfoAlert';
import { useMediaFilter } from '../../hooks/useMediaFilter';

export function MediaFilterSettings({ guildId, config, channels, roles }) {
  const {
    enabled, setEnabled,
    sourceChannels, setSourceChannels,
    targetChannelId, setTargetChannelId,
    types, setTypes,
    includeEmbeds, setIncludeEmbeds,
    customMessage, setCustomMessage,
    hasChanges,
    saving,
    handleSave,
    handleReset
  } = useMediaFilter(guildId, config);

  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleSourceChannelToggle = (channelId) => {
    setSourceChannels(prev => 
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  const placeholders = [
    { key: '{author}', description: 'Nombre del usuario' },
    { key: '{mention}', description: 'Mención del usuario' },
    { key: '{channel}', description: 'Nombre del canal de origen' }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Filtro de Multimedia</h1>
        <p className="text-gray-400">
          Captura y reenvía automáticamente imágenes, videos y GIFs desde canales específicos
        </p>
      </div>

      <UnsavedChangesAlert show={hasChanges} />

      {/* Estado del filtro */}
      <SectionCard
        icon={Film}
        iconBgColor="bg-purple-500/20"
        iconColor="text-purple-400"
        title="Estado del Filtro"
        description="Activa o desactiva el filtro de multimedia"
      >
        <label className="flex items-center space-x-3 cursor-pointer">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-white font-medium">
            {enabled ? 'Filtro Activado' : 'Filtro Desactivado'}
          </span>
        </label>
      </SectionCard>

      {enabled && (
        <>
          {/* Canales de origen */}
          <SectionCard
            icon={Hash}
            iconBgColor="bg-blue-500/20"
            iconColor="text-blue-400"
            title="Canales de Origen"
            description="Selecciona los canales donde el bot capturará multimedia"
          >
            <div className="space-y-3">
              {channels.length === 0 ? (
                <div className="text-gray-400 text-sm">No hay canales disponibles</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-64 overflow-y-auto">
                  {channels.map((channel) => (
                    <label
                      key={channel.id}
                      className="flex items-center space-x-3 p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={sourceChannels.includes(channel.id)}
                        onChange={() => handleSourceChannelToggle(channel.id)}
                        className="w-4 h-4 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                      />
                      <Hash className="w-4 h-4 text-gray-400 flex-shrink-0" />
                      <span className="text-white text-sm truncate">{channel.name}</span>
                    </label>
                  ))}
                </div>
              )}
              
              {sourceChannels.length > 0 && (
                <div className="mt-2 text-sm text-indigo-400">
                  ✓ {sourceChannels.length} canal{sourceChannels.length !== 1 ? 'es' : ''} seleccionado{sourceChannels.length !== 1 ? 's' : ''}
                </div>
              )}
            </div>
          </SectionCard>

          {/* Canal destino */}
          <SectionCard
            icon={MessageSquare}
            iconBgColor="bg-green-500/20"
            iconColor="text-green-400"
            title="Canal Destino"
            description="Donde se reenviará la multimedia capturada"
          >
            <select
              value={targetChannelId || ''}
              onChange={(e) => setTargetChannelId(e.target.value || null)}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Seleccionar canal destino</option>
              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  # {channel.name}
                </option>
              ))}
            </select>
          </SectionCard>

          {/* Tipos de multimedia */}
          <SectionCard
            icon={Image}
            iconBgColor="bg-pink-500/20"
            iconColor="text-pink-400"
            title="Tipos de Multimedia"
            description="Selecciona qué tipos de contenido capturar"
          >
            <div className="space-y-3">
              <label className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 cursor-pointer transition-colors">
                <div className="flex items-center space-x-3">
                  <FileImage className="w-5 h-5 text-pink-400" />
                  <div>
                    <p className="text-white font-medium">Imágenes</p>
                    <p className="text-gray-400 text-sm">JPG, PNG, WEBP, etc.</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={types.images}
                  onChange={(e) => setTypes(prev => ({ ...prev, images: e.target.checked }))}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 cursor-pointer transition-colors">
                <div className="flex items-center space-x-3">
                  <Video className="w-5 h-5 text-purple-400" />
                  <div>
                    <p className="text-white font-medium">Videos</p>
                    <p className="text-gray-400 text-sm">MP4, MOV, WEBM, etc.</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={types.videos}
                  onChange={(e) => setTypes(prev => ({ ...prev, videos: e.target.checked }))}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 cursor-pointer transition-colors">
                <div className="flex items-center space-x-3">
                  <Film className="w-5 h-5 text-blue-400" />
                  <div>
                    <p className="text-white font-medium">GIFs</p>
                    <p className="text-gray-400 text-sm">GIFs animados</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={types.gifs}
                  onChange={(e) => setTypes(prev => ({ ...prev, gifs: e.target.checked }))}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                />
              </label>

              <label className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg hover:bg-gray-700/50 cursor-pointer transition-colors">
                <div className="flex items-center space-x-3">
                  <Link className="w-5 h-5 text-yellow-400" />
                  <div>
                    <p className="text-white font-medium">Incluir Embeds</p>
                    <p className="text-gray-400 text-sm">Links de YouTube, Tenor, etc.</p>
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={includeEmbeds}
                  onChange={(e) => setIncludeEmbeds(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-600 bg-gray-700 text-indigo-600 focus:ring-2 focus:ring-indigo-500"
                />
              </label>
            </div>
          </SectionCard>

          {/* Mensaje personalizado */}
          <SectionCard
            icon={MessageSquare}
            iconBgColor="bg-indigo-500/20"
            iconColor="text-indigo-400"
            title="Mensaje Personalizado"
            description="Personaliza el mensaje que acompañará la multimedia reenviada"
          >
            <div className="space-y-4">
              <div>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="📎 **{author}** compartió multimedia desde #{channel}"
                  rows={3}
                  maxLength={500}
                  className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-sm text-gray-400">
                    {customMessage.length}/500 caracteres
                  </span>
                  <button
                    onClick={() => setCustomMessage('📎 **{author}** compartió multimedia desde #{channel}')}
                    className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    Restaurar predeterminado
                  </button>
                </div>
              </div>

              {/* Placeholders disponibles */}
              <div className="bg-gray-700/30 rounded-lg p-4">
                <p className="text-white font-medium mb-2 text-sm">Variables disponibles:</p>
                <div className="space-y-1">
                  {placeholders.map((ph) => (
                    <div key={ph.key} className="flex items-center justify-between text-sm">
                      <code className="text-indigo-400 bg-gray-800/50 px-2 py-1 rounded">
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
                <div className="bg-gray-800/50 rounded p-3 text-sm text-gray-300">
                  {customMessage
                    .replace(/\{author\}/g, 'NombreUsuario')
                    .replace(/\{mention\}/g, '@NombreUsuario')
                    .replace(/\{channel\}/g, 'canal-ejemplo')}
                </div>
              </div>
            </div>
          </SectionCard>

          {/* Información */}
          <InfoAlert
            title="Cómo funciona el filtro de multimedia"
            variant="blue"
            items={[
              'El bot monitoreará los canales de origen seleccionados',
              'Cuando detecte multimedia (imágenes, videos, GIFs), la reenviará automáticamente',
              'Se incluirá un enlace al mensaje original y el autor (sin mención)',
              'El contenido de texto del mensaje original también se incluirá si existe',
              'Los embeds de links externos (YouTube, Tenor) solo se incluyen si activas esa opción'
            ]}
          />

          {/* Botones de acción */}
          <div className="flex items-center justify-between">
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              <RotateCcw className="w-5 h-5" />
              <span>Resetear Configuración</span>
            </button>

            <SaveButton
              onClick={handleSave}
              saving={saving}
              hasChanges={hasChanges}
            />
          </div>
        </>
      )}

      {!enabled && (
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