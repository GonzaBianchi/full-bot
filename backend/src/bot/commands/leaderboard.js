import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import User from '../../models/User.js';
import logger from '../../utils/logger.js';

const PAGE_SIZE = 10;
const MEDALS = ['🥇', '🥈', '🥉'];

async function buildPage(guildId, page, guild) {
  const total = await User.countDocuments({ guildId, totalXp: { $gt: 0 } });
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const p = Math.min(Math.max(1, page), totalPages);

  const users = await User.find({ guildId, totalXp: { $gt: 0 } })
    .sort({ totalXp: -1 })
    .skip((p - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .lean();

  const startRank = (p - 1) * PAGE_SIZE + 1;
  const lines = users.map((u, i) => {
    const rank = startRank + i;
    const prefix = rank <= 3 ? MEDALS[rank - 1] : `**#${rank}**`;
    const name = u.username ? u.username : `<@${u.userId}>`;
    return `${prefix} ${name} — Nivel **${u.level}** · ${u.totalXp.toLocaleString()} XP`;
  });

  const embed = new EmbedBuilder()
    .setTitle(`🏆 Leaderboard — ${guild.name}`)
    .setDescription(lines.length > 0 ? lines.join('\n') : 'No hay usuarios con XP registrado.')
    .setColor(0x5865F2)
    .setFooter({ text: `Página ${p}/${totalPages} • ${total} usuarios en total` })
    .setTimestamp();

  const icon = guild.iconURL({ dynamic: true });
  if (icon) embed.setThumbnail(icon);

  const frontend = process.env.FRONTEND_URL?.replace(/\/$/, '') || 'http://localhost:3000';
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('lb_prev')
      .setLabel('◀ Anterior')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(p <= 1),
    new ButtonBuilder()
      .setLabel('Ver en web')
      .setStyle(ButtonStyle.Link)
      .setURL(`${frontend}/guild/${guildId}/leaderboard`),
    new ButtonBuilder()
      .setCustomId('lb_next')
      .setLabel('Siguiente ▶')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(p >= totalPages)
  );

  return { embed, row, page: p, totalPages };
}

export default {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Muestra el ranking de XP del servidor')
    .addIntegerOption(opt =>
      opt.setName('pagina').setDescription('Página').setMinValue(1).setRequired(false)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();
      const guildId = interaction.guild.id;
      let currentPage = interaction.options.getInteger('pagina') || 1;

      const { embed, row, totalPages } = await buildPage(guildId, currentPage, interaction.guild);
      const msg = await interaction.editReply({ embeds: [embed], components: [row] });

      if (totalPages <= 1) return;

      const collector = msg.createMessageComponentCollector({ time: 2 * 60 * 1000 });

      collector.on('collect', async (btn) => {
        try {
          await btn.deferUpdate();
          if (btn.customId === 'lb_prev') currentPage = Math.max(1, currentPage - 1);
          else if (btn.customId === 'lb_next') currentPage = Math.min(totalPages, currentPage + 1);
          const { embed: newEmbed, row: newRow } = await buildPage(guildId, currentPage, interaction.guild);
          await interaction.editReply({ embeds: [newEmbed], components: [newRow] });
        } catch (e) {
          logger.warn('Error paginando leaderboard:', e.message);
        }
      });

      collector.on('end', async () => {
        try {
          const { embed: finalEmbed } = await buildPage(guildId, currentPage, interaction.guild);
          const frontend = process.env.FRONTEND_URL?.replace(/\/$/, '') || 'http://localhost:3000';
          const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('lb_prev').setLabel('◀ Anterior').setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setLabel('Ver en web').setStyle(ButtonStyle.Link).setURL(`${frontend}/guild/${guildId}/leaderboard`),
            new ButtonBuilder().setCustomId('lb_next').setLabel('Siguiente ▶').setStyle(ButtonStyle.Secondary).setDisabled(true)
          );
          await interaction.editReply({ embeds: [finalEmbed], components: [disabledRow] });
        } catch (_) {}
      });

    } catch (error) {
      logger.error('Error en comando leaderboard:', error);
      try {
        await interaction.editReply({ content: '❌ Error al cargar el leaderboard.', embeds: [], components: [] });
      } catch (_) {}
    }
  }
};
