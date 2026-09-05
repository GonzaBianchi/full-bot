import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import logger from '../../utils/logger.js';
import { incrementTotalXp } from '../../utils/xpSystem.js';
import { applyLevelChange } from '../../utils/xpAdminActions.js';

export default {
  data: new SlashCommandBuilder()
    .setName('sumarxp')
    .setDescription('Suma XP a un usuario (administradores)')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario').setRequired(true))
    .addIntegerOption(opt => opt.setName('cantidad').setDescription('Cantidad de XP a sumar').setRequired(true).setMinValue(1))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply().catch(() => {});
    try {
      const user = interaction.options.getUser('usuario');
      const amount = Math.max(0, interaction.options.getInteger('cantidad') || 0);
      const guildId = interaction.guild?.id;
      if (!guildId) return interaction.editReply({ content: 'Este comando debe usarse en un servidor.' });

      // $inc atómico: no se lee el total para volver a escribirlo.
      const res = await incrementTotalXp(user.id, guildId, amount);

      const effects = await applyLevelChange(interaction, user, res, {
        suppressAnnouncement: true,
        action: 'xp_added',
        data: { amount }
      });

      let reply = `✅ Se han sumado ${amount.toLocaleString()} XP a ${user.tag} (Total: ${res.totalXp.toLocaleString()})\n`;
      reply += `Nivel: ${res.oldLevel} → ${res.newLevel}\n`;
      reply += `Roles asignados: ${effects.assignedNames.length > 0 ? `${effects.assignedNames.length} — ${effects.assignedNames.join(', ')}` : '0'}\n`;
      if (effects.skippedNames.length > 0) {
        reply += `Roles omitidos: ${effects.skippedNames.length} — ${effects.skippedNames.join(', ')}\n`;
      }

      await interaction.editReply({ content: reply });
    } catch (e) {
      logger.error('Error en /sumarxp:', e);
      await interaction.editReply({ content: 'Error al sumar XP. Revisa los logs.' }).catch(() => {});
    }
  }
};
