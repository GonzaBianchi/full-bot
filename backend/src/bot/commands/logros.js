import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import achievementService from '../../services/achievementService.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('logros')
    .setDescription('Muestra tu progreso de logros')
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Ver logros de otro usuario (opcional)')
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const targetUser = interaction.options.getUser('usuario') || interaction.user;
      const guildId = interaction.guild.id;

      // Obtener progreso del usuario
      const progress = await achievementService.getUserProgress(targetUser.id, guildId);

      // Crear embed principal con resumen
      const mainEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setTitle(`🏆 Logros de ${targetUser.username}`)
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
        .setDescription(
          `**Progreso Total:** ${progress.summary.totalProgress}% (${progress.summary.completedTiers}/${progress.summary.totalTiers} tiers)\n` +
          `**Logros Completados:** ${progress.summary.completedAchievements}/${progress.summary.totalAchievements}`
        )
        .addFields(
          {
            name: '📊 Estadísticas',
            value: 
              `📝 Mensajes: **${progress.stats.totalMessages.toLocaleString()}**\n` +
              `⭐ Reacciones: **${progress.stats.totalReactions.toLocaleString()}**\n` +
              `🎙️ Tiempo en Voice: **${formatVoiceTime(progress.stats.totalVoiceTime)}**\n` +
              `🚀 Boost: **${progress.stats.hasBoosted ? 'Sí ✅' : 'No ❌'}**`,
            inline: false
          }
        )
        .setTimestamp();

      // Crear embeds para cada logro
      const achievementEmbeds = [];
      
      for (const ach of progress.achievements) {
        const embed = new EmbedBuilder()
          .setColor(ach.completed ? 0x57F287 : 0xFEE75C) // Verde si está completo, amarillo si no
          .setTitle(`${ach.achievement.icon} ${ach.achievement.name}`)
          .setDescription(ach.achievement.description || 'Sin descripción');

        // Estado del tier actual
        if (ach.nextTier) {
          const progressBar = createProgressBar(ach.progress);
          embed.addFields({
            name: `Progreso hacia: ${ach.nextTier.title}`,
            value: 
              `${progressBar} ${ach.progress}%\n` +
              `**${formatValue(ach.currentValue, ach.achievement.type)}** / **${formatValue(ach.nextTier.target, ach.achievement.type)}**`,
            inline: false
          });
        } else if (ach.completed) {
          embed.addFields({
            name: '✅ Logro Completado',
            value: 'Has desbloqueado todos los niveles!',
            inline: false
          });
        }

        // Mostrar tier actual si hay
        if (ach.currentTier) {
          embed.addFields({
            name: '🏅 Nivel Actual',
            value: `**${ach.currentTier.title}** (${formatValue(ach.currentTier.target, ach.achievement.type)})`,
            inline: true
          });
        }

        // Estado de tiers
        embed.addFields({
          name: 'Estado',
          value: ach.completed 
            ? `✅ ${ach.tierStatus} Completado` 
            : `⏳ ${ach.tierStatus} En progreso`,
          inline: true
        });

        achievementEmbeds.push(embed);
      }

      // Limitar a 10 embeds por mensaje (límite de Discord)
      const embeds = [mainEmbed, ...achievementEmbeds.slice(0, 9)];

      await interaction.editReply({ embeds });

      // Si hay más de 9 logros, avisar
      if (achievementEmbeds.length > 9) {
        await interaction.followUp({
          content: `⚠️ Solo se muestran los primeros 9 logros. Hay ${achievementEmbeds.length - 9} más.`,
          ephemeral: true
        });
      }

    } catch (error) {
      logger.error('Error en comando /logros:', error);
      
      const errorMessage = interaction.deferred 
        ? { content: '❌ Error al obtener los logros. Intenta de nuevo más tarde.' }
        : { content: '❌ Error al obtener los logros.', ephemeral: true };

      if (interaction.deferred) {
        await interaction.editReply(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  }
};

/**
 * Formatea el tiempo de voice en formato legible
 */
function formatVoiceTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m`;
}

/**
 * Formatea valores según el tipo de logro
 */
function formatValue(value, type) {
  switch (type) {
    case 'voice_time':
      return formatVoiceTime(value);
    case 'boost':
      return value === 1 ? 'Boosteado' : 'No boosteado';
    default:
      return value.toLocaleString();
  }
}

/**
 * Crea una barra de progreso visual
 */
function createProgressBar(percent) {
  const filled = Math.floor(percent / 10);
  const empty = 10 - filled;
  
  const filledBar = '█'.repeat(filled);
  const emptyBar = '░'.repeat(empty);
  
  return `${filledBar}${emptyBar}`;
}