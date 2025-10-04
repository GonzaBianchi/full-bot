import { Events } from 'discord.js';
import { getLogChannelId } from '../utils/guildConfigHelpers.js';

export default (client) => {
  client.on(Events.GuildMemberRemove, async (member) => {
    const logChannelId = await getLogChannelId(member.guild.id, 'general');
    if (!logChannelId) return;
    const channel = member.guild.channels.cache.get(logChannelId);
    if (!channel) return;
    await channel.send(`👋 El usuario ${member.user?.tag || member.id} ha abandonado o fue expulsado del servidor.`);
  });
};
