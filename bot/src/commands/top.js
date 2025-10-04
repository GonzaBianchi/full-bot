// Comando /top: muestra el ranking de usuarios con más XP
import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import User from '../models/User.js';

export const data = new SlashCommandBuilder()
  .setName('top')
  .setDescription('Muestra el ranking de usuarios con más XP en el servidor (20 por página)');

export async function execute(interaction) {
  let currentPage = 1;
  const pageSize = 20;
  const guildId = interaction.guild.id;
  
  async function generateEmbed(page) {
    const skip = (page - 1) * pageSize;
    const totalUsers = await User.countDocuments({ guildId });
    const topUsers = await User.find({ guildId })
      .sort({ level: -1, xp: -1 })
      .skip(skip)
      .limit(pageSize);

    if (!topUsers.length) {
      return null;
    }

    const description = topUsers.map((u, i) => 
      `**${skip + i + 1}.** <@${u.userId}> - Nivel ${u.level} (${u.xp} XP)`
    ).join('\n');

    const totalPages = Math.ceil(totalUsers / pageSize);
    return new EmbedBuilder()
      .setTitle('Ranking de ⛩ The Rift Haven ⛩')
      .setDescription(description)
      .setFooter({ text: `Página ${page} de ${totalPages}` })
      .setColor(0xFFD700);
  }

  // Crear botones
  const row = new ActionRowBuilder()
    .addComponents(
      new ButtonBuilder()
        .setCustomId('first')
        .setLabel('◀◀')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('prev')
        .setLabel('◀')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('next')
        .setLabel('▶')
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId('last')
        .setLabel('▶▶')
        .setStyle(ButtonStyle.Primary)
    );

  // Enviar mensaje inicial
  const embed = await generateEmbed(currentPage);
  if (!embed) {
    return interaction.reply('No hay usuarios con XP aún.');
  }
  const totalUsers = await User.countDocuments({ guildId });
  const totalPages = Math.ceil(totalUsers / pageSize);
  await interaction.reply({ 
    embeds: [embed], 
    components: [row]
  });
  const message = await interaction.fetchReply();

  // Crear colector de botones
  const collector = message.createMessageComponentCollector({ 
    time: 60000 // 60 segundos
  });

  collector.on('collect', async i => {
    if (i.user.id !== interaction.user.id) {
      return i.reply({ content: 'Solo quien usó el comando puede navegar por las páginas.', flags: MessageFlags.Ephemeral });
    }

    switch (i.customId) {
      case 'first':
        currentPage = 1;
        break;
      case 'prev':
        currentPage = Math.max(1, currentPage - 1);
        break;
      case 'next':
        currentPage = Math.min(totalPages, currentPage + 1);
        break;
      case 'last':
        currentPage = totalPages;
        break;
    }

    const newEmbed = await generateEmbed(currentPage);
    await i.update({ embeds: [newEmbed], components: [row] });
  });

  collector.on('end', () => {
    // Desactivar botones cuando expire
    row.components.forEach(button => button.setDisabled(true));
    message.edit({ components: [row] });
  });
}
