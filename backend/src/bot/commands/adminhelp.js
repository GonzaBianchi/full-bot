import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { dashboardUrl } from '../../utils/urls.js';
import { describeCommands, commandFields } from '../../utils/commandHelp.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('adminhelp')
    .setDescription('Muestra todos los comandos disponibles (usuarios y administradores)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    try {
      // Ambas listas salen del registro de comandos, así que no pueden
      // desincronizarse de lo que el bot realmente expone.
      const userCommands = describeCommands({ adminOnly: false });
      const adminCommands = describeCommands({ adminOnly: true });

      const embed = new EmbedBuilder()
        .setTitle('🛠️ Comandos del Bot')
        .setColor(0xFAA61A)
        .setDescription('Todos los comandos disponibles en este servidor.')
        .addFields(...commandFields(userCommands, '👤 Comandos de Usuario'))
        .addFields(...commandFields(adminCommands, '🔧 Comandos de Administración'))
        .addFields({
          name: '🌐 Panel Web',
          value: `Configura el bot desde el [Panel Web](${dashboardUrl()})`,
          inline: false
        })
        .setFooter({ text: 'Los comandos de administración requieren el permiso Gestionar Servidor' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
      logger.info(`Comando adminhelp ejecutado por ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Error en comando adminhelp:', error);
      await interaction.reply({
        content: '❌ Hubo un error al mostrar la ayuda.',
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
    }
  }
};
