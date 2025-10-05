import React, { useState } from 'react';
import { useAchievements } from '../../hooks/useAchievements';
import { Trophy, Plus, Edit2, Trash2, ToggleLeft, ToggleRight, Award, Bell, Hash } from 'lucide-react';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export function AchievementsSettings({ guildId, roles, channels }) {
  const {
    achievements,
    loading,
    saving,
    createAchievement,
    updateAchievement,
    deleteAchievement,
    toggleAchievement,
    createDefaultAchievements
  } = useAchievements(guildId);

  const [showModal, setShowModal] = useState(false);
  const [editingAchievement, setEditingAchievement] = useState(null);

  const achievementTypes = [
    { value: 'messages', label: '💬 Mensajes', description: 'Cantidad de mensajes enviados' },
    { value: 'reactions', label: '⭐ Reacciones', description: 'Reacciones recibidas en mensajes' },
    { value: 'voice_time', label: '🎙️ Tiempo en Voice', description: 'Tiempo en canales de voz (segundos)' },
    { value: 'boost', label: '🚀 Boost', description: 'Boostear el servidor' }
  ];

  const handleCreateDefault = async () => {
    if (window.confirm('¿Crear logros predeterminados? (Solo si no tienes ninguno)')) {
      try {
        await createDefaultAchievements();
      } catch (error) {
        // Error ya manejado por el hook
      }
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`¿Eliminar el logro "${name}"?`)) {
      try {
        await deleteAchievement(id);
      } catch (error) {
        // Error ya manejado
      }
    }
  };

  const handleEdit = (achievement) => {
    setEditingAchievement(achievement);
    setShowModal(true);
  };

  const handleNew = () => {
    setEditingAchievement(null);
    setShowModal(true);
  };

  const getTypeInfo = (type) => {
    return achievementTypes.find(t => t.value === type) || achievementTypes[0];
  };

  if (loading) {
    return <LoadingSpinner text="Cargando logros..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            <Trophy className="w-8 h-8 text-yellow-400" />
            Sistema de Logros
          </h1>
          <p className="text-gray-400">
            Configura logros personalizados para tu servidor
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleCreateDefault}
            disabled={achievements.length > 0 || saving}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Award className="w-4 h-4" />
            Crear Predeterminados
          </button>
          <button
            onClick={handleNew}
            disabled={saving}
            className="px-4 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nuevo Logro
          </button>
        </div>
      </div>

      {/* Lista de logros */}
      {achievements.length === 0 ? (
        <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700/50">
          <Trophy className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <p className="text-gray-400 text-lg mb-4">No hay logros configurados</p>
          <button
            onClick={handleCreateDefault}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors"
          >
            Crear Logros Predeterminados
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {achievements.map(achievement => (
            <AchievementCard
              key={achievement._id}
              achievement={achievement}
              typeInfo={getTypeInfo(achievement.type)}
              onEdit={() => handleEdit(achievement)}
              onDelete={() => handleDelete(achievement._id, achievement.name)}
              onToggle={() => toggleAchievement(achievement._id)}
              roles={roles}
              channels={channels}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <AchievementModal
          achievement={editingAchievement}
          guildId={guildId}
          roles={roles}
          channels={channels}
          achievementTypes={achievementTypes}
          onClose={() => {
            setShowModal(false);
            setEditingAchievement(null);
          }}
          onCreate={createAchievement}
          onUpdate={updateAchievement}
        />
      )}
    </div>
  );
}

// Componente individual de logro
function AchievementCard({ achievement, typeInfo, onEdit, onDelete, onToggle, roles, channels }) {
  const [expanded, setExpanded] = useState(false);

  const getChannelName = (channelId) => {
    const channel = channels.find(c => c.id === channelId);
    return channel ? `# ${channel.name}` : 'Mismo canal';
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4 flex-1">
          <div className="text-4xl">{achievement.icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="text-xl font-bold text-white">{achievement.name}</h3>
              <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                {typeInfo.label}
              </span>
              {!achievement.enabled && (
                <span className="px-2 py-1 bg-red-900/50 text-red-300 text-xs rounded">
                  Deshabilitado
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm mb-3">{achievement.description}</p>
            
            {/* Notificaciones info */}
            {achievement.notifications && (
              <div className="mb-3 flex items-center gap-2 text-sm">
                <Bell className={`w-4 h-4 ${achievement.notifications.enabled ? 'text-green-400' : 'text-gray-500'}`} />
                <span className={achievement.notifications.enabled ? 'text-green-400' : 'text-gray-500'}>
                  {achievement.notifications.enabled ? 'Notificaciones: ' : 'Sin notificaciones'}
                </span>
                {achievement.notifications.enabled && (
                  <span className="text-gray-400">
                    {achievement.notifications.channelId 
                      ? getChannelName(achievement.notifications.channelId)
                      : 'Mismo canal'}
                  </span>
                )}
              </div>
            )}
            
            {/* Tiers preview */}
            <div className="flex flex-wrap gap-2">
              {achievement.tiers.slice(0, expanded ? undefined : 3).map(tier => (
                <div
                  key={tier.tier}
                  className="px-3 py-1 bg-gray-700/50 rounded-lg border border-gray-600 text-sm"
                >
                  <span className="text-white font-medium">{tier.emoji} {tier.title}</span>
                  <span className="text-gray-400 ml-2">
                    ({formatTarget(tier.target, achievement.type)})
                  </span>
                </div>
              ))}
              {achievement.tiers.length > 3 && !expanded && (
                <button
                  onClick={() => setExpanded(true)}
                  className="px-3 py-1 text-indigo-400 hover:text-indigo-300 text-sm"
                >
                  +{achievement.tiers.length - 3} más
                </button>
              )}
              {expanded && achievement.tiers.length > 3 && (
                <button
                  onClick={() => setExpanded(false)}
                  className="px-3 py-1 text-indigo-400 hover:text-indigo-300 text-sm"
                >
                  Mostrar menos
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onToggle}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title={achievement.enabled ? 'Deshabilitar' : 'Habilitar'}
          >
            {achievement.enabled ? (
              <ToggleRight className="w-5 h-5 text-green-400" />
            ) : (
              <ToggleLeft className="w-5 h-5 text-gray-500" />
            )}
          </button>
          <button
            onClick={onEdit}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Editar"
          >
            <Edit2 className="w-5 h-5 text-blue-400" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-5 h-5 text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Modal de creación/edición
function AchievementModal({ achievement, guildId, roles, channels, achievementTypes, onClose, onCreate, onUpdate }) {
  const isEditing = !!achievement;

  const [formData, setFormData] = useState({
    type: achievement?.type || 'messages',
    name: achievement?.name || '',
    description: achievement?.description || '',
    icon: achievement?.icon || '🏆',
    tiers: achievement?.tiers || [{ tier: 1, title: '', target: 100, emoji: '🥉', description: '', rewardRoleId: '' }],
    boostRoleId: achievement?.boostRoleId || '',
    enabled: achievement?.enabled !== undefined ? achievement.enabled : true,
    // ========== NUEVO: Campos de notificaciones ==========
    notifications: {
      enabled: achievement?.notifications?.enabled !== undefined ? achievement.notifications.enabled : true,
      channelId: achievement?.notifications?.channelId || '',
      message: achievement?.notifications?.message || '🎉 {mention} ha desbloqueado: **{achievement}** - {tier}!'
    }
    // ====================================================
  });

  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validaciones
    if (!formData.name.trim()) {
      alert('El nombre es requerido');
      return;
    }

    if (formData.tiers.length === 0) {
      alert('Debes agregar al menos un tier');
      return;
    }

    for (const tier of formData.tiers) {
      if (!tier.title.trim()) {
        alert(`El tier ${tier.tier} necesita un título`);
        return;
      }
      if (!tier.target || tier.target < 1) {
        alert(`El tier ${tier.tier} necesita un target válido`);
        return;
      }
    }

    if (formData.type === 'boost' && !formData.boostRoleId) {
      alert('Los logros de tipo Boost requieren seleccionar el rol de booster');
      return;
    }

    try {
      setSaving(true);
      
      const cleanedTiers = formData.tiers.map(tier => ({
        ...tier,
        rewardRoleId: tier.rewardRoleId || null
      }));

      const payload = {
        ...formData,
        tiers: cleanedTiers,
        // Limpiar channelId si está vacío
        notifications: {
          ...formData.notifications,
          channelId: formData.notifications.channelId || null
        }
      };

      if (isEditing) {
        await onUpdate(achievement._id, payload);
      } else {
        await onCreate(payload);
      }
      
      onClose();
    } catch (error) {
      // Error ya manejado por el hook
    } finally {
      setSaving(false);
    }
  };

  const addTier = () => {
    const nextTier = formData.tiers.length + 1;
    const lastTarget = formData.tiers[formData.tiers.length - 1]?.target || 0;
    
    setFormData({
      ...formData,
      tiers: [
        ...formData.tiers,
        {
          tier: nextTier,
          title: '',
          target: lastTarget * 2 || 100,
          emoji: getTierEmoji(nextTier),
          description: '',
          rewardRoleId: ''
        }
      ]
    });
  };

  const removeTier = (index) => {
    if (formData.tiers.length === 1) {
      alert('Debe haber al menos un tier');
      return;
    }
    
    const newTiers = formData.tiers.filter((_, i) => i !== index);
    newTiers.forEach((tier, i) => {
      tier.tier = i + 1;
    });
    
    setFormData({ ...formData, tiers: newTiers });
  };

  const updateTier = (index, field, value) => {
    const newTiers = [...formData.tiers];
    newTiers[index][field] = value;
    setFormData({ ...formData, tiers: newTiers });
  };

  const getTierEmoji = (tier) => {
    const emojis = ['🥉', '🥈', '🥇', '💎', '👑', '⭐', '🌟', '✨', '💫', '🔥'];
    return emojis[tier - 1] || '🏆';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-gray-800 rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-white">
            {isEditing ? 'Editar Logro' : 'Crear Nuevo Logro'}
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Tipo de Logro
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              disabled={isEditing}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2"
            >
              {achievementTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label} - {type.description}
                </option>
              ))}
            </select>
            {isEditing && (
              <p className="text-xs text-gray-400 mt-1">El tipo no puede cambiarse después de crear el logro</p>
            )}
          </div>

          {/* Nombre e Icono */}
          <div className="grid grid-cols-4 gap-4">
            <div className="col-span-3">
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Nombre del Logro *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2"
                placeholder="Ej: Mensajero"
                maxLength={100}
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Icono
              </label>
              <input
                type="text"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2 text-center text-2xl"
                placeholder="🏆"
                maxLength={10}
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Descripción
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2"
              rows={2}
              placeholder="Describe el logro..."
              maxLength={500}
            />
          </div>

          {/* Boost Role (solo para tipo boost) */}
          {formData.type === 'boost' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Rol de Booster *
              </label>
              <select
                value={formData.boostRoleId}
                onChange={(e) => setFormData({ ...formData, boostRoleId: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2"
                required
              >
                <option value="">Selecciona el rol de booster...</option>
                {roles.map(role => (
                  <option key={role.id} value={role.id}>
                    {role.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Se sincronizarán automáticamente los usuarios que ya tienen este rol
              </p>
            </div>
          )}

          {/* ========== NUEVO: Configuración de Notificaciones ========== */}
          <div className="bg-gray-700/30 rounded-lg p-4 border border-gray-600">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-semibold text-white">Notificaciones</h3>
            </div>

            {/* Habilitar notificaciones */}
            <div className="flex items-center justify-between mb-4 p-3 bg-gray-700/50 rounded-lg">
              <div>
                <p className="text-white font-medium">Habilitar notificaciones</p>
                <p className="text-gray-400 text-sm">Enviar mensaje cuando alguien desbloquea este logro</p>
              </div>
              <button
                type="button"
                onClick={() => setFormData({
                  ...formData,
                  notifications: { ...formData.notifications, enabled: !formData.notifications.enabled }
                })}
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  formData.notifications.enabled ? 'bg-indigo-600' : 'bg-gray-600'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-lg ${
                    formData.notifications.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {formData.notifications.enabled && (
              <>
                {/* Canal de notificaciones */}
                <div className="mb-4">
                  <label className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                    <Hash className="w-4 h-4" />
                    Canal de notificaciones
                  </label>
                  <select
                    value={formData.notifications.channelId}
                    onChange={(e) => setFormData({
                      ...formData,
                      notifications: { ...formData.notifications, channelId: e.target.value }
                    })}
                    className="w-full bg-gray-700 border border-gray-600 text-white rounded-lg px-4 py-2"
                  >
                    <option value="">Mismo canal donde se desbloqueó</option>
                    {channels.map(channel => (
                      <option key={channel.id} value={channel.id}>
                        # {channel.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    Si no se selecciona, el mensaje se enviará en el mismo canal donde se desbloqueó el logro
                  </p>
                </div>

                {/* Mensaje de notificación */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Mensaje de notificación
                  </label>
                  <textarea
                    value={formData.notifications.message}
                    onChange={(e) => setFormData({
                      ...formData,
                      notifications: { ...formData.notifications, message: e.target.value }
                    })}
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
              </>
            )}
          </div>
          {/* ============================================================ */}

          {/* Tiers */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-300">
                Niveles/Tiers *
              </label>
              <button
                type="button"
                onClick={addTier}
                disabled={formData.tiers.length >= 10}
                className="px-3 py-1 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white rounded text-sm"
              >
                <Plus className="w-4 h-4 inline mr-1" />
                Agregar Tier
              </button>
            </div>

            <div className="space-y-3">
              {formData.tiers.map((tier, index) => (
                <div key={index} className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-white font-medium">Tier {tier.tier}</span>
                    {formData.tiers.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeTier(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-12 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs text-gray-400 mb-1">Emoji</label>
                      <input
                        type="text"
                        value={tier.emoji}
                        onChange={(e) => updateTier(index, 'emoji', e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-center"
                        maxLength={10}
                      />
                    </div>
                    <div className="col-span-4">
                      <label className="block text-xs text-gray-400 mb-1">Título *</label>
                      <input
                        type="text"
                        value={tier.title}
                        onChange={(e) => updateTier(index, 'title', e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-1"
                        placeholder="Ej: Novato"
                        maxLength={100}
                        required
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs text-gray-400 mb-1">Meta *</label>
                      <input
                        type="number"
                        value={tier.target}
                        onChange={(e) => updateTier(index, 'target', parseInt(e.target.value) || 0)}
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-1"
                        min={1}
                        required
                      />
                    </div>
                    <div className="col-span-3">
                      <label className="block text-xs text-gray-400 mb-1">Rol Recompensa</label>
                      <select
                        value={tier.rewardRoleId || ''}
                        onChange={(e) => updateTier(index, 'rewardRoleId', e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded px-2 py-1 text-sm"
                      >
                        <option value="">Sin rol</option>
                        {roles.map(role => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-12">
                      <label className="block text-xs text-gray-400 mb-1">Descripción</label>
                      <input
                        type="text"
                        value={tier.description}
                        onChange={(e) => updateTier(index, 'description', e.target.value)}
                        className="w-full bg-gray-700 border border-gray-600 text-white rounded px-3 py-1"
                        placeholder="Descripción del tier (opcional)"
                        maxLength={200}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Habilitado */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="enabled"
              checked={formData.enabled}
              onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              className="w-5 h-5 rounded border-gray-600 text-indigo-600"
            />
            <label htmlFor="enabled" className="text-white">
              Logro habilitado (los usuarios podrán progresarlo)
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 text-white rounded-lg"
            >
              {saving ? 'Guardando...' : (isEditing ? 'Actualizar' : 'Crear')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helper para formatear targets según el tipo
function formatTarget(target, type) {
  switch (type) {
    case 'voice_time':
      const hours = Math.floor(target / 3600);
      const minutes = Math.floor((target % 3600) / 60);
      return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
    case 'boost':
      return 'Boostear';
    default:
      return target.toLocaleString();
  }
}