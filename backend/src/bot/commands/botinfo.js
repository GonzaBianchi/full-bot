import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Muestra información sobre el bot'),

  async execute(interaction) {
    try {
      const client = interaction.client;
      const bot = client.user;
      const developerId = '220625834627694592';

      // Calcular estadísticas
      const guildCount = client.guilds.cache.size;
      const userCount = client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0);
      const channelCount = client.channels.cache.size;
      
      // Calcular uptime
      const uptime = process.uptime();
      const days = Math.floor(uptime / 86400);
      const hours = Math.floor((uptime % 86400) / 3600);
      const minutes = Math.floor((uptime % 3600) / 60);
      const uptimeStr = `${days}d ${hours}h ${minutes}m`;

      // Memoria
      const memoryUsage = process.memoryUsage();
      const memoryMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);

      const embed = new EmbedBuilder()
        .setTitle('🤖 Información del Bot')
        .setDescription('Bot de niveles, logros y gestión de roles para Discord')
        .setColor(0x5865F2)
        .setThumbnail(bot.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
          {
            name: '📊 Estadísticas',
            value: `**Servidores:** ${guildCount.toLocaleString()}\n` +
                   `**Usuarios:** ${userCount.toLocaleString()}\n` +
                   `**Canales:** ${channelCount.toLocaleString()}`,
            inline: true
          },
          {
            name: '⚙️ Sistema',
            value: `**Uptime:** ${uptimeStr}\n` +
                   `**Memoria:** ${memoryMB} MB\n` +
                   `**Node.js:** ${process.version}`,
            inline: true
          },
          {
            name: '🔗 Enlaces',
            value: `[Panel Web](${process.env.FRONTEND_URL || 'https://therifthavenfull.vercel.app'})\n` +
                   `[Desarrollador](<@${developerId}>)\n` +
                   `[Invitar Bot](https://discord.com/api/oauth2/authorize?client_id=${bot.id}&permissions=8&scope=bot%20applications.commands)`,
            inline: false
          },
          {
            name: '✨ Características',
            value: '• Sistema de niveles y XP\n' +
                   '• Logros personalizables\n' +
                   '• Auto-roles y role menus\n' +
                   '• Leaderboards en tiempo real\n' +
                   '• Panel web de configuración',
            inline: false
          }
        )
        .setFooter({ 
          text: `Versión 1.0.0 • Hecho con ❤️`,
          iconURL: bot.displayAvatarURL()
        })
        .setTimestamp();

      await interaction.reply({ 
        embeds: [embed],
        allowedMentions: { parse: ['users'] }
      });
      logger.info(`Comando botinfo ejecutado por ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Error en comando botinfo:', error);
      await interaction.reply({
        content: '❌ Hubo un error al obtener la información del bot.',
        ephemeral: true
      });
    }
  }
};