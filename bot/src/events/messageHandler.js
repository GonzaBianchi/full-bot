
import { Events } from 'discord.js';
import filterMedia from '../utils/mediaFilter.js';
import GuildConfig from '../models/GuildConfig.js';

export default (client) => {
  client.on(Events.MessageCreate, async (message) => {
    if (message.author.bot) return;

    // Obtener configuración dinámica de canales desde la base de datos
    const guildConfig = await GuildConfig.findOne({ guildId: message.guild?.id });
    const sourceChannels = guildConfig?.mediaSourceChannels || [];
    const targetChannelId = guildConfig?.mediaTargetChannelId;

    if (!sourceChannels.includes(message.channel.id)) return;

    if (filterMedia(message) && targetChannelId) {
      const targetChannel = await client.channels.fetch(targetChannelId);
      if (targetChannel) {
        // Solo mostrar el ID del usuario y debajo el contenido/link
        let content = `ID: ${message.author.id}`;
        if (message.content) content += `\n${message.content}`;
        await targetChannel.send({
          content,
          files: message.attachments.map(a => a.url)
        });
      }
    }
  });
};
