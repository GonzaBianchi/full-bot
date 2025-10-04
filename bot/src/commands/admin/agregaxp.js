// Comando /agregarxp: agrega XP a un usuario (admin)
import { SlashCommandBuilder } from 'discord.js';
import { addXp } from '../../utils/xpSystem.js';
import { updateMemberRoles } from '../../utils/roleManager.js';

export const data = new SlashCommandBuilder()
  .setName('agregarxp')
  .setDescription('Agrega XP a un usuario específico (solo administradores)')
  .addUserOption(option =>
    option.setName('usuario')
      .setDescription('Usuario al que agregar XP')
      .setRequired(true))
  .addIntegerOption(option =>
    option.setName('cantidad')
      .setDescription('Cantidad de XP a agregar')
      .setRequired(true))
  .setDefaultMemberPermissions(0x00000008); // Administrator

export async function execute(interaction) {
  const user = interaction.options.getUser('usuario');
  const cantidad = interaction.options.getInteger('cantidad');
  const guildId = interaction.guild.id;
  const updatedUser = await addXp(user.id, guildId, cantidad);
  const member = await interaction.guild.members.fetch(user.id);
  await updateMemberRoles(member, updatedUser.level);
  return interaction.reply(`Se agregaron ${cantidad} XP a ${user}.`);
}
