import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { roleMenuService, guildService } from '../services/api';
import { Plus, Trash2, Edit, Check, Link } from 'lucide-react';
import toast from 'react-hot-toast';

function RoleMenus() {
  const { guildId } = useParams();
  const [menus, setMenus] = useState([]);
  const [resources, setResources] = useState({ channels: [], roles: [], emojis: [] });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', channelId: '', exclusive: false, options: [] });

  useEffect(() => { load(); }, [guildId]);

  const load = async () => {
    setLoading(true);
    try {
      const [resMenus, resResources] = await Promise.all([
        roleMenuService.list(guildId),
        guildService.getResources(guildId)
      ]);
      setMenus(resMenus.data.menus || []);
      setResources(resResources.data || { channels: [], roles: [], emojis: [] });
    } catch (e) {
      console.error('Error cargando role menus:', e);
      toast.error('Error cargando menus');
    } finally { setLoading(false); }
  };

  const startNew = () => {
    setEditing(null);
    setForm({ title: '', channelId: resources.channels?.[0]?.id || '', exclusive: false, options: [] });
  };

  const edit = (menu) => {
    setEditing(menu);
    setForm({ title: menu.title, channelId: menu.channelId, exclusive: menu.exclusive, options: menu.options });
  };

  const remove = async (id) => {
    if (!confirm('¿Eliminar este role menu?')) return;
    try {
      await roleMenuService.remove(guildId, id);
      toast.success('Menu eliminado');
      load();
    } catch (e) { console.error(e); toast.error('Error eliminando'); }
  };

  const save = async () => {
    try {
      if (editing) {
        await roleMenuService.update(guildId, editing._id, form);
        toast.success('Menu actualizado');
      } else {
        await roleMenuService.create(guildId, form);
        toast.success('Menu creado');
      }
      load();
    } catch (e) { console.error(e); toast.error('Error guardando menu'); }
  };

  const publish = async (id) => {
    try {
      await roleMenuService.publish(guildId, id);
      toast.success('Menu publicado');
      load();
    } catch (e) { console.error(e); toast.error('Error publicando'); }
  };

  const addOption = () => {
    setForm({ ...form, options: [...form.options, { emojiIdentifier: '', roleId: '', label: '' }] });
  };

  const updateOption = (index, field, value) => {
    const newOptions = [...form.options];
    newOptions[index][field] = value;
    setForm({ ...form, options: newOptions });
  };

  const removeOption = (index) => {
    const newOptions = [...form.options];
    newOptions.splice(index, 1);
    setForm({ ...form, options: newOptions });
  };

  if (loading) return <div>Cargando menus...</div>;

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700/50 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Role Menus</h3>
        <div>
          <button onClick={startNew} className="px-4 py-2 bg-indigo-600 text-white rounded-lg mr-2">Nuevo</button>
          <button onClick={load} className="px-4 py-2 bg-gray-700 text-white rounded-lg">Refrescar</button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-gray-200 mb-2">Menus existentes</h4>
          <div className="space-y-3">
            {menus.map(m => (
              <div key={m._id} className="bg-gray-800 p-4 rounded-lg border border-gray-700 flex items-center justify-between">
                <div>
                  <div className="text-white font-semibold">{m.title}</div>
                  <div className="text-gray-400 text-sm">Canal: {resources.channels.find(c => c.id === m.channelId)?.name || m.channelId}</div>
                  <div className="text-gray-400 text-sm">Opciones: {m.options?.length || 0}</div>
                </div>
                <div className="flex items-center space-x-2">
                  <button onClick={() => edit(m)} className="px-3 py-2 bg-yellow-600 rounded text-white"><Edit className="w-4 h-4"/></button>
                  <button onClick={() => publish(m._id)} className="px-3 py-2 bg-green-600 rounded text-white"><Link className="w-4 h-4"/></button>
                  <button onClick={() => remove(m._id)} className="px-3 py-2 bg-red-600 rounded text-white"><Trash2 className="w-4 h-4"/></button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-200 mb-2">Editor</h4>
          <div className="bg-gray-800 p-4 rounded-lg border border-gray-700 space-y-3">
            <div>
              <label className="text-sm text-gray-300">Título</label>
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} className="w-full mt-1 px-3 py-2 rounded bg-gray-700 text-white" />
            </div>

            <div>
              <label className="text-sm text-gray-300">Canal</label>
              <select value={form.channelId} onChange={e => setForm({...form, channelId: e.target.value})} className="w-full mt-1 px-3 py-2 rounded bg-gray-700 text-white">
                {resources.channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            <div className="flex items-center space-x-2">
              <input type="checkbox" checked={form.exclusive} onChange={e => setForm({...form, exclusive: e.target.checked})} />
              <label className="text-sm text-gray-300">Exclusivo (solo 1 rol por menu)</label>
            </div>

            <div>
              <label className="text-sm text-gray-300">Opciones</label>
              <div className="space-y-2 mt-2">
                {form.options.map((opt, idx) => (
                  <div key={idx} className="flex items-center space-x-2">
                    <select value={opt.emojiIdentifier} onChange={e => updateOption(idx, 'emojiIdentifier', e.target.value)} className="px-3 py-2 bg-gray-700 text-white rounded">
                      <option value="">Seleccionar emoji...</option>
                      {resources.emojis.map(em => (
                        <option key={em.id || em.identifier} value={em.identifier}>{em.name} {em.animated ? '(anim)' : ''} - {em.identifier}</option>
                      ))}
                    </select>
                    <select value={opt.roleId} onChange={e => updateOption(idx, 'roleId', e.target.value)} className="px-3 py-2 bg-gray-700 text-white rounded">
                      <option value="">Seleccionar rol...</option>
                      {resources.roles.map(r => (<option key={r.id} value={r.id}>{r.name}</option>))}
                    </select>
                    <input value={opt.label} onChange={e => updateOption(idx, 'label', e.target.value)} placeholder="Etiqueta (opcional)" className="px-3 py-2 bg-gray-700 text-white rounded" />
                    <button onClick={() => removeOption(idx)} className="px-3 py-2 bg-red-600 text-white rounded"><Trash2 className="w-4 h-4"/></button>
                  </div>
                ))}

                <div>
                  <button onClick={addOption} className="px-4 py-2 bg-indigo-600 text-white rounded"><Plus className="w-4 h-4"/> Agregar opción</button>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2">
              <button onClick={save} className="px-4 py-2 bg-green-600 text-white rounded">Guardar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default RoleMenus;
