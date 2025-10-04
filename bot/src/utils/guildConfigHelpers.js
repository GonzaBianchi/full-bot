import GuildConfig from '../models/GuildConfig.js';

export async function getWelcomeChannelId(guildId) {
  const config = await GuildConfig.findOne({ guildId });
  return config?.welcomeChannelId;
}

export async function getLogChannelId(guildId, type = 'general') {
  const config = await GuildConfig.findOne({ guildId });
  // Puedes tener diferentes tipos de logs: 'ban', 'mute', 'role', etc.
  switch (type) {
    case 'ban':
      return config?.banLogChannelId || config?.logChannelId;
    case 'mute':
      return config?.muteLogChannelId || config?.logChannelId;
    case 'role':
      return config?.roleLogChannelId || config?.logChannelId;
    default:
      return config?.logChannelId;
  }
}
