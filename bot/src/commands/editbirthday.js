import { SlashCommandBuilder } from 'discord.js';
import Birthday from '../models/Birthday.js';

export default {
  data: new SlashCommandBuilder()
    .setName('editbirthday')
    .setDescription('Edita tu cumpleaños (día y mes)')
    .addIntegerOption(option =>
      option.setName('dia')
        .setDescription('Nuevo día de cumpleaños (1-31)')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('mes')
        .setDescription('Nuevo mes de cumpleaños (1-12)')
        .setRequired(true)),
  async execute(interaction) {
    const prodServer = '752883098059800647';
    const prodChannel = '1269848036545134654';
    if (
      (interaction.guildId === prodServer && interaction.channelId !== prodChannel)
    ) {
      return interaction.reply({ content: 'Este comando solo se puede usar en el canal autorizado.', flags: 64 });
    }
    const dia = interaction.options.getInteger('dia');
    const mes = interaction.options.getInteger('mes');
    if (!dia || !mes || dia < 1 || dia > 31 || mes < 1 || mes > 12) {
      return interaction.reply({ content: 'Día o mes inválido. Día: 1-31, Mes: 1-12.', flags: 64 });
    }
    const fecha = `${dia.toString().padStart(2, '0')}-${mes.toString().padStart(2, '0')}`;
    await interaction.deferReply();
    try {
      const existing = await Birthday.findOne({ userId: interaction.user.id, guildId: interaction.guildId });
      if (!existing) {
        return interaction.editReply({ content: 'No tenías cumpleaños seteado. Usa /setbirthday primero.' });
      }
      await Birthday.findOneAndUpdate(
        { userId: interaction.user.id, guildId: interaction.guildId },
        { birthday: fecha }
      );
      return interaction.editReply({ content: `¡Cumpleaños actualizado a ${fecha}!` });
    } catch (err) {
      console.error('Error en editbirthday:', err);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: 'Ocurrió un error al editar tu cumpleaños. Intenta de nuevo más tarde.' });
      } else {
        await interaction.reply({ content: 'Ocurrió un error al editar tu cumpleaños. Intenta de nuevo más tarde.' });
      }
    }
  }
};
