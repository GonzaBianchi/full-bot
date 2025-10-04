import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import Achievement from '../models/Achievement.js';

export default {
  data: new SlashCommandBuilder()
    .setName('resetlogros')
    .setDescription('Resetea todos los logros de todos los usuarios (solo admins)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    await interaction.deferReply();
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.editReply({ content: 'Solo administradores pueden usar este comando.' });
    }
    try {
      await Achievement.deleteMany({ guildId: interaction.guildId });
      return interaction.editReply({ content: 'Todos los logros han sido reseteados para este servidor.' });
    } catch (err) {
      console.error('Error en resetlogros:', err);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: 'Ocurrió un error al resetear los logros. Intenta de nuevo más tarde.' });
      } else {
        await interaction.reply({ content: 'Ocurrió un error al resetear los logros. Intenta de nuevo más tarde.' });
      }
    }
  }
};
