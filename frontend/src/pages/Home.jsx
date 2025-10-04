import { useEffect, useState } from 'react';
import { guildService } from '../services/api';

function Home() {
  const [botInfo, setBotInfo] = useState(null);
  const [available, setAvailable] = useState({ manageable: [], invitables: [] });
  const [user, setUser] = useState(null);

  useEffect(() => {
    load();
    fetch('/api/auth/me', { credentials: 'include' }).then(r => r.ok ? r.json() : null).then(u => setUser(u)).catch(() => setUser(null));
  }, []);

  const load = async () => {
    try {
      const [botRes, availRes] = await Promise.all([
        fetch('/api/guilds/bot/info', { credentials: 'include' }).then(r => r.ok ? r.json() : null),
        fetch('/api/guilds/available', { credentials: 'include' }).then(r => r.ok ? r.json() : { manageable: [], invitables: [] })
      ]);
      setBotInfo(botRes);
      setAvailable(availRes || { manageable: [], invitables: [] });
    } catch (e) {
      console.error(e);
    }
  };

  const inviteUrlFor = (clientId, guildId) => {
    const perms = 8 | 1024 | 2048 | 268435456; // admin + manage roles, manage channels, send messages? keep safe
    return `https://discord.com/oauth2/authorize?client_id=${clientId}&permissions=${perms}&scope=bot%20applications.commands&guild_id=${guildId}`;
  };

  // Use VITE_API_URL when set; fallback to backend on Render so login goes to the API service
  const API_BASE = import.meta.env.VITE_API_URL || 'https://therifthavenfullbot.onrender.com';
  const oauthLoginFor = (redirect) => `${API_BASE.replace(/\/$/, '')}/api/auth/login?redirect=${encodeURIComponent(redirect)}`;

  return (
    <div className="p-6">
      <div className="mb-6">
        {botInfo ? (
          <div className="flex items-center space-x-4">
            <img src={botInfo.avatarURL} alt="bot" className="w-16 h-16 rounded-full" />
            <div>
              <h1 className="text-2xl text-white font-bold">{botInfo.username}</h1>
              <p className="text-discord-lightgray">Invita al bot a tu servidor o ve a la configuración.</p>
            </div>
          </div>
        ) : (
          <div className="text-white">Bot no conectado</div>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-xl text-white font-semibold">Invitables</h2>
        {available.invitables.length === 0 ? (
          <p className="text-discord-lightgray">No hay servidores donde puedas invitar el bot (o no estás autenticado).</p>
        ) : (
          <ul>
            {available.invitables.map(g => (
              <li key={g.id} className="mt-2">
                {user ? (
                  <a href={inviteUrlFor(import.meta.env.VITE_DISCORD_CLIENT_ID, g.id)} className="px-3 py-2 bg-discord-blurple rounded text-white">Invitar a {g.name}</a>
                ) : (
                  <a href={oauthLoginFor(`/`)} className="px-3 py-2 bg-discord-blurple rounded text-white">Inicia sesión para invitar</a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="text-xl text-white font-semibold">Servidores gestionables</h2>
        {available.manageable.length === 0 ? (
          <p className="text-discord-lightgray">No estás administrando ningún servidor con el bot presente.</p>
        ) : (
          <ul>
            {available.manageable.map(g => (
              <li key={g.id} className="mt-2">
                {user ? (
                  <a href={`/guild/${g.id}`} className="px-3 py-2 bg-discord-gray rounded text-white">Ir al panel de {g.name}</a>
                ) : (
                  <a href={oauthLoginFor(`/guild/${g.id}`)} className="px-3 py-2 bg-discord-gray rounded text-white">Inicia sesión para ir al panel</a>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default Home;
