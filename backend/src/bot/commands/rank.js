import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import User from '../../models/User.js';
import { xpForLevel } from '../utils/levelSystem.js';

export default {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Muestra tu nivel y progreso (o el de otro usuario)')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a consultar').setRequired(false)),

  async execute(interaction) {
    // Defer reply to avoid timeout while fetching data
    await interaction.deferReply({ ephemeral: false }).catch(() => {});
    try {
      const target = interaction.options.getUser('usuario') || interaction.user;
      const guildId = interaction.guild?.id;
      if (!guildId) return interaction.editReply({ content: 'Este comando solo puede usarse en servidores.', ephemeral: true });

      const userDoc = await User.findOne({ guildId, userId: target.id });
      if (!userDoc) return interaction.editReply({ content: 'No se encontró información de nivel para este usuario.', ephemeral: true });

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

      await interaction.editReply({ embeds: [embed] });
    } catch (e) {
      console.error('Error en comando /rank:', e);
      try {
        // If deferred, edit the reply, otherwise fallback to reply
        await interaction.editReply({ content: 'Error al obtener el rank.', ephemeral: true });
      } catch (_) {
        try { await interaction.reply({ content: 'Error al obtener el rank.', ephemeral: true }); } catch(_){}
      }
    }
  }
};
