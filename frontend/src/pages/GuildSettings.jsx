import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { guildService } from '../services/api';
import { Settings, Hash, Bell, Award, X, Plus, Save, ArrowLeft, TrendingUp, BarChart3 } from 'lucide-react';

function GuildSettings() {
  const { guildId } = useParams();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('general');
  const [config, setConfig] = useState(null);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estado para configuraciones
  const [multiplier, setMultiplier] = useState(1);
  const [ignoredChannels, setIgnoredChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [levelUpMsg, setLevelUpMsg] = useState('');
  const [levelUpEnabled, setLevelUpEnabled] = useState(true);
  const [levelUpChannel, setLevelUpChannel] = useState('');

  useEffect(() => {
    load();
  }, [guildId]);

  const load = async () => {
    setLoading(true);
    try {
      const [cfgRes, resResources] = await Promise.all([
        guildService.getConfig(guildId),
        guildService.getResources(guildId)
      ]);
      
      const cfg = cfgRes.data.config;
      setConfig(cfg);
      setMultiplier(cfg.xpMultiplier || 1);
      setIgnoredChannels(cfg.ignoredChannels || []);
      setLevelUpMsg(cfg.levelUpMessage || '🎉 {mention} ha subido al nivel {level}!');
      setLevelUpEnabled(cfg.levelUpEnabled ?? true);
      setLevelUpChannel(cfg.levelUpChannelId || '');
      setChannels(resResources.data.channels || []);
      setRoles(resResources.data.roles || []);
    } catch (e) {
      console.error('Error cargando config:', e);
    } finally {
      setLoading(false);
    }
  };

  const addIgnoredChannel = () => {
    if (selectedChannel && !ignoredChannels.includes(selectedChannel)) {
      setIgnoredChannels([...ignoredChannels, selectedChannel]);
      setSelectedChannel('');
    }
  };

  const removeIgnoredChannel = (channelId) => {
    setIgnoredChannels(ignoredChannels.filter(id => id !== channelId));
  };

  const saveGeneral = async () => {
    setSaving(true);
    try {
      await guildService.updateMultiplier(guildId, parseFloat(multiplier));
      await guildService.updateIgnoredChannels(guildId, ignoredChannels);
      alert('✅ Configuración general guardada');
    } catch (e) {
      console.error('Error guardando:', e);
      alert('❌ Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const saveLevelUp = async () => {
    setSaving(true);
    try {
      await guildService.updateLevelUp(guildId, {
        enabled: levelUpEnabled,
        channelId: levelUpChannel || null,
        message: levelUpMsg
      });
      alert('✅ Notificaciones guardadas');
    } catch (e) {
      console.error('Error guardando:', e);
      alert('❌ Error al guardar');
    } finally {
      setSaving(false);
    }
  };

  const getChannelName = (channelId) => {
    const channel = channels.find(c => c.id === channelId);
    return channel ? channel.name : channelId;
  };

  const menuItems = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'roles', label: 'Roles de Nivel', icon: Award },
    { id: 'leaderboard', label: 'Leaderboard', icon: BarChart3 }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen bg-gray-800/50 backdrop-blur-sm border-r border-gray-700/50">
          <div className="p-6">
            <button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors mb-8 group"
            >
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
              <span>Volver</span>
            </button>

            <h2 className="text-xl font-bold text-white mb-6">Configuración</h2>

            <nav className="space-y-2">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
                        : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          <div className="max-w-4xl">
            {/* General Settings */}
            {activeSection === 'general' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Configuración General</h1>
                  <p className="text-gray-400">Ajusta el multiplicador de XP y canales ignorados</p>
                </div>

                {/* XP Multiplier */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-indigo-500/20 p-3 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-indigo-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">Multiplicador de XP</h3>
                      <p className="text-gray-400 text-sm mb-4">
                        Ajusta la velocidad de progresión de niveles en tu servidor
                      </p>
                      <div className="flex items-center space-x-4">
                        <select
                          value={multiplier}
                          onChange={(e) => setMultiplier(e.target.value)}
                          className="flex-1 max-w-xs px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          <option value="0.25">0.25x - Muy Lento</option>
                          <option value="0.5">0.5x - Lento</option>
                          <option value="0.75">0.75x - Moderado Bajo</option>
                          <option value="1">1x - Normal</option>
                          <option value="2">2x - Rápido</option>
                          <option value="4">4x - Muy Rápido</option>
                          <option value="6">6x - Ultra Rápido</option>
                          <option value="8">8x - Extremo</option>
                        </select>
                        <button
                          onClick={saveGeneral}
                          disabled={saving}
                          className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
                        >
                          <Save className="w-4 h-4" />
                          <span>{saving ? 'Guardando...' : 'Guardar'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Ignored Channels */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-purple-500/20 p-3 rounded-lg">
                      <Hash className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">Canales Ignorados</h3>
                      <p className="text-gray-400 text-sm mb-4">
                        Los mensajes en estos canales no darán XP
                      </p>

                      {/* Add Channel */}
                      <div className="flex items-center space-x-2 mb-4">
                        <select
                          value={selectedChannel}
                          onChange={(e) => setSelectedChannel(e.target.value)}
                          className="flex-1 px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                        >
                          <option value="">Seleccionar canal...</option>
                          {channels
                            .filter(c => !ignoredChannels.includes(c.id))
                            .map(c => (
                              <option key={c.id} value={c.id}>
                                # {c.name}
                              </option>
                            ))}
                        </select>
                        <button
                          onClick={addIgnoredChannel}
                          disabled={!selectedChannel}
                          className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2"
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
                              className="flex items-center justify-between bg-gray-700/50 px-4 py-3 rounded-lg border border-gray-600 hover:border-purple-500/50 transition-colors"
                            >
                              <div className="flex items-center space-x-2">
                                <Hash className="w-4 h-4 text-gray-400" />
                                <span className="text-white font-medium">
                                  {getChannelName(channelId)}
                                </span>
                              </div>
                              <button
                                onClick={() => removeIgnoredChannel(channelId)}
                                className="p-1 hover:bg-red-500/20 rounded transition-colors group"
                              >
                                <X className="w-5 h-5 text-red-400 group-hover:text-red-300" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 bg-gray-700/30 rounded-lg border border-dashed border-gray-600">
                          <Hash className="w-12 h-12 text-gray-500 mx-auto mb-2" />
                          <p className="text-gray-400">No hay canales ignorados</p>
                          <p className="text-gray-500 text-sm mt-1">Selecciona un canal para empezar</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Settings */}
            {activeSection === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Notificaciones de Nivel</h1>
                  <p className="text-gray-400">Configura cómo se anuncian los cambios de nivel</p>
                </div>

                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                  <div className="space-y-6">
                    {/* Enable/Disable */}
                    <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border border-gray-600">
                      <div>
                        <h3 className="text-white font-medium">Habilitar notificaciones</h3>
                        <p className="text-gray-400 text-sm">Enviar mensaje cuando alguien sube de nivel</p>
                      </div>
                      <button
                        onClick={() => setLevelUpEnabled(!levelUpEnabled)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          levelUpEnabled ? 'bg-indigo-600' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            levelUpEnabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>

                    {/* Channel Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Canal de notificaciones
                      </label>
                      <select
                        value={levelUpChannel}
                        onChange={(e) => setLevelUpChannel(e.target.value)}
                        className="w-full px-4 py-2.5 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                      >
                        <option value="">Mismo canal donde escribió</option>
                        {channels.map(c => (
                          <option key={c.id} value={c.id}>
                            # {c.name}
                          </option>
                        ))}
                      </select>
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
                        value={levelUpMsg}
                        onChange={(e) => setLevelUpMsg(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                        placeholder="🎉 {mention} ha subido al nivel {level}!"
                      />
                      <div className="mt-2 flex flex-wrap gap-2">
                        <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded">
                          {'{mention}'} - Menciona al usuario
                        </span>
                        <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded">
                          {'{username}'} - Nombre del usuario
                        </span>
                        <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded">
                          {'{level}'} - Nuevo nivel
                        </span>
                        <span className="text-xs px-2 py-1 bg-gray-700 text-gray-300 rounded">
                          {'{oldLevel}'} - Nivel anterior
                        </span>
                      </div>
                    </div>

                    <button
                      onClick={saveLevelUp}
                      disabled={saving}
                      className="w-full px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                    >
                      <Save className="w-5 h-5" />
                      <span>{saving ? 'Guardando...' : 'Guardar Configuración'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Roles Section */}
            {activeSection === 'roles' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Roles de Nivel</h1>
                  <p className="text-gray-400">Asigna roles automáticamente al alcanzar ciertos niveles</p>
                </div>

                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                  <div className="text-center py-12">
                    <Award className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                    <p className="text-gray-400 mb-2">Función en desarrollo</p>
                    <p className="text-gray-500 text-sm">Próximamente podrás configurar roles automáticos</p>
                  </div>
                </div>
              </div>
            )}

            {/* Leaderboard Section */}
            {activeSection === 'leaderboard' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Leaderboard</h1>
                  <p className="text-gray-400">Visualiza y gestiona el ranking de tu servidor</p>
                </div>

                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                  <div className="text-center py-8">
                    <BarChart3 className="w-16 h-16 text-indigo-400 mx-auto mb-4" />
                    <p className="text-white font-medium mb-2">Ver Leaderboard del Servidor</p>
                    <p className="text-gray-400 text-sm mb-4">Accede al ranking completo de usuarios</p>
                    <button
                      onClick={() => navigate(`/guild/${guildId}/leaderboard`)}
                      className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2"
                    >
                      <BarChart3 className="w-5 h-5" />
                      <span>Ver Leaderboard</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default GuildSettings;