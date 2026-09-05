import { Events, ActivityType } from 'discord.js';
import { dashboardUrl } from '../../utils/urls.js';
import Guild from '../../models/Guild.js';
import logger from '../../utils/logger.js';
import { invalidateGuildConfig } from '../../utils/guildConfigCache.js';

export default {
  name: Events.GuildCreate,
  async execute(guild, client) {
    logger.info(`📥 Bot añadido al servidor: ${guild.name} (${guild.id})`);

    try {
      // Un solo upsert atómico en vez de findOne + create/save.
      await Guild.updateOne(
        { guildId: guild.id },
        { $set: { name: guild.name, icon: guild.iconURL(), ownerId: guild.ownerId } },
        { upsert: true, setDefaultsOnInsert: true }
      );
      invalidateGuildConfig(guild.id);
      logger.info(`✅ Configuración lista para ${guild.name}`);

      // Intentar enviar mensaje de bienvenida
      try {
        const systemChannel = guild.systemChannel;
        if (systemChannel && systemChannel.permissionsFor(guild.members.me).has('SendMessages')) {
          await systemChannel.send({
            content: `¡Hola! 👋 Gracias por añadirme a **${guild.name}**\n\n` +
              `🎮 Usa \`/rank\` para ver tu nivel y XP\n` +
              `📊 Usa \`/leaderboard\` para ver el ranking del servidor\n` +
              `⚙️ Los administradores pueden configurar el bot desde el dashboard\n\n` +
              `Dashboard: ${dashboardUrl()}`
          });
        }
      } catch (err) {
        logger.info('No se pudo enviar mensaje de bienvenida');
      }

      // Actualizar el estado del bot
      client.user.setActivity(`/rank | ${client.guilds.cache.size} servidores`, { type: ActivityType.Playing });

    } catch (error) {
      logger.error('Error al procesar nuevo servidor:', error);
    }
  }
};