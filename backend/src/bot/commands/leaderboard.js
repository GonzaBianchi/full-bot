import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Obtén la URL pública del leaderboard del servidor')
    .addIntegerOption(option =>
      option
        .setName('pagina')
        .setDescription('Página del leaderboard')
        .setMinValue(1)
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const page = interaction.options.getInteger('pagina') || 1;
      const guildId = interaction.guild.id;
      const frontend = process.env.FRONTEND_URL || 'http://localhost:3000';
      const url = `${frontend.replace(/\/$/, '')}/guild/${guildId}/leaderboard?page=${page}`;

      await interaction.reply({ content: `🔗 Ver leaderboard público: ${url}`, ephemeral: false });
    } catch (error) {
      console.error('Error en comando leaderboard:', error);
      await interaction.reply({ content: '❌ Error al generar la URL del leaderboard.', ephemeral: true });
    }
  }
};