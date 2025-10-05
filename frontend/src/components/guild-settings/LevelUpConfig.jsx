// frontend/src/components/guild-settings/LevelUpConfig.jsx
export function LevelUpConfig({ 
  enabled, 
  setEnabled, 
  channel, 
  setChannel, 
  message, 
  setMessage, 
  channels 
}) {
  const messageTags = [
    { key: '{mention}', desc: 'Menciona al usuario' },
    { key: '{username}', desc: 'Nombre del usuario' },
    { key: '{level}', desc: 'Nuevo nivel' },
    { key: '{oldLevel}', desc: 'Nivel anterior' }
  ];

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
      <div className="space-y-6">
        {/* Enable/Disable */}
        <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border-2 border-gray-600">
          <div>
            <h3 className="text-white font-medium">Habilitar notificaciones</h3>
            <p className="text-gray-400 text-sm">Enviar mensaje cuando alguien sube de nivel</p>
          </div>
          <button
            onClick={() => setEnabled(!enabled)}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
              enabled ? 'bg-indigo-600' : 'bg-gray-600'
            }`}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-lg ${
                enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Channel Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Canal de notificaciones
          </label>
          <div className="relative">
            <select
              value={channel}
              onChange={(e) => setChannel(e.target.value)}
              className="w-full px-4 py-3 bg-gray-700/50 border-2 border-gray-600 rounded-lg text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
            >
              <option value="" className="bg-gray-800">Mismo canal donde escribió</option>
              {channels.map(c => (
                <option key={c.id} value={c.id} className="bg-gray-800">
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
          <p className="text-gray-400 text-xs mt-2">
            Si no se selecciona, el mensaje se enviará en el mismo canal
          </p>
        </div>

        {/* Message Template */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Plantilla de mensaje
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 bg-gray-700/50 border-2 border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all"
            placeholder="🎉 {mention} ha subido al nivel {level}!"
          />
          <div className="mt-3 flex flex-wrap gap-2">
            {messageTags.map(tag => (
              <span key={tag.key} className="text-xs px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg border border-gray-600">
                <span className="font-mono text-indigo-400">{tag.key}</span> - {tag.desc}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}