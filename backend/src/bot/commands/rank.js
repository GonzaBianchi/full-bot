import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import User from '../../models/User.js';
import { xpForLevel } from '../utils/levelSystem.js';

export default {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Muestra tu nivel y progreso (o el de otro usuario)')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a consultar').setRequired(false)),

  async execute(interaction) {
    try {
      const target = interaction.options.getUser('usuario') || interaction.user;
      const guildId = interaction.guild?.id;
      if (!guildId) return interaction.reply({ content: 'Este comando solo puede usarse en servidores.', ephemeral: true });

      const userDoc = await User.findOne({ guildId, userId: target.id });
      if (!userDoc) return interaction.reply({ content: 'No se encontró información de nivel para este usuario.', ephemeral: true });

      const progress = typeof userDoc.getXpProgress === 'function' ? userDoc.getXpProgress() : { xp: 0, xpForNextLevel: 0, percent: 0 };
      const rank = typeof userDoc.getRank === 'function' ? await userDoc.getRank() : undefined;

      const embed = new EmbedBuilder()
        .setTitle(`Nivel de ${target.username}`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
          { name: 'Nivel', value: String(userDoc.level), inline: true },
          { name: 'Rank', value: rank ? `#${rank}` : '—', inline: true },
          { name: 'XP Total', value: String(userDoc.totalXp.toLocaleString()), inline: true },
          { name: 'Mensajes', value: String(userDoc.messageCount || 0), inline: true },
          { name: 'Progreso', value: `${progress.xp} / ${progress.xpForNextLevel} (${progress.percent}%)`, inline: false }
        )
        .setColor(0x5865f2)
        .setTimestamp();

      await interaction.reply({ embeds: [embed], ephemeral: false });
    } catch (e) {
      console.error('Error en comando /rank:', e);
      await interaction.reply({ content: 'Error al obtener el rank.', ephemeral: true });
    }
  }
};
