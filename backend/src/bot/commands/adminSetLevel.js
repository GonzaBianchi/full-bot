import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import logger from '../../utils/logger.js';
import { setLevelAndXp } from '../../utils/xpSystem.js';
import { applyLevelChange } from '../../utils/xpAdminActions.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setlevel')
    .setDescription('Establece el nivel de un usuario (administradores)')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario').setRequired(true))
    .addIntegerOption(opt => opt.setName('nivel').setDescription('Nivel a establecer').setRequired(true).setMinValue(0))
    .addIntegerOption(opt => opt.setName('offset').setDescription('XP adicional dentro del nivel (opcional)').setRequired(false).setMinValue(0))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply().catch(() => {});
    try {
      const user = interaction.options.getUser('usuario');
      const level = interaction.options.getInteger('nivel');
      const offset = interaction.options.getInteger('offset') || 0;
      const guildId = interaction.guild?.id;
      if (!guildId) return interaction.editReply({ content: 'Este comando debe usarse en un servidor.' });

      const res = await setLevelAndXp(user.id, guildId, level, offset);

      const effects = await applyLevelChange(interaction, user, res, {
        suppressAnnouncement: true,
        action: 'level_set',
        data: { level, offset }
      });

      let reply = `✅ Nivel de ${user.tag} establecido a ${res.newLevel} (XP total: ${res.totalXp.toLocaleString()})\n`;
      reply += `Roles asignados: ${effects.assignedNames.length > 0 ? `${effects.assignedNames.length} — ${effects.assignedNames.join(', ')}` : '0'}\n`;
      if (effects.removedNames.length > 0) {
        reply += `Roles removidos: ${effects.removedNames.length} — ${effects.removedNames.join(', ')}\n`;
      }
      if (effects.skippedNames.length > 0) {
        reply += `Roles omitidos: ${effects.skippedNames.length} — ${effects.skippedNames.join(', ')}\n`;
      }

      await interaction.editReply({ content: reply });
    } catch (e) {
      logger.error('Error en /setlevel:', e);
      await interaction.editReply({ content: 'Error al establecer el nivel. Revisa los logs.' }).catch(() => {});
    }
  }
};
