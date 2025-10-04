// Comando /setnivelrol: asigna manualmente el nivel a un rol de nivel
import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { LevelRole } from '../../utils/roleManager.js';

export const data = new SlashCommandBuilder()
  .setName('setnivelrol')
  .setDescription('Asigna el nivel mínimo a un rol de nivel (solo administradores)')
  .addStringOption(option =>
    option.setName('rol')
      .setDescription('Rol de nivel a configurar')
      .setRequired(true)
      .setAutocomplete(true)
  )
  .addIntegerOption(option =>
    option.setName('nivel')
      .setDescription('Nivel mínimo para este rol')
      .setRequired(true)
      .setMinValue(1))
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  const roleId = interaction.options.getString('rol');
  const minLevel = interaction.options.getInteger('nivel');
  const guildId = interaction.guild.id;
  const role = interaction.guild.roles.cache.get(roleId);
  if (!role) {
    return interaction.reply({ content: 'El rol seleccionado no existe.', flags: MessageFlags.Ephemeral });
  }
  // Prevenir duplicados de nivel (solo si ya existe un rol con ese nivel en este guild)
  const existing = await LevelRole.findOne({ guildId, minLevel });
  if (existing && existing.roleId !== role.id) {
    return interaction.reply({ content: `Ya existe un rol asignado al nivel ${minLevel}: <@&${existing.roleId}>. Elimina o cambia ese rol primero.`, flags: MessageFlags.Ephemeral });
  }
  // Prevenir que dos roles tengan el mismo minLevel
  await LevelRole.updateMany({ guildId, minLevel }, { $unset: { minLevel: 1 } });
  // Crear o actualizar la relación
  await LevelRole.findOneAndUpdate(
    { guildId, roleId: role.id },
    { roleName: role.name, minLevel },
    { upsert: true, new: true }
  );
  return interaction.reply({ content: `El rol <@&${role.id}> ahora está asignado al nivel ${minLevel}.`, flags: MessageFlags.Ephemeral });
}

// Autocompletado para roles de nivel
export async function autocomplete(interaction) {
  const pattern = /^✦─────『(.+)』─────✦$/u;
  const focusedValue = interaction.options.getFocused();
  const roles = interaction.guild.roles.cache
    .filter(role => pattern.test(role.name))
    .map(role => ({ name: role.name, value: role.id }))
    .filter(option => option.name.toLowerCase().includes(focusedValue.toLowerCase()))
    .slice(0, 25);
  await interaction.respond(roles);
}
