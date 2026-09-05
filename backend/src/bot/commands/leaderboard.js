import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import User from '../../models/User.js';
import logger from '../../utils/logger.js';

const PAGE_SIZE = 10;

const baseUrl = () => (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/[/]+$/, '');

const webUrl = (guildId) => `${baseUrl()}/guild/${guildId}/leaderboard`;

const MEDALS = ['🥇', '🥈', '🥉'];

async function buildPage(guildId, page, guild) {
  const filter = { guildId, totalXp: { $gt: 0 } };

  // countDocuments y find no dependen entre sí: iban en serie sin motivo.
  const [total, firstPageUsers] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter).sort({ totalXp: -1 }).skip((Math.max(1, page) - 1) * PAGE_SIZE)
      .limit(PAGE_SIZE).select('userId username level totalXp').lean()
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const p = Math.min(Math.max(1, page), totalPages);

  // Si la página pedida se salía de rango, se vuelve a consultar la correcta.
  const users = p === Math.max(1, page) ? firstPageUsers : await User.find(filter)
    .sort({ totalXp: -1 })
    .skip((p - 1) * PAGE_SIZE)
    .limit(PAGE_SIZE)
    .select('userId username level totalXp')
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

  const icon = guild.iconURL();
  if (icon) embed.setThumbnail(icon);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('lb_prev')
      .setLabel('◀ Anterior')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(p <= 1),
    new ButtonBuilder()
      .setLabel('Ver en web')
      .setStyle(ButtonStyle.Link)
      .setURL(webUrl(guildId)),
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

      // Solo quien invocó el comando puede pasar páginas: sin filtro, cualquiera
      // del canal manejaba el leaderboard de otro.
      const collector = msg.createMessageComponentCollector({
        filter: (btn) => btn.user.id === interaction.user.id,
        time: 2 * 60 * 1000
      });

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
          // Solo se deshabilitan los botones: reconstruir la página costaba dos
          // consultas más para mostrar exactamente lo mismo.
          const disabledRow = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId('lb_prev').setLabel('◀ Anterior').setStyle(ButtonStyle.Secondary).setDisabled(true),
            new ButtonBuilder().setLabel('Ver en web').setStyle(ButtonStyle.Link).setURL(webUrl(guildId)),
            new ButtonBuilder().setCustomId('lb_next').setLabel('Siguiente ▶').setStyle(ButtonStyle.Secondary).setDisabled(true)
          );
          await interaction.editReply({ components: [disabledRow] });
        } catch { /* la interacción ya expiró */ }
      });

    } catch (error) {
      logger.error('Error en comando leaderboard:', error);
      try {
        await interaction.editReply({ content: '❌ Error al cargar el leaderboard.', embeds: [], components: [] });
      } catch { /* la interacción ya expiró */ }
    }
  }
};
