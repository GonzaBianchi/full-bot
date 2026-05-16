import { Events, ActivityType } from 'discord.js';
import Guild from '../../models/Guild.js';
import logger from '../../utils/logger.js';

export default {
  name: Events.GuildCreate,
  async execute(guild, client) {
    logger.info(`📥 Bot añadido al servidor: ${guild.name} (${guild.id})`);

    try {
      // Crear configuración del servidor si no existe
      let guildConfig = await Guild.findOne({ guildId: guild.id });

      if (!guildConfig) {
        guildConfig = await Guild.create({
          guildId: guild.id,
          name: guild.name,
          icon: guild.iconURL(),
          ownerId: guild.ownerId,
        });

        logger.info(`✅ Configuración creada para ${guild.name}`);
      } else {
        // Actualizar información del servidor
        guildConfig.name = guild.name;
        guildConfig.icon = guild.iconURL();
        guildConfig.ownerId = guild.ownerId;
        await guildConfig.save();
      }

      // Intentar enviar mensaje de bienvenida
      try {
        const systemChannel = guild.systemChannel;
        if (systemChannel && systemChannel.permissionsFor(guild.members.me).has('SendMessages')) {
          await systemChannel.send({
            content: `¡Hola! 👋 Gracias por añadirme a **${guild.name}**\n\n` +
              `🎮 Usa \`/rank\` para ver tu nivel y XP\n` +
              `📊 Usa \`/leaderboard\` para ver el ranking del servidor\n` +
              `⚙️ Los administradores pueden configurar el bot desde el dashboard\n\n` +
              `Dashboard: ${process.env.FRONTEND_URL || 'https://tuapp.com'}`
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