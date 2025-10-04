import { Events } from 'discord.js';
import { getLogChannelId } from '../utils/guildConfigHelpers.js';

export default (client) => {
  client.on(Events.GuildBanAdd, async (ban) => {
    const logChannelId = await getLogChannelId(ban.guild.id, 'ban');
    if (!logChannelId) return;
    const channel = ban.guild.channels.cache.get(logChannelId);
    if (!channel) return;
    await channel.send(`🔨 El usuario ${ban.user.tag} (${ban.user.id}) fue baneado del servidor.`);
  });
};
