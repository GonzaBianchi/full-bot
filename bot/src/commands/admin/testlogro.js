import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { LOGROS } from '../utils/achievements.js';
import { generateAchievementImage } from '../utils/achievementImage.js';

const tipos = [
  ['messages', 'Mensajes'],
  ['reactions', 'Reacciones'],
  ['voice', 'Voz'],
  ['birthday', 'Cumpleaños'],
  ['booster', 'Booster']
];

export default {
  data: new SlashCommandBuilder()
    .setName('testlogro')
    .setDescription('Simula el anuncio de un logro (solo admins)')
    .addStringOption(option =>
      option.setName('tipo')
        .setDescription('Tipo de logro')
        .setRequired(true)
        .addChoices(...tipos.map(([v, n]) => ({ name: n, value: v }))))
    .addIntegerOption(option =>
      option.setName('nivel')
        .setDescription('Nivel del logro (0 para el primero)')
        .setRequired(false))
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Usuario a mencionar (opcional)'))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(interaction) {
    await interaction.deferReply();
    if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
      return interaction.editReply({ content: 'Solo administradores pueden usar este comando.' });
    }
    const tipo = interaction.options.getString('tipo');
    let nivel = interaction.options.getInteger('nivel') ?? 0;
    const user = interaction.options.getUser('usuario') || interaction.user;
    let logro;
    if (tipo === 'birthday' || tipo === 'booster') {
      logro = LOGROS[tipo];
      nivel = 0;
    } else {
      logro = LOGROS[tipo]?.[nivel];
    }
    if (!logro) {
      return interaction.editReply({ content: 'Tipo o nivel de logro inválido.' });
    }
    try {
      const imgBuffer = await generateAchievementImage({
        type: tipo,
        level: nivel,
        title: logro.title,
        desc: logro.desc || logro.description
      });
      const logrosChannel = interaction.guild.channels.cache.get('1269848036545134654');
      if (logrosChannel) {
        await logrosChannel.send({
          content: `¡Felicidades ${user}! Has desbloqueado un logro.\n¡Consulta tu progreso con /logros!`,
          files: [{ attachment: imgBuffer, name: 'logro.png' }]
        });
        return interaction.editReply({ content: 'Mensaje de logro enviado al canal de logros.' });
      } else {
        return interaction.editReply({ content: 'No se encontró el canal de logros.' });
      }
    } catch (err) {
      console.error('Error en testlogro:', err);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: 'Ocurrió un error al simular el logro. Intenta de nuevo más tarde.' });
      } else {
        await interaction.reply({ content: 'Ocurrió un error al simular el logro. Intenta de nuevo más tarde.' });
      }
    }
  }
};
