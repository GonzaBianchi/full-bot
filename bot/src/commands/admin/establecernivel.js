// Comando /establecernivel: establece nivel y XP de un usuario (admin)
import { SlashCommandBuilder } from 'discord.js';
import { setLevelAndXp } from '../../utils/xpSystem.js';
import { updateMemberRoles } from '../../utils/roleManager.js';

export const data = new SlashCommandBuilder()
  .setName('establecernivel')
  .setDescription('Establece un nivel y XP específicos para un usuario (solo administradores)')
  .addUserOption(option =>
    option.setName('usuario')
      .setDescription('Usuario al que establecer nivel y XP')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('nivel')
      .setDescription('Nivel a establecer')
      .setRequired(true)
      .setMinValue(1))
  .addIntegerOption(option =>
    option.setName('xp')
      .setDescription('XP a establecer (opcional)')
      .setRequired(false)
      .setMinValue(0))
  .setDefaultMemberPermissions(0x00000008); // Administrator

export async function execute(interaction) {
  const user = interaction.options.getUser('usuario');
  const nivel = interaction.options.getInteger('nivel');
  const xp = interaction.options.getInteger('xp') ?? 0;
  const guildId = interaction.guild.id;
  const updatedUser = await setLevelAndXp(user.id, guildId, nivel, xp);
  const member = await interaction.guild.members.fetch(user.id);
  await updateMemberRoles(member, updatedUser.level);
  return interaction.reply(`Se estableció el nivel ${nivel} y ${xp} XP a ${user}.`);
}
