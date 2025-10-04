import { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { connectDB } from '../utils/db.js';

export const data = new SlashCommandBuilder()
  .setName('crearrolemenu')
  .setDescription('Crea un menú de roles con reacciones')
  .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
  await connectDB();
  // Solo admins pueden usar
  if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: 'Solo administradores pueden usar este comando.', flags: 64 });
  }

  // Pedir título del menú
  const modal = new ModalBuilder()
    .setCustomId('rolemenu_titulo_modal')
    .setTitle('Crear Rolemenu')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('titulo')
          .setLabel('Título del rolemenu')
          .setStyle(TextInputStyle.Short)
          .setRequired(true)
      )
    );
  await interaction.showModal(modal);
}
