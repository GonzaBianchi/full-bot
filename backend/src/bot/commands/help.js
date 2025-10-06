import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('help')
    .setDescription('Muestra la lista de comandos disponibles')
    .addBooleanOption(option =>
      option
        .setName('admin')
        .setDescription('Mostrar también comandos de administrador')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const showAdmin = interaction.options.getBoolean('admin') || false;
      const isAdmin = interaction.memberPermissions?.has('ManageGuild');

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
          name: '/help',
          description: 'Muestra este mensaje de ayuda',
          usage: '/help [admin:true]'
        }
      ];

      // Comandos de administrador
      const adminCommands = [
        {
          name: '/serverconfig',
          description: 'Ver la configuración actual del servidor',
          usage: '/serverconfig'
        },
        {
          name: '/adminsetlevel',
          description: 'Establecer el nivel de un usuario',
          usage: '/adminsetlevel @usuario <nivel>'
        },
        {
          name: '/sumarxp',
          description: 'Añadir XP a un usuario',
          usage: '/sumarxp @usuario <cantidad>'
        },
        {
          name: '/restarxp',
          description: 'Quitar XP a un usuario',
          usage: '/restarxp @usuario <cantidad>'
        },
        {
          name: '/testlogro',
          description: 'Probar una notificación de logro',
          usage: '/testlogro <logro> [tier] [@usuario] [#canal]'
        }
      ];

      const embed = new EmbedBuilder()
        .setTitle('📚 Comandos Disponibles')
        .setColor(0x5865F2)
        .setDescription('Lista de comandos del bot. Usa `/help admin:true` para ver comandos de administrador.');

      // Agregar comandos de usuario
      let userCommandsText = '';
      userCommands.forEach(cmd => {
        userCommandsText += `**${cmd.name}**\n${cmd.description}\n\`${cmd.usage}\`\n\n`;
      });

      embed.addFields({
        name: '👤 Comandos de Usuario',
        value: userCommandsText,
        inline: false
      });

      // Agregar comandos de admin si se solicita y el usuario es admin
      if (showAdmin && isAdmin) {
        let adminCommandsText = '';
        adminCommands.forEach(cmd => {
          adminCommandsText += `**${cmd.name}**\n${cmd.description}\n\`${cmd.usage}\`\n\n`;
        });

        embed.addFields({
          name: '⚙️ Comandos de Administrador',
          value: adminCommandsText,
          inline: false
        });
      } else if (showAdmin && !isAdmin) {
        embed.setFooter({ 
          text: '⚠️ No tienes permisos para ver comandos de administrador' 
        });
      }

      // Panel web
      embed.addFields({
        name: '🌐 Panel Web',
        value: `Configura el bot desde el [Panel Web](${process.env.FRONTEND_URL || 'https://therifthavenfull.vercel.app'})`,
        inline: false
      });

      embed.setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: true });
      logger.info(`Comando help ejecutado por ${interaction.user.tag} (admin: ${showAdmin})`);
    } catch (error) {
      logger.error('Error en comando help:', error);
      await interaction.reply({
        content: '❌ Hubo un error al mostrar la ayuda.',
        ephemeral: true
      });
    }
  }
};