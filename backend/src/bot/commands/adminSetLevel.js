import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import Guild from '../../models/Guild.js';
import User from '../../models/User.js';
import { xpForLevel } from '../utils/levelSystem.js';
import logger from '../../utils/logger.js';
import { setLevelAndXp, postLevelChangeEffects } from '../../utils/xpSystem.js';

export default {
  data: new SlashCommandBuilder()
    .setName('setlevel')
    .setDescription('Establece el nivel de un usuario (administradores)')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario').setRequired(true))
    .addIntegerOption(opt => opt.setName('nivel').setDescription('Nivel a establecer').setRequired(true).setMinValue(0))
    .addIntegerOption(opt => opt.setName('offset').setDescription('XP adicional dentro del nivel (opcional)').setRequired(false).setMinValue(0))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false }).catch(() => {});
    try {
      const user = interaction.options.getUser('usuario');
      const level = interaction.options.getInteger('nivel');
      const offset = interaction.options.getInteger('offset') || 0;
      const guildId = interaction.guild?.id;
      if (!guildId) return interaction.editReply({ content: 'Este comando debe usarse en un servidor.' });

      // Centralized set level + xp
      const res = await setLevelAndXp(user.id, guildId, level, offset);

      // Fetch guild config once and member
      const guildConfig = await Guild.findOne({ guildId }) || {};
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      // Apply role changes but suppress public level-up announcements for admin command
      const effects = await postLevelChangeEffects(interaction.guild, member, res.oldLevel, res.newLevel, guildConfig, null, user, { suppressAnnouncement: true });

      const assignedNames = (effects.assigned || []).map(id => interaction.guild.roles.cache.get(id)?.name || id);
      const removedNames = (effects.removed || []).map(id => interaction.guild.roles.cache.get(id)?.name || id);
      const skippedNames = (effects.skipped || []).map(s => s.roleId ? (interaction.guild.roles.cache.get(s.roleId)?.name || s.roleId) : (s.reason || 'skipped'));

      let reply = `✅ Nivel de ${user.tag} establecido a ${res.newLevel} (XP total: ${res.totalXp.toLocaleString()})\n`;
      reply += `Roles asignados: ${assignedNames.length > 0 ? `${assignedNames.length} — ${assignedNames.join(', ')}` : '0'}\n`;
      if (removedNames.length > 0) reply += `Roles removidos: ${removedNames.length} — ${removedNames.join(', ')}\n`;
      if (skippedNames.length > 0) reply += `Roles omitidos: ${skippedNames.length} — ${[...new Set(skippedNames)].join(', ')}\n`;

      await interaction.editReply({ content: reply });

    } catch (e) {
      logger.error('Error en /setlevel:', e);
      try {
        await interaction.editReply({ content: 'Error al establecer el nivel. Revisa los logs.' });
      } catch (_) {
        // ignore
      }
    }
  }
};
