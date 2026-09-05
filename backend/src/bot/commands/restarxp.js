import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import User from '../../models/User.js';
import { levelFromXp } from '../utils/levelSystem.js';
import logger from '../../utils/logger.js';
import { incrementTotalXp } from '../../utils/xpSystem.js';
import { applyLevelChange } from '../../utils/xpAdminActions.js';

export default {
  data: new SlashCommandBuilder()
    .setName('restarxp')
    .setDescription('Resta XP de un usuario (administradores)')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario').setRequired(true))
    .addIntegerOption(opt => opt.setName('cantidad').setDescription('Cantidad de XP a restar').setRequired(true).setMinValue(1))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    try {
      const target = interaction.options.getUser('usuario');
      const amount = interaction.options.getInteger('cantidad');
      const guildId = interaction.guild?.id;
      if (!guildId) {
        return interaction.reply({ content: 'Este comando debe usarse en un servidor.', flags: MessageFlags.Ephemeral });
      }

      // Solo para previsualizar en la confirmación; el descuento real es atómico.
      const existing = await User.findOne({ guildId, userId: target.id }).lean();
      const oldTotal = existing?.totalXp || 0;
      const oldLevel = existing?.level ?? levelFromXp(oldTotal);
      const previewTotal = Math.max(0, oldTotal - amount);

      const confirmEmbed = new EmbedBuilder()
        .setTitle('⚠️ Confirmar resta de XP')
        .setColor(0xFAA61A)
        .setDescription(`¿Estás seguro de restar **${amount.toLocaleString()} XP** a ${target}?`)
        .addFields(
          { name: 'XP actual', value: oldTotal.toLocaleString(), inline: true },
          { name: 'XP resultante', value: previewTotal.toLocaleString(), inline: true },
          { name: 'Nivel', value: `${oldLevel} → ${levelFromXp(previewTotal)}`, inline: true }
        )
        .setFooter({ text: 'Esta acción expira en 30 segundos' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rxp_confirm').setLabel('Confirmar').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('rxp_cancel').setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
      );

      await interaction.reply({
        embeds: [confirmEmbed],
        components: [row],
        flags: MessageFlags.Ephemeral
      });

      // El colector cuelga del propio mensaje, no del canal entero: antes
      // escuchaba todos los componentes del canal.
      const promptMessage = await interaction.fetchReply();
      const collector = promptMessage.createMessageComponentCollector({
        filter: (btn) => btn.user.id === interaction.user.id,
        time: 30 * 1000,
        max: 1
      });

      collector.on('collect', async (btn) => {
        await btn.deferUpdate();

        if (btn.customId === 'rxp_cancel') {
          return interaction.editReply({ content: '❌ Operación cancelada.', embeds: [], components: [] });
        }

        try {
          const res = await incrementTotalXp(target.id, guildId, -amount);

          const effects = await applyLevelChange(interaction, target, res, {
            action: 'xp_removed',
            data: { amount }
          });

          const resultEmbed = new EmbedBuilder()
            .setTitle('✅ XP restada correctamente')
            .setColor(0x43B581)
            .addFields(
              { name: 'Usuario', value: `${target}`, inline: true },
              { name: 'XP restada', value: amount.toLocaleString(), inline: true },
              { name: 'XP total', value: res.totalXp.toLocaleString(), inline: true },
              { name: 'Nivel', value: `${res.oldLevel} → ${res.newLevel}`, inline: true },
              { name: 'Roles removidos', value: effects.removedNames.length > 0 ? effects.removedNames.join(', ') : 'Ninguno', inline: true }
            );

          await interaction.editReply({ embeds: [resultEmbed], components: [] });
        } catch (e) {
          logger.error('Error ejecutando /restarxp:', e);
          await interaction.editReply({ content: '❌ Error al restar XP. Revisa los logs.', embeds: [], components: [] });
        }
      });

      collector.on('end', (collected) => {
        if (collected.size === 0) {
          interaction.editReply({ content: '⏱️ Confirmación expirada.', embeds: [], components: [] }).catch(() => {});
        }
      });
    } catch (e) {
      logger.error('Error en /restarxp:', e);
      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.editReply({ content: '❌ Error al procesar el comando.', embeds: [], components: [] });
        } else {
          await interaction.reply({ content: '❌ Error al procesar el comando.', flags: MessageFlags.Ephemeral });
        }
      } catch { /* la interacción ya expiró */ }
    }
  }
};
