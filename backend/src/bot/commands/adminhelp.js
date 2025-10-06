import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('adminhelp')
    .setDescription('Muestra todos los comandos disponibles (usuarios y administradores)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    try {
      const isAdmin = interaction.memberPermissions?.has('ManageGuild');

      if (!isAdmin) {
        return await interaction.reply({
          content: '❌ No tienes permisos para ver comandos de administrador. Usa `/userhelp` para ver comandos de usuario.',
          ephemeral: true
        });
      }

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
          description: 'Muestra comandos para usuarios',
          usage: '/userhelp'
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
        },
        {
          name: '/adminhelp',
          description: 'Muestra este mensaje (todos los comandos)',
          usage: '/adminhelp'
        }
      ];

      const embed = new EmbedBuilder()
        .setTitle('📚 Todos los Comandos del Bot')
        .setColor(0x5865F2)
        .setDescription('Lista completa de comandos disponibles en el servidor.');

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

      // Agregar comandos de admin
      let adminCommandsText = '';
      adminCommands.forEach(cmd => {
        adminCommandsText += `**${cmd.name}**\n${cmd.description}\n\`${cmd.usage}\`\n\n`;
      });

      embed.addFields({
        name: '⚙️ Comandos de Administrador',
        value: adminCommandsText,
        inline: false
      });

      // Panel web
      embed.addFields({
        name: '🌐 Panel Web',
        value: `Configura el bot desde el [Panel Web](${process.env.FRONTEND_URL || 'https://therifthavenfull.vercel.app'})`,
        inline: false
      });

      embed.setTimestamp();

      await interaction.reply({ embeds: [embed] });
      logger.info(`Comando adminhelp ejecutado por ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Error en comando adminhelp:', error);
      await interaction.reply({
        content: '❌ Hubo un error al mostrar la ayuda.',
        ephemeral: true
      });
    }
  }
};