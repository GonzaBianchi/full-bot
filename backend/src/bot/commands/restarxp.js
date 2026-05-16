import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import Guild from '../../models/Guild.js';
import User from '../../models/User.js';
import { levelFromXp } from '../utils/levelSystem.js';
import logger from '../../utils/logger.js';
import { setTotalXp, postLevelChangeEffects } from '../../utils/xpSystem.js';

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
      if (!guildId) return interaction.reply({ content: 'Este comando debe usarse en un servidor.', ephemeral: true });

      const existing = await User.findOne({ guildId, userId: target.id }).lean();
      const oldTotal = existing?.totalXp || 0;
      const oldLevel = existing?.level ?? levelFromXp(oldTotal);
      const newTotal = Math.max(0, oldTotal - amount);
      const newLevel = levelFromXp(newTotal);

      const confirmEmbed = new EmbedBuilder()
        .setTitle('⚠️ Confirmar resta de XP')
        .setColor(0xFAA61A)
        .setDescription(`¿Estás seguro de restar **${amount.toLocaleString()} XP** a ${target}?`)
        .addFields(
          { name: 'XP actual', value: oldTotal.toLocaleString(), inline: true },
          { name: 'XP resultante', value: newTotal.toLocaleString(), inline: true },
          { name: 'Nivel', value: `${oldLevel} → ${newLevel}`, inline: true }
        )
        .setFooter({ text: 'Esta acción expira en 30 segundos' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('rxp_confirm').setLabel('Confirmar').setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId('rxp_cancel').setLabel('Cancelar').setStyle(ButtonStyle.Secondary)
      );

      await interaction.reply({ embeds: [confirmEmbed], components: [row], ephemeral: true });

      const collector = interaction.channel.createMessageComponentCollector({
        filter: (btn) => btn.user.id === interaction.user.id && ['rxp_confirm', 'rxp_cancel'].includes(btn.customId),
        time: 30 * 1000,
        max: 1
      });

      collector.on('collect', async (btn) => {
        await btn.deferUpdate();

        if (btn.customId === 'rxp_cancel') {
          return interaction.editReply({ content: '❌ Operación cancelada.', embeds: [], components: [] });
        }

        try {
          const res = await setTotalXp(target.id, guildId, newTotal);
          const guildConfig = await Guild.findOne({ guildId }) || {};
          const member = await interaction.guild.members.fetch(target.id).catch(() => null);
          const effects = await postLevelChangeEffects(interaction.guild, member, res.oldLevel, res.newLevel, guildConfig, null, target);

          const removedNames = (effects.removed || []).map(id => interaction.guild.roles.cache.get(id)?.name || id);

          const resultEmbed = new EmbedBuilder()
            .setTitle('✅ XP restada correctamente')
            .setColor(0x43B581)
            .addFields(
              { name: 'Usuario', value: `${target}`, inline: true },
              { name: 'XP restada', value: amount.toLocaleString(), inline: true },
              { name: 'XP total', value: newTotal.toLocaleString(), inline: true },
              { name: 'Nivel', value: `${res.oldLevel} → ${res.newLevel}`, inline: true },
              { name: 'Roles removidos', value: removedNames.length > 0 ? removedNames.join(', ') : 'Ninguno', inline: true }
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
          await interaction.reply({ content: '❌ Error al procesar el comando.', ephemeral: true });
        }
      } catch (_) {}
    }
  }
};
