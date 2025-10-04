import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import Achievement from '../models/Achievement.js';
import { LOGROS, LEVELS } from '../utils/achievements.js';

function getBar(percent, length = 14) {
  const filled = Math.round(percent * length);
  const empty = length - filled;
  return `[${'█'.repeat(filled)}${'░'.repeat(empty)}] ${Math.round(percent * 100)}%`;
}

export default {
  data: new SlashCommandBuilder()
    .setName('logros')
    .setDescription('Muestra tu progreso de logros o el de otro usuario')
    .addUserOption(option =>
      option.setName('usuario')
        .setDescription('Usuario a consultar')
        .setRequired(false)),
  async execute(interaction) {
    await interaction.deferReply();
    try {
      const user = interaction.options.getUser('usuario') || interaction.user;
      const ach = await Achievement.findOne({ userId: user.id, guildId: interaction.guildId });
      if (!ach) {
        return interaction.editReply({ content: `${user} aún no tiene logros registrados.` });
      }
      // Calcular totales
      const tipos = [
        { key: 'birthday', label: 'Cumpleaños', max: 1, value: ach.achievements.birthday ? 1 : 0 },
        { key: 'booster', label: 'Booster', max: 1, value: ach.achievements.booster ? 1 : 0 },
        { key: 'messages', label: 'Mensajes', max: LEVELS.messages.length, value: ach.achievements.messagesLevel || 0, actual: ach.achievements.messages || 0, levels: LEVELS.messages, logros: LOGROS.messages },
        { key: 'reactions', label: 'Reacciones', max: LEVELS.reactions.length, value: ach.achievements.reactionsLevel || 0, actual: ach.achievements.reactions || 0, levels: LEVELS.reactions, logros: LOGROS.reactions },
        { key: 'voice', label: 'Voz', max: LEVELS.voice.length, value: ach.achievements.voiceLevel || 0, actual: ach.achievements.voiceMinutes || 0, levels: LEVELS.voice, logros: LOGROS.voice }
      ];
      let total = 0, completados = 0;
      for (const t of tipos) { total += t.max; completados += t.value; }
      const percentTotal = completados / total;
      // Embed
      let desc = `Completaste **${completados}** de **${total}** logros totales.\n`;
      desc += getBar(percentTotal) + '\n';
      const embed = new EmbedBuilder()
        .setTitle(`Logros de ${user.username}`)
        .setColor('#39FF90')
        .setThumbnail(user.displayAvatarURL({ extension: 'png', size: 256 }))
        .setDescription(desc);
      // Barras y campos
      for (const tipo of tipos) {
        let nextTitle = '', nextDesc = '', barra = '', actual = tipo.actual || tipo.value;
        let meta = 1;
        let percent = 0;
        let nivelActual = tipo.value;
        let totalLogros = tipo.key === 'birthday' || tipo.key === 'booster' ? 1 : tipo.levels.length;
        let progresoMeta = '';
        if (tipo.key === 'birthday' || tipo.key === 'booster') {
          nextTitle = LOGROS[tipo.key].title;
          nextDesc = LOGROS[tipo.key].description;
          percent = tipo.value / tipo.max;
          barra = getBar(percent);
          progresoMeta = tipo.value ? '(1/1)' : '(0/1)';
        } else {
          const nivel = ach.achievements[`${tipo.key}Level`] || 0;
          if (nivel < tipo.levels.length) {
            meta = tipo.levels[nivel];
            nextTitle = tipo.logros[nivel].title;
            nextDesc = tipo.logros[nivel].desc;
          } else {
            meta = tipo.levels[tipo.levels.length-1];
            nextTitle = tipo.logros[tipo.logros.length-1].title;
            nextDesc = tipo.logros[tipo.logros.length-1].desc;
          }
          percent = Math.min(actual / meta, 1);
          barra = getBar(percent);
          progresoMeta = `(**${actual}/${meta}**)`;
        }
        embed.addFields({
          name: `${tipo.label} (${nivelActual}/${totalLogros})`,
          value: `**${nextTitle}** → ${nextDesc} ${progresoMeta}\n${barra}`,
          inline: false
        });
      }
      return interaction.editReply({ embeds: [embed] });
    } catch (err) {
      console.error('Error en logros:', err);
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: 'Ocurrió un error al consultar los logros. Intenta de nuevo más tarde.' });
      } else {
        await interaction.reply({ content: 'Ocurrió un error al consultar los logros. Intenta de nuevo más tarde.' });
      }
    }
  }
};
