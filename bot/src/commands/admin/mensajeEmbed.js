import { SlashCommandBuilder, PermissionFlagsBits, EmbedBuilder } from 'discord.js';

export const data = new SlashCommandBuilder()
  .setName('mensajeembed')
  .setDescription('Envía un embed personalizado con el bot (solo admins)')
  .addStringOption(option =>
    option.setName('titulo')
      .setDescription('Título del embed')
      .setRequired(true)
  )
  .addStringOption(option =>
    option.setName('descripcion')
      .setDescription('Texto del embed (usa \\n para saltos de línea y estilos)')
      .setRequired(true)
  )
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    await interaction.reply({ content: 'Solo los administradores pueden usar este comando.', flags: 64 });
    return;
  }
  const titulo = interaction.options.getString('titulo');
  let descripcion = interaction.options.getString('descripcion');
  descripcion = descripcion.replace(/\\n/g, '\n'); // Soporta \n como salto de línea

  const embed = new EmbedBuilder()
    .setTitle(titulo)
    .setDescription(descripcion)
    .setColor(0x8e44ad) // Color violeta
    .setTimestamp();

  await interaction.reply({ content: `Embed enviado como ${interaction.client.user.username}.`, flags: 64 });
  await interaction.channel.send({ embeds: [embed] });
}
