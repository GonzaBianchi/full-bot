import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { roleMenuService, getApiError } from '../services/api';
import { Plus, Trash2, Edit, Send, AlertCircle, Shield, Hash, Smile, X, Save, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { SearchableSelect } from '../components/ui/SearchableSelect';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { useGuildResources, useRoleMenus, useGuildInvalidation } from '../hooks/queries';

function RoleMenus() {
  // Se renderiza como pestaña del panel y también como ruta propia. Las
  // consultas van por react-query, así que canales y roles se reutilizan de
  // la caché en vez de pedirse otra vez al montar la pestaña.
  const { guildId } = useParams();
  const { data: menus = [], isPending: loadingMenus } = useRoleMenus(guildId);
  const { data: resources, isPending: loadingResources } = useGuildResources(guildId);
  const { invalidateRoleMenus } = useGuildInvalidation(guildId);

  const loading = loadingMenus || loadingResources;
  const channels = resources?.channels ?? [];
  const roles = resources?.roles ?? [];
  const emojis = resources?.emojis ?? [];

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(null);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [pendingDelete, setPendingDelete] = useState(null);
  const [form, setForm] = useState({
    title: '',
    channelId: '',
    exclusive: false,
    options: []
  });

  const MAX_OPTIONS = 20;

  const startNew = () => {
    setEditing(null);
    setForm({
      title: '',
      channelId: channels[0]?.id || '',
      exclusive: false,
      options: []
    });
    setShowForm(true);
  };

  const edit = (menu) => {
    setEditing(menu);
    setForm({
      title: menu.title,
      channelId: menu.channelId,
      exclusive: menu.exclusive,
      options: [...menu.options]
    });
    setShowForm(true);
  };

  const cancelEdit = () => {
    setShowForm(false);
    setEditing(null);
    setForm({ title: '', channelId: '', exclusive: false, options: [] });
  };

  const remove = async () => {
    const id = pendingDelete;
    setPendingDelete(null);
    if (!id) return;

    try {
      await roleMenuService.remove(guildId, id);
      toast.success('✅ Menú eliminado exitosamente');
      await invalidateRoleMenus();
    } catch (e) {
      console.error(e);
      toast.error(getApiError(e, 'Error eliminando el menú'));
    }
  };

  const save = async () => {
    if (!form.title.trim()) {
      toast.error('El título es requerido');
      return;
    }
    if (!form.channelId) {
      toast.error('Selecciona un canal');
      return;
    }
    if (form.options.length === 0) {
      toast.error('Agrega al menos una opción');
      return;
    }

    const invalidOptions = form.options.filter(opt => !opt.emojiIdentifier || !opt.roleId);
    if (invalidOptions.length > 0) {
      toast.error('Todas las opciones deben tener un emoji y un rol');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await roleMenuService.update(guildId, editing._id, form);
        toast.success('✅ Menú actualizado y re-publicado exitosamente');
      } else {
        await roleMenuService.create(guildId, form);
        toast.success('✅ Menú creado exitosamente');
      }
      cancelEdit();
      await invalidateRoleMenus();
    } catch (e) {
      console.error(e);
      toast.error(getApiError(e, 'Error guardando el menú'));
    } finally {
      setSaving(false);
    }
  };

  const publish = async (menu) => {
    if (!menu.options || menu.options.length === 0) {
      toast.error('El menú debe tener al menos una opción');
      return;
    }

    setPublishing(menu._id);
    try {
      await roleMenuService.publish(guildId, menu._id);
      toast.success('✅ Menú publicado en el canal');
      await invalidateRoleMenus();
    } catch (e) {
      console.error(e);
      toast.error(getApiError(e, 'Error publicando el menú'));
    } finally {
      setPublishing(null);
    }
  };

  const addOption = () => {
    if (form.options.length >= MAX_OPTIONS) {
      toast.error(`Máximo ${MAX_OPTIONS} opciones por menú`);
      return;
    }
    setForm({ 
      ...form, 
      options: [...form.options, { emojiIdentifier: '', emojiId: null, roleId: '', label: '' }] 
    });
  };

  const updateOption = (index, field, value) => {
    const newOptions = [...form.options];
    
    if (field === 'emojiIdentifier') {
      const parts = value.split(':');
      if (parts.length === 2 && /^\d+$/.test(parts[1])) {
        newOptions[index].emojiId = parts[1];
      } else {
        newOptions[index].emojiId = null;
      }
    }
    
    newOptions[index][field] = value;
    setForm({ ...form, options: newOptions });
  };

  const removeOption = (index) => {
    const newOptions = [...form.options];
    newOptions.splice(index, 1);
    setForm({ ...form, options: newOptions });
  };

  const getChannelName = (channelId) => {
    const channel = channels.find(c => c.id === channelId);
    return channel ? `# ${channel.name}` : 'Canal desconocido';
  };

  const getRoleName = (roleId) => {
    const role = roles.find(r => r.id === roleId);
    return role ? role.name : 'Rol desconocido';
  };

  const getEmojiDisplay = (emojiIdentifier) => {
    const emoji = emojis.find(e => e.identifier === emojiIdentifier);
    if (emoji && emoji.id) {
      return `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}`;
    }
    return emojiIdentifier.split(':')[0] || emojiIdentifier;
  };

  const isCustomEmoji = (emojiIdentifier) => {
    const emoji = emojis.find(e => e.identifier === emojiIdentifier);
    return emoji && emoji.id;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Cargando menús de roles...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <ConfirmDialog
        open={Boolean(pendingDelete)}
        danger
        title="Eliminar el menú de roles"
        description="El mensaje publicado deja de asignar roles. Esta acción no se puede deshacer."
        confirmText="Eliminar"
        onConfirm={remove}
        onCancel={() => setPendingDelete(null)}
      />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Menús de Roles (Autoroles)</h1>
          <p className="text-gray-400">Crea menús con reacciones para que los usuarios obtengan roles automáticamente</p>
        </div>
        {!showForm && (
          <button 
            onClick={startNew} 
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors flex items-center space-x-2 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>Crear Menú</span>
          </button>
        )}
      </div>

      {/* Info Card */}
      <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-blue-300 font-medium mb-1">¿Cómo funcionan los menús de roles?</p>
            <ul className="text-blue-400/80 text-sm space-y-1">
              <li>• Los usuarios reaccionan con emojis en el mensaje para obtener roles</li>
              <li>• Puedes agregar hasta {MAX_OPTIONS} roles por menú (límite de Discord)</li>
              <li>• El modo exclusivo permite que solo se pueda tener un rol del menú a la vez</li>
              <li>• Los emojis pueden ser del servidor o emojis unicode estándar</li>
              <li>• <strong>Si editas un menú publicado, se actualizará automáticamente en el canal</strong></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Formulario */}
      {showForm ? (
        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">
              {editing ? 'Editar Menú' : 'Crear Nuevo Menú'}
            </h2>
            <button
              onClick={cancelEdit}
              className="p-2 hover:bg-gray-700 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Título */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Título del Menú *
            </label>
            <input 
              value={form.title} 
              onChange={e => setForm({...form, title: e.target.value})} 
              placeholder="Ej: Selecciona tus roles"
              maxLength={100}
              className="w-full px-4 py-3 bg-gray-700/50 border-2 border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all cursor-text" 
            />
          </div>

          {/* Canal con búsqueda */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Canal donde se publicará *
            </label>
            <SearchableSelect
              value={form.channelId}
              onChange={(val) => setForm({...form, channelId: val})}
              options={channels}
              placeholder="Seleccionar canal..."
              icon={Hash}
              renderOption={(channel) => (
                <div className="flex items-center space-x-2">
                  <Hash className="w-4 h-4 text-gray-400" />
                  <span>{channel.name}</span>
                </div>
              )}
              renderSelected={(channel) => channel ? `# ${channel.name}` : ''}
            />
          </div>

          {/* Modo exclusivo */}
          <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg border-2 border-gray-600">
            <div>
              <h3 className="text-white font-medium">Modo Exclusivo</h3>
              <p className="text-gray-400 text-sm">Solo se puede tener un rol de este menú a la vez</p>
            </div>
            <button
              onClick={() => setForm({...form, exclusive: !form.exclusive})}
              className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors cursor-pointer ${
                form.exclusive ? 'bg-indigo-600' : 'bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform shadow-lg ${
                  form.exclusive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Opciones */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-300">
                  Opciones de Roles ({form.options.length}/{MAX_OPTIONS})
                </label>
                <p className="text-gray-400 text-xs mt-1">Cada opción necesita un emoji y un rol</p>
              </div>
              <button 
                onClick={addOption}
                disabled={form.options.length >= MAX_OPTIONS}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center space-x-2 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Agregar Opción</span>
              </button>
            </div>

            {form.options.length === 0 ? (
              <div className="text-center py-12 bg-gray-700/30 rounded-lg border-2 border-dashed border-gray-600">
                <Shield className="w-16 h-16 text-gray-500 mx-auto mb-3" />
                <p className="text-gray-400 font-medium mb-1">No hay opciones agregadas</p>
                <p className="text-gray-500 text-sm">Haz clic en "Agregar Opción" para empezar</p>
              </div>
            ) : (
              <div className="space-y-3">
                {form.options.map((opt, idx) => (
                  <div key={idx} className="bg-gray-700/50 p-4 rounded-lg border-2 border-gray-600 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-300">Opción {idx + 1}</span>
                      <button 
                        onClick={() => removeOption(idx)} 
                        className="p-2 hover:bg-red-500/20 rounded-lg transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {/* Emoji con búsqueda */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Emoji *</label>
                        <SearchableSelect
                          value={opt.emojiIdentifier}
                          onChange={(val) => updateOption(idx, 'emojiIdentifier', val)}
                          options={emojis.map(e => ({
                            id: e.identifier,
                            value: e.identifier,
                            name: e.name,
                            label: e.id ? `${e.name} ${e.animated ? '(anim)' : '(custom)'}` : `${e.identifier} ${e.name}`,
                            emojiId: e.id,
                            animated: e.animated,
                            url: e.url
                          }))}
                          placeholder="Seleccionar emoji..."
                          icon={Smile}
                          renderOption={(emoji) => (
                            <div className="flex items-center space-x-2">
                              {emoji.emojiId ? (
                                <img 
                                  src={`https://cdn.discordapp.com/emojis/${emoji.emojiId}.${emoji.animated ? 'gif' : 'png'}`}
                                  alt={emoji.name}
                                  className="w-5 h-5"
                                />
                              ) : (
                                <span className="text-lg">{emoji.value}</span>
                              )}
                              <span className="text-sm">{emoji.label}</span>
                            </div>
                          )}
                          renderSelected={(emoji) => {
                            if (!emoji) return '';
                            if (emoji.emojiId) {
                              return (
                                <div className="flex items-center space-x-2">
                                  <img 
                                    src={`https://cdn.discordapp.com/emojis/${emoji.emojiId}.${emoji.animated ? 'gif' : 'png'}`}
                                    alt={emoji.name}
                                    className="w-5 h-5"
                                  />
                                  <span>{emoji.name}</span>
                                </div>
                              );
                            }
                            return emoji.value;
                          }}
                        />
                      </div>

                      {/* Rol con búsqueda */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">Rol *</label>
                        <SearchableSelect
                          value={opt.roleId}
                          onChange={(val) => updateOption(idx, 'roleId', val)}
                          options={roles}
                          placeholder="Seleccionar rol..."
                          icon={Shield}
                          renderOption={(role) => (
                            <div className="flex items-center space-x-2">
                              <div 
                                className="w-3 h-3 rounded-full" 
                                style={{ backgroundColor: role.color || '#99AAB5' }}
                              />
                              <span>{role.name}</span>
                            </div>
                          )}
                          renderSelected={(role) => role ? role.name : ''}
                        />
                      </div>
                    </div>

                    {/* Etiqueta opcional */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Descripción (opcional)</label>
                      <input 
                        value={opt.label} 
                        onChange={e => updateOption(idx, 'label', e.target.value)} 
                        placeholder="Descripción breve del rol"
                        maxLength={100}
                        className="w-full px-3 py-2 bg-gray-700 border border-gray-600 text-white rounded focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm cursor-text" 
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botones de acción */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-700">
            <button
              onClick={cancelEdit}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-medium transition-colors cursor-pointer"
            >
              Cancelar
            </button>
            <button
              onClick={save}
              disabled={!form.title || !form.channelId || form.options.length === 0 || saving}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center space-x-2 cursor-pointer"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Save className="w-5 h-5" />
                  <span>{editing ? 'Actualizar' : 'Crear'} Menú</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Lista de menús con GRID */
        <div>
          {menus.length === 0 ? (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-12 text-center">
              <Shield className="w-20 h-20 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-white mb-2">No hay menús creados</h3>
              <p className="text-gray-400 mb-6">Crea tu primer menú de roles para empezar</p>
              <button 
                onClick={startNew} 
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors inline-flex items-center space-x-2 cursor-pointer"
              >
                <Plus className="w-5 h-5" />
                <span>Crear Primer Menú</span>
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {menus.map(m => (
                <div key={m._id} className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6 hover:border-indigo-500/50 transition-all flex flex-col">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2 flex-wrap gap-1">
                        <h3 className="text-lg font-bold text-white truncate">{m.title}</h3>
                        {m.exclusive && (
                          <span className="px-2 py-1 bg-purple-500/20 text-purple-300 text-xs font-medium rounded border border-purple-500/50 whitespace-nowrap">
                            EXCLUSIVO
                          </span>
                        )}
                        {m.published && (
                          <span className="px-2 py-1 bg-green-500/20 text-green-300 text-xs font-medium rounded border border-green-500/50 whitespace-nowrap">
                            PUBLICADO
                          </span>
                        )}
                      </div>
                      <div className="flex flex-col space-y-1 text-sm text-gray-400">
                        <div className="flex items-center space-x-1">
                          <Hash className="w-4 h-4 flex-shrink-0" />
                          <span className="truncate">{getChannelName(m.channelId)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Shield className="w-4 h-4 flex-shrink-0" />
                          <span>{m.options?.length || 0} roles</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Preview de opciones */}
                  {m.options && m.options.length > 0 && (
                    <div className="bg-gray-700/30 rounded-lg p-3 space-y-2 mb-4 flex-1">
                      <p className="text-xs font-medium text-gray-400 mb-2">Vista previa:</p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {m.options.map((opt, idx) => {
                          const emojiDisplay = getEmojiDisplay(opt.emojiIdentifier);
                          const isCustom = isCustomEmoji(opt.emojiIdentifier);
                          
                          return (
                            <div key={idx} className="flex items-center space-x-2 text-sm">
                              {isCustom ? (
                                <img 
                                  src={emojiDisplay} 
                                  alt="emoji" 
                                  className="w-5 h-5 flex-shrink-0" 
                                />
                              ) : (
                                <span className="text-lg flex-shrink-0">{emojiDisplay}</span>
                              )}
                              <span className="text-gray-400 flex-shrink-0">—</span>
                              <span className="text-indigo-400 font-medium truncate">@{getRoleName(opt.roleId)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Botones de acción */}
                  <div className="flex items-center justify-end space-x-2 pt-3 border-t border-gray-700/50">
                    {!m.published && (
                      <button 
                        onClick={() => publish(m)} 
                        disabled={publishing === m._id}
                        className="px-3 py-2 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 text-white rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer disabled:cursor-not-allowed text-sm"
                        title="Publicar menú en el canal"
                      >
                        {publishing === m._id ? (
                          <>
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Publicando...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4" />
                            <span>Publicar</span>
                          </>
                        )}
                      </button>
                    )}
                    <button 
                      onClick={() => edit(m)} 
                      className="p-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded-lg transition-colors cursor-pointer"
                      title="Editar menú"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => setPendingDelete(m._id)} 
                      className="p-2 bg-red-600 hover:bg-red-500 text-white rounded-lg transition-colors cursor-pointer"
                      title="Eliminar menú"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default RoleMenus;