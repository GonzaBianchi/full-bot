import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('userhelp')
    .setDescription('Muestra los comandos disponibles para usuarios'),

  async execute(interaction) {
    try {
      // Comandos públicos
      const userCommands = [
        {
          name: '/rank',
          description: 'Muestra tu tarjeta de nivel y progreso',
          usage: '/rank [@usuario]'
        },
        {
          name: '/leaderboard',
          description: 'Muestra el ranking de usuarios del servidor',
          usage: '/leaderboard [página]'
        },
        {
          name: '/logros',
          description: 'Muestra tus logros desbloqueados y progreso',
          usage: '/logros [@usuario]'
        },
        {
          name: '/botinfo',
          description: 'Información sobre el bot (estadísticas, enlaces)',
          usage: '/botinfo'
        },
        {
          name: '/userhelp',
          description: 'Muestra este mensaje de ayuda',
          usage: '/userhelp'
        }
      ];

      const embed = new EmbedBuilder()
        .setTitle('📚 Comandos para Usuarios')
        .setColor(0x5865F2)
        .setDescription('Lista de comandos disponibles para todos los usuarios del servidor.');

      // Agregar comandos de usuario
      let userCommandsText = '';
      userCommands.forEach(cmd => {
        userCommandsText += `**${cmd.name}**\n${cmd.description}\n\`${cmd.usage}\`\n\n`;
      });

      embed.addFields({
        name: '👤 Comandos Disponibles',
        value: userCommandsText,
        inline: false
      });

      // Panel web
      embed.addFields({
        name: '🌐 Panel Web',
        value: `Configura el bot desde el [Panel Web](${process.env.FRONTEND_URL || 'https://therifthavenfull.vercel.app'})`,
        inline: false
      });

      embed.setFooter({ 
        text: 'Para ver comandos de administrador, usa /adminhelp' 
      });
      embed.setTimestamp();

      await interaction.reply({ embeds: [embed] });
      logger.info(`Comando userhelp ejecutado por ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Error en comando userhelp:', error);
      await interaction.reply({
        content: '❌ Hubo un error al mostrar la ayuda.',
        ephemeral: true
      });
    }
  }
};