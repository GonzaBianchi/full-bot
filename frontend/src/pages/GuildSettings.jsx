import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { guildService } from '../services/api';

function GuildSettings() {
  const { guildId } = useParams();
  const [config, setConfig] = useState(null);
  const [channels, setChannels] = useState([]);
  const [roles, setRoles] = useState([]);
  const [multiplier, setMultiplier] = useState(1);
  const [ignored, setIgnored] = useState([]);
  const [levelUpMsg, setLevelUpMsg] = useState('');
  const [levelUpEnabled, setLevelUpEnabled] = useState(true);
  const [levelUpChannel, setLevelUpChannel] = useState(null);

  useEffect(() => {
    load();
  }, [guildId]);

  const load = async () => {
    try {
      const [cfgRes, resResources] = await Promise.all([
        guildService.getConfig(guildId),
        guildService.getResources(guildId)
      ]);
      setConfig(cfgRes.data.config);
      setMultiplier(cfgRes.data.config.xpMultiplier || 1);
      setIgnored(cfgRes.data.config.ignoredChannels || []);
      setLevelUpMsg(cfgRes.data.config.levelUpMessage || '');
      setLevelUpEnabled(cfgRes.data.config.levelUpEnabled);
      setLevelUpChannel(cfgRes.data.config.levelUpChannelId);
      setChannels(resResources.data.channels || []);
      setRoles(resResources.data.roles || []);
    } catch (e) {
      console.error('Error cargando config:', e);
    }
  };

  const saveMultiplier = async () => {
    try {
      await guildService.updateMultiplier(guildId, parseFloat(multiplier));
      alert('Multiplicador guardado');
    } catch (e) {
      console.error('Error guardando multiplier:', e);
      alert('Error');
    }
  };

  const saveIgnored = async () => {
    try {
      await guildService.updateIgnoredChannels(guildId, ignored);
      alert('Canales guardados');
    } catch (e) {
      console.error('Error guardando ignored:', e);
      alert('Error');
    }
  };

  const saveLevelUp = async () => {
    try {
      await guildService.updateLevelUp(guildId, { enabled: levelUpEnabled, channelId: levelUpChannel, message: levelUpMsg });
      alert('Notificación de leveo guardada');
    } catch (e) {
      console.error('Error guardando levelup:', e);
      alert('Error');
    }
  };

  const saveRoles = async () => {
    try {
      // roles debe ser array de objetos {level, roleId}
      const rolesPayload = JSON.parse(prompt('Ingresa roles como JSON array de {level, roleId}'));
      await guildService.updateLevelRoles(guildId, rolesPayload);
      alert('Roles guardados');
    } catch (e) {
      console.error('Error guardando roles:', e);
      alert('Error');
    }
  };

  if (!config) return <div>Cargando...</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-4">Configuración del servidor</h2>

      <div className="mb-4">
        <label className="block text-sm text-discord-lightgray">Multiplicador de XP</label>
        <select value={multiplier} onChange={e => setMultiplier(e.target.value)} className="mt-2 p-2 rounded bg-discord-dark text-white">
          {[0.25,0.5,0.75,1,2,4,6,8].map(v => (
            <option key={v} value={v}>{v}x</option>
          ))}
        </select>
        <button onClick={saveMultiplier} className="ml-4 px-3 py-2 bg-discord-blurple text-white rounded">Guardar</button>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-discord-lightgray">Canales ignorados</label>
        <select multiple value={ignored} onChange={e => setIgnored(Array.from(e.target.selectedOptions, o => o.value))} className="mt-2 p-2 rounded bg-discord-dark text-white w-full">
          {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <button onClick={saveIgnored} className="ml-4 mt-2 px-3 py-2 bg-discord-blurple text-white rounded">Guardar</button>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-discord-lightgray">Notificación de leveo</label>
        <div className="mt-2">
          <input type="checkbox" checked={levelUpEnabled} onChange={e => setLevelUpEnabled(e.target.checked)} /> Habilitar
        </div>
        <div className="mt-2">
          <label className="text-sm text-discord-lightgray">Canal</label>
          <select value={levelUpChannel || ''} onChange={e => setLevelUpChannel(e.target.value)} className="mt-2 p-2 rounded bg-discord-dark text-white">
            <option value="">Usar mismo canal</option>
            {channels.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="mt-2">
          <label className="text-sm text-discord-lightgray">Plantilla de mensaje</label>
          <input value={levelUpMsg} onChange={e => setLevelUpMsg(e.target.value)} className="mt-2 p-2 rounded bg-discord-dark text-white w-full" />
        </div>
        <button onClick={saveLevelUp} className="mt-3 px-3 py-2 bg-discord-blurple text-white rounded">Guardar</button>
      </div>

      <div className="mb-4">
        <label className="block text-sm text-discord-lightgray">Roles por nivel</label>
        <div className="mt-2">
          <button onClick={saveRoles} className="px-3 py-2 bg-discord-blurple text-white rounded">Editar Roles (JSON)</button>
        </div>
      </div>
    </div>
  );
}

export default GuildSettings;
