import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import Guild from '../../models/Guild.js';
import User from '../../models/User.js';
import { levelFromXp } from '../utils/levelSystem.js';
import logger from '../../utils/logger.js';
import { setTotalXp, postLevelChangeEffects } from '../../utils/xpSystem.js';

export default {
  data: new SlashCommandBuilder()
    .setName('sumarxp')
    .setDescription('Suma XP a un usuario (administradores)')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario').setRequired(true))
    .addIntegerOption(opt => opt.setName('cantidad').setDescription('Cantidad de XP a sumar').setRequired(true).setMinValue(1))
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: false }).catch(() => {});
    try {
      const user = interaction.options.getUser('usuario');
      const amount = Math.max(0, interaction.options.getInteger('cantidad') || 0);
      const guildId = interaction.guild?.id;
      if (!guildId) return interaction.editReply({ content: 'Este comando debe usarse en un servidor.' });

      const existing = await User.findOne({ guildId, userId: user.id });
      const oldTotal = existing ? (existing.totalXp || 0) : 0;
      const oldLevel = existing ? (existing.level || levelFromXp(oldTotal)) : levelFromXp(oldTotal);

      const newTotal = oldTotal + amount;

      const res = await setTotalXp(user.id, guildId, newTotal);

      const guildConfig = await Guild.findOne({ guildId }) || {};
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      // Suppress announcement for admin command
      const effects = await postLevelChangeEffects(interaction.guild, member, res.oldLevel, res.newLevel, guildConfig, null, user, { suppressAnnouncement: true });

      const assignedNames = (effects.assigned || []).map(id => interaction.guild.roles.cache.get(id)?.name || id);
      const skippedNames = (effects.skipped || []).map(s => s.roleId ? (interaction.guild.roles.cache.get(s.roleId)?.name || s.roleId) : (s.reason || 'skipped'));

      let reply = `✅ Se han sumado ${amount.toLocaleString()} XP a ${user.tag} (Total: ${newTotal.toLocaleString()})\n`;
      reply += `Nivel: ${res.oldLevel} → ${res.newLevel}\n`;
      reply += `Roles asignados: ${assignedNames.length > 0 ? `${assignedNames.length} — ${assignedNames.join(', ')}` : '0'}\n`;
      if ((effects.skipped || []).length > 0) reply += `Roles omitidos: ${effects.skipped.length} — ${[...new Set(skippedNames)].join(', ')}\n`;

      await interaction.editReply({ content: reply });

    } catch (e) {
      logger.error('Error en /sumarxp:', e);
      try {
        await interaction.editReply({ content: 'Error al sumar XP. Revisa los logs.' });
      } catch (_) {}
    }
  }
};
