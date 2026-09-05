import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import { dashboardUrl } from '../../utils/urls.js';
import { describeCommands, commandFields } from '../../utils/commandHelp.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('userhelp')
    .setDescription('Muestra los comandos disponibles para usuarios'),

  async execute(interaction) {
    try {
      // Generado desde el registro de comandos: la lista a mano se había
      // quedado desactualizada.
      const commands = describeCommands({ adminOnly: false });

      const embed = new EmbedBuilder()
        .setTitle('📚 Comandos para Usuarios')
        .setColor(0x5865F2)
        .setDescription('Lista de comandos disponibles para todos los usuarios del servidor.')
        .addFields(...commandFields(commands, '👤 Comandos Disponibles'))
        .addFields({
          name: '🌐 Panel Web',
          value: `Configura el bot desde el [Panel Web](${dashboardUrl()})`,
          inline: false
        })
        .setFooter({ text: 'Para ver comandos de administrador, usa /adminhelp' })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });
      logger.info(`Comando userhelp ejecutado por ${interaction.user.tag}`);
    } catch (error) {
      logger.error('Error en comando userhelp:', error);
      await interaction.reply({
        content: '❌ Hubo un error al mostrar la ayuda.',
        flags: MessageFlags.Ephemeral
      }).catch(() => {});
    }
  }
};
