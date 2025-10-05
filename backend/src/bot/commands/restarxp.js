import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
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
    await interaction.deferReply({ ephemeral: false }).catch(() => {});
    try {
      const user = interaction.options.getUser('usuario');
      const amount = Math.max(0, interaction.options.getInteger('cantidad') || 0);
      const guildId = interaction.guild?.id;
      if (!guildId) return interaction.editReply({ content: 'Este comando debe usarse en un servidor.' });

      // Obtener documento de usuario y calcular nuevo totalXp
      const existing = await User.findOne({ guildId, userId: user.id });
      const oldTotal = existing ? (existing.totalXp || 0) : 0;
      const oldLevel = existing ? (existing.level || levelFromXp(oldTotal)) : levelFromXp(oldTotal);

      const newTotal = Math.max(0, oldTotal - amount);

      // Use xpSystem to set total XP and get updated levels
      const res = await setTotalXp(user.id, guildId, newTotal);
      const newLevel = res.newLevel;

      // Fetch guild config once and member
      const guildConfig = await Guild.findOne({ guildId }) || {};
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);

      // Centralized effects: remove roles and (no announcement on downgrade) — postLevelChangeEffects handles both
      const effects = await postLevelChangeEffects(interaction.guild, member, res.oldLevel, res.newLevel, guildConfig, null, user);

      const removedNames = (effects.removed || []).map(id => interaction.guild.roles.cache.get(id)?.name || id);
      const skippedNames = (effects.skipped || []).map(s => s.roleId ? (interaction.guild.roles.cache.get(s.roleId)?.name || s.roleId) : (s.reason || 'skipped'));

      let reply = `✅ Se han restado ${amount.toLocaleString()} XP a ${user.tag} (Total: ${newTotal.toLocaleString()})\n`;
      reply += `Nivel: ${res.oldLevel} → ${res.newLevel}\n`;
      reply += `Roles removidos: ${removedNames.length > 0 ? `${removedNames.length} — ${removedNames.join(', ')}` : '0'}\n`;
      if ((effects.skipped || []).length > 0) reply += `Roles omitidos: ${effects.skipped.length} — ${[...new Set(skippedNames)].join(', ')}\n`;

      await interaction.editReply({ content: reply });

    } catch (e) {
      logger.error('Error en /restarxp:', e);
      try {
        await interaction.editReply({ content: 'Error al restar XP. Revisa los logs.' });
      } catch (_) {}
    }
  }
};
