// frontend/src/pages/GuildSettings.jsx
import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { guildService } from '../services/api';
import { Settings, Hash, Bell, Award, X, Plus, Save, ArrowLeft, TrendingUp, BarChart3, AlertCircle, CheckCircle2, Trash2, Shield } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';

function GuildSettings() {
  const { guildId } = useParams();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState('general');
  const [config, setConfig] = useState(null);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Estado para configuraciones originales (para detectar cambios)
  const [originalMultiplier, setOriginalMultiplier] = useState(1);
  const [originalIgnoredChannels, setOriginalIgnoredChannels] = useState([]);
  const [originalLevelUpMsg, setOriginalLevelUpMsg] = useState('');
  const [originalLevelUpEnabled, setOriginalLevelUpEnabled] = useState(true);
  const [originalLevelUpChannel, setOriginalLevelUpChannel] = useState('');

  // Estado para configuraciones actuales
  const [multiplier, setMultiplier] = useState(1);
  const [ignoredChannels, setIgnoredChannels] = useState([]);
  const [selectedChannel, setSelectedChannel] = useState('');
  const [levelUpMsg, setLevelUpMsg] = useState('');
  const [levelUpEnabled, setLevelUpEnabled] = useState(true);
  const [levelUpChannel, setLevelUpChannel] = useState('');

  // Estados para roles de nivel
  const [levelRoles, setLevelRoles] = useState([]);
  const [originalLevelRoles, setOriginalLevelRoles] = useState([]);
  const [selectedRoleForLevel, setSelectedRoleForLevel] = useState('');
  const [selectedLevelForRole, setSelectedLevelForRole] = useState('1');

  useEffect(() => {
    load();
  }, [guildId]);

  const showToast = (message, type = 'success') => {
    if (type === 'success') toast.success(message);
    else toast.error(message);
  };

  const load = async () => {
    setLoading(true);
    try {
      const [cfgRes, resResources] = await Promise.all([
        guildService.getConfig(guildId),
        guildService.getResources(guildId)
      ]);
      
      const cfg = cfgRes.data.config;
      setConfig(cfg);
      
      // Configurar valores actuales y originales
      const mult = cfg.xpMultiplier || 1;
      const ignored = cfg.ignoredChannels || [];
      const msg = cfg.levelUpMessage || '🎉 {mention} ha subido al nivel {level}!';
      const enabled = cfg.levelUpEnabled ?? true;
      const channel = cfg.levelUpChannelId || '';
      
      setMultiplier(String(mult));
      setOriginalMultiplier(String(mult));
      
      setIgnoredChannels(ignored);
      setOriginalIgnoredChannels([...ignored]);
      
      setLevelUpMsg(msg);
      setOriginalLevelUpMsg(msg);
      
      setLevelUpEnabled(enabled);
      setOriginalLevelUpEnabled(enabled);
      
      setLevelUpChannel(channel);
      setOriginalLevelUpChannel(channel);
      
      setChannels(resResources.data.channels || []);
      setRoles(resResources.data.roles || []);
    } catch (e) {
      console.error('Error cargando config:', e);
      showToast('Error al cargar la configuración', 'error');
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

  const hasGeneralChanges = () => {
    return multiplier !== originalMultiplier || 
           JSON.stringify(ignoredChannels.sort()) !== JSON.stringify(originalIgnoredChannels.sort());
  };

  const hasNotificationChanges = () => {
    return levelUpEnabled !== originalLevelUpEnabled ||
           levelUpChannel !== originalLevelUpChannel ||
           levelUpMsg !== originalLevelUpMsg;
  };

  const saveGeneral = async () => {
    setSaving(true);
    try {
      await guildService.updateMultiplier(guildId, parseFloat(multiplier));
      await guildService.updateIgnoredChannels(guildId, ignoredChannels);
      
      // Actualizar valores originales después de guardar
      setOriginalMultiplier(multiplier);
      setOriginalIgnoredChannels([...ignoredChannels]);
      
      showToast('✅ Configuración general guardada correctamente', 'success');
    } catch (e) {
      console.error('Error guardando:', e);
      showToast('❌ Error al guardar la configuración', 'error');
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
      
      // Actualizar valores originales después de guardar
      setOriginalLevelUpEnabled(levelUpEnabled);
      setOriginalLevelUpChannel(levelUpChannel);
      setOriginalLevelUpMsg(levelUpMsg);
      
      showToast('✅ Notificaciones guardadas correctamente', 'success');
    } catch (e) {
      console.error('Error guardando:', e);
      showToast('❌ Error al guardar las notificaciones', 'error');
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
      <Toaster position="top-right" toastOptions={{ duration: 3000 }} />

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
                const hasChanges = item.id === 'general' ? hasGeneralChanges() : 
                                 item.id === 'notifications' ? hasNotificationChanges() : false;
                
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveSection(item.id)}
                    className={`w-full flex items-center justify-between px-4 py-3 rounded-lg transition-all ${
                      isActive
                        ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/50'
                        : 'text-gray-400 hover:bg-gray-700/50 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </div>
                    {hasChanges && (
                      <div className="w-2 h-2 bg-yellow-400 rounded-full" title="Cambios sin guardar"></div>
                    )}
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

                {/* Cambios sin guardar warning */}
                {hasGeneralChanges() && (
                  <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-yellow-300 font-medium">Tienes cambios sin guardar</p>
                      <p className="text-yellow-400/80 text-sm mt-1">No olvides guardar tus cambios antes de salir</p>
                    </div>
                  </div>
                )}

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
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {['0.25', '0.5', '0.75', '1', '2', '4', '6', '8'].map(val => (
                          <button
                            key={val}
                            onClick={() => setMultiplier(val)}
                            className={`px-4 py-3 rounded-lg font-medium transition-all border-2 ${
                              multiplier === val
                                ? 'bg-indigo-600 border-indigo-500 text-white'
                                : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:border-indigo-500/50'
                            }`}
                          >
                            {val}x
                          </button>
                        ))}
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
                        <div className="relative flex-1">
                          <select
                            value={selectedChannel}
                            onChange={(e) => setSelectedChannel(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-700/50 border-2 border-gray-600 rounded-lg text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                          >
                            <option value="" className="bg-gray-800">Seleccionar canal...</option>
                            {channels
                              .filter(c => !ignoredChannels.includes(c.id))
                              .map(c => (
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
                          onClick={addIgnoredChannel}
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
                                onClick={() => removeIgnoredChannel(channelId)}
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
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <button
                    onClick={saveGeneral}
                    disabled={saving || !hasGeneralChanges()}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center space-x-2 shadow-lg"
                  >
                    <Save className="w-5 h-5" />
                    <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
                  </button>
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

                {/* Cambios sin guardar warning */}
                {hasNotificationChanges() && (
                  <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-yellow-300 font-medium">Tienes cambios sin guardar</p>
                      <p className="text-yellow-400/80 text-sm mt-1">No olvides guardar tus cambios antes de salir</p>
                    </div>
                  </div>
                )}

                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                  <div className="space-y-6">
                    {/* Enable/Disable */}
                    <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border-2 border-gray-600">
                      <div>
                        <h3 className="text-white font-medium">Habilitar notificaciones</h3>
                        <p className="text-gray-400 text-sm">Enviar mensaje cuando alguien sube de nivel</p>
                      </div>
                      <button
                        onClick={() => setLevelUpEnabled(!levelUpEnabled)}
                        className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                          levelUpEnabled ? 'bg-indigo-600' : 'bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-lg ${
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
                      <div className="relative">
                        <select
                          value={levelUpChannel}
                          onChange={(e) => setLevelUpChannel(e.target.value)}
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
                        value={levelUpMsg}
                        onChange={(e) => setLevelUpMsg(e.target.value)}
                        rows={3}
                        className="w-full px-4 py-3 bg-gray-700/50 border-2 border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none transition-all"
                        placeholder="🎉 {mention} ha subido al nivel {level}!"
                      />
                      <div className="mt-3 flex flex-wrap gap-2">
                        {[
                          { key: '{mention}', desc: 'Menciona al usuario' },
                          { key: '{username}', desc: 'Nombre del usuario' },
                          { key: '{level}', desc: 'Nuevo nivel' },
                          { key: '{oldLevel}', desc: 'Nivel anterior' }
                        ].map(tag => (
                          <span key={tag.key} className="text-xs px-3 py-1.5 bg-gray-700 text-gray-300 rounded-lg border border-gray-600">
                            <span className="font-mono text-indigo-400">{tag.key}</span> - {tag.desc}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <button
                    onClick={saveLevelUp}
                    disabled={saving || !hasNotificationChanges()}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center space-x-2 shadow-lg"
                  >
                    <Save className="w-5 h-5" />
                    <span>{saving ? 'Guardando...' : 'Guardar Configuración'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Roles Section */}
            {activeSection === 'roles' && (
              <div className="space-y-6">
                <div>
                  <h1 className="text-3xl font-bold text-white mb-2">Roles de Nivel</h1>
                  <p className="text-gray-400">Asigna roles automáticamente cuando los usuarios alcancen ciertos niveles</p>
                </div>

                {/* Cambios sin guardar */}
                {hasRolesChanges() && (
                  <div className="bg-yellow-500/10 border border-yellow-500/50 rounded-lg p-4 flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-yellow-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-yellow-300 font-medium">Tienes cambios sin guardar</p>
                      <p className="text-yellow-400/80 text-sm mt-1">No olvides guardar tus cambios antes de salir</p>
                    </div>
                  </div>
                )}

                {/* Agregar nuevo rol */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-green-500/20 p-3 rounded-lg">
                      <Plus className="w-6 h-6 text-green-400" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-white mb-2">Agregar Rol de Nivel</h3>
                      <p className="text-gray-400 text-sm mb-4">
                        Selecciona un rol y el nivel requerido para obtenerlo
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Selector de Nivel */}
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Nivel requerido
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="100"
                            value={selectedLevelForRole}
                            onChange={(e) => setSelectedLevelForRole(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-700/50 border-2 border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                            placeholder="Ej: 5"
                          />
                          {isLevelUsed(selectedLevelForRole) && (
                            <p className="text-red-400 text-xs mt-1">Este nivel ya tiene un rol asignado</p>
                          )}
                        </div>

                        {/* Selector de Rol */}
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Rol a asignar
                          </label>
                          <div className="relative">
                            <select
                              value={selectedRoleForLevel}
                              onChange={(e) => setSelectedRoleForLevel(e.target.value)}
                              className="w-full px-4 py-3 bg-gray-700/50 border-2 border-gray-600 rounded-lg text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all"
                            >
                              <option value="" className="bg-gray-800">Seleccionar rol...</option>
                              {roles
                                .filter(r => !isRoleUsed(r.id))
                                .map(r => (
                                  <option key={r.id} value={r.id} className="bg-gray-800">
                                    {r.name}
                                  </option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={addLevelRole}
                        disabled={!selectedRoleForLevel || !selectedLevelForRole || isLevelUsed(selectedLevelForRole)}
                        className="mt-4 w-full px-6 py-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center space-x-2"
                      >
                        <Plus className="w-5 h-5" />
                        <span>Agregar Rol de Nivel</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Lista de roles configurados */}
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <div className="bg-indigo-500/20 p-2 rounded-lg">
                        <Award className="w-5 h-5 text-indigo-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-white">Roles Configurados</h3>
                    </div>
                    <span className="text-sm text-gray-400">
                      {sortedLevelRoles().length} {sortedLevelRoles().length === 1 ? 'rol' : 'roles'}
                    </span>
                  </div>

                  {sortedLevelRoles().length > 0 ? (
                    <div className="space-y-3">
                      {sortedLevelRoles().map(lr => (
                        <div
                          key={lr.level}
                          className="flex items-center justify-between bg-gray-700/50 px-4 py-4 rounded-lg border-2 border-gray-600 hover:border-indigo-500/50 transition-all group"
                        >
                          <div className="flex items-center space-x-4">
                            {/* Nivel Badge */}
                            <div className="bg-indigo-500/20 px-4 py-2 rounded-lg border border-indigo-500/50">
                              <div className="text-center">
                                <p className="text-xs text-gray-400 font-medium">Nivel</p>
                                <p className="text-2xl font-bold text-indigo-400">{lr.level}</p>
                              </div>
                            </div>

                            {/* Arrow */}
                            <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>

                            {/* Rol Badge */}
                            <div className="flex items-center space-x-3">
                              <Shield className="w-5 h-5 text-gray-400" />
                              <div>
                                <p className="text-white font-medium">{getRoleName(lr.roleId)}</p>
                                <p className="text-gray-400 text-xs">Se asigna al alcanzar nivel {lr.level}</p>
                              </div>
                            </div>
                          </div>

                          {/* Delete Button */}
                          <button
                            onClick={() => removeLevelRole(lr.level)}
                            className="p-2 hover:bg-red-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          >
                            <Trash2 className="w-5 h-5 text-red-400" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12 bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-600">
                      <Shield className="w-16 h-16 text-gray-500 mx-auto mb-3" />
                      <p className="text-gray-400 font-medium mb-1">No hay roles configurados</p>
                      <p className="text-gray-500 text-sm">
                        Agrega un rol para que se asigne automáticamente cuando los usuarios alcancen cierto nivel
                      </p>
                    </div>
                  )}
                </div>

                {/* Información adicional */}
                <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-blue-300 font-medium mb-1">¿Cómo funciona?</p>
                      <ul className="text-blue-400/80 text-sm space-y-1">
                        <li>• Los roles se asignan automáticamente cuando un usuario alcanza el nivel especificado</li>
                        <li>• Los usuarios mantienen todos los roles de niveles inferiores que hayan alcanzado</li>
                        <li>• Asegúrate de que el bot tenga permisos para gestionar roles</li>
                        <li>• El rol del bot debe estar por encima de los roles que desea asignar</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="flex justify-end">
                  <button
                    onClick={saveRoles}
                    disabled={saving || !hasRolesChanges()}
                    className="px-8 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center space-x-2 shadow-lg"
                  >
                    <Save className="w-5 h-5" />
                    <span>{saving ? 'Guardando...' : 'Guardar Configuración'}</span>
                  </button>
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