// Comando /niveles: muestra información sobre el sistema de niveles y roles
import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { LevelRole } from '../utils/roleManager.js';

export const data = new SlashCommandBuilder()
  .setName('niveles')
  .setDescription('Muestra información sobre el sistema de niveles y los roles de nivel');

export async function execute(interaction) {
  // Embed de información
  const infoEmbed = new EmbedBuilder()
    .setTitle('Sistema de Niveles')
    .setDescription('Gana XP participando en el chat. Sube de nivel y obtén roles exclusivos. ¡Participa para llegar al top!')
    .setColor(0x3498DB);

  // Embed de roles de nivel
  const guildId = interaction.guild.id;
  const roles = await LevelRole.find({ guildId, minLevel: { $ne: null } }).sort({ minLevel: 1 });
  let rolesDesc = 'No hay roles de nivel configurados en este servidor.';
  if (roles.length) {
    rolesDesc = roles.map(r => `**Nivel ${r.minLevel}:** <@&${r.roleId}>`).join('\n');
  }
  const rolesEmbed = new EmbedBuilder()
    .setTitle('Roles de Nivel')
    .setDescription(rolesDesc)
    .setColor(0x3498DB);

  return interaction.reply({ embeds: [infoEmbed, rolesEmbed] });
}
