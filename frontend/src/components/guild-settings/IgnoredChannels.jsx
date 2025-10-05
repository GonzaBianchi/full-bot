// frontend/src/components/guild-settings/IgnoredChannels.jsx
import { Hash, Plus, X } from 'lucide-react';
import { SectionCard } from '../ui/SectionCard';

export function IgnoredChannels({ 
  channels, 
  ignoredChannels, 
  selectedChannel, 
  setSelectedChannel,
  onAdd,
  onRemove,
  getChannelName 
}) {
  const availableChannels = channels.filter(c => !ignoredChannels.includes(c.id));

  return (
    <SectionCard
      icon={Hash}
      iconBgColor="bg-purple-500/20"
      iconColor="text-purple-400"
      title="Canales Ignorados"
      description="Los mensajes en estos canales no darán XP"
    >
      {/* Add Channel */}
      <div className="flex items-center space-x-2 mb-4">
        <div className="relative flex-1">
          <select
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="w-full px-4 py-3 bg-gray-700/50 border-2 border-gray-600 rounded-lg text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
          >
            <option value="" className="bg-gray-800">Seleccionar canal...</option>
            {availableChannels.map(c => (
              <option key={c.id} value={c.id} className="bg-gray-800 py-2">
                # {c.name}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        <button
          onClick={onAdd}
          disabled={!selectedChannel}
          className="px-5 py-3 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2 font-medium"
        >
          <Plus className="w-4 h-4" />
          <span>Agregar</span>
        </button>
      </div>

      {/* Channel List */}
      {ignoredChannels.length > 0 ? (
        <div className="space-y-2">
          {ignoredChannels.map(channelId => (
            <div
              key={channelId}
              className="flex items-center justify-between bg-gray-700/50 px-4 py-3 rounded-lg border-2 border-gray-600 hover:border-purple-500/50 transition-all"
            >
              <div className="flex items-center space-x-3">
                <div className="bg-purple-500/20 p-1.5 rounded">
                  <Hash className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-white font-medium">
                  {getChannelName(channelId)}
                </span>
              </div>
              <button
                onClick={() => onRemove(channelId)}
                className="p-2 hover:bg-red-500/20 rounded-lg transition-colors group"
              >
                <X className="w-5 h-5 text-red-400 group-hover:text-red-300" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-8 bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-600">
          <Hash className="w-12 h-12 text-gray-500 mx-auto mb-2" />
          <p className="text-gray-400 font-medium">No hay canales ignorados</p>
          <p className="text-gray-500 text-sm mt-1">Selecciona un canal para empezar</p>
        </div>
      )}
    </SectionCard>
  );
}