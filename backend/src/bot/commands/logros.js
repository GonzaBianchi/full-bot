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

      if (!progress || progress.achievements.length === 0) {
        return interaction.editReply({
          content: `${targetUser.username} aún no tiene logros configurados en este servidor.`
        });
      }

      // Crear embed principal
      const mainEmbed = new EmbedBuilder()
        .setColor(0x5865F2)
        .setAuthor({
          name: `Logros de ${targetUser.username}`,
          iconURL: targetUser.displayAvatarURL({ dynamic: true })
        })
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
        .setDescription(
          `╔═══════════════════╗\n` +
          `║  **PROGRESO TOTAL**  ║\n` +
          `╚═══════════════════╝\n\n` +
          `${createProgressBar(progress.summary.totalProgress, 20)} **${progress.summary.totalProgress}%**\n\n` +
          `**Logros:** ${progress.summary.completedAchievements}/${progress.summary.totalAchievements} completados\n` +
          `**Tiers:** ${progress.summary.completedTiers}/${progress.summary.totalTiers} desbloqueados`
        );

      // Agrupar logros por estado
      const completed = progress.achievements.filter(a => a.completed);
      const inProgress = progress.achievements.filter(a => !a.completed);

      // Agregar logros en progreso
      if (inProgress.length > 0) {
        let progressText = '';
        
        for (const ach of inProgress.slice(0, 5)) {
          const icon = ach.achievement.icon || '🏆';
          const progressBar = createProgressBar(ach.progress, 10);
          
          progressText += `\n${icon} **${ach.achievement.name}**\n`;
          progressText += `${progressBar} ${ach.progress}%\n`;
          
          if (ach.nextTier) {
            progressText += `└ Siguiente: *${ach.nextTier.title}* (${formatValue(ach.nextTier.target, ach.achievement.type)})\n`;
          }
        }

        mainEmbed.addFields({
          name: '⏳ En Progreso',
          value: progressText || 'Ninguno',
          inline: false
        });
      }

      // Agregar logros completados
      if (completed.length > 0) {
        let completedText = '';
        
        for (const ach of completed.slice(0, 5)) {
          const icon = ach.achievement.icon || '🏆';
          const maxTier = ach.currentTier;
          
          completedText += `${icon} **${ach.achievement.name}** - ${maxTier?.emoji || '✅'} *${maxTier?.title || 'Completado'}*\n`;
        }

        if (completed.length > 5) {
          completedText += `\n*... y ${completed.length - 5} más*`;
        }

        mainEmbed.addFields({
          name: '✅ Completados',
          value: completedText,
          inline: false
        });
      }

      // Estadísticas
      mainEmbed.addFields({
        name: '📊 Estadísticas',
        value: 
          `📝 **Mensajes:** ${progress.stats.totalMessages.toLocaleString()}\n` +
          `⭐ **Reacciones Recibidas:** ${progress.stats.totalReactions.toLocaleString()}\n` +
          `👍 **Reacciones Dadas:** ${progress.stats.totalReactionsGiven.toLocaleString()}\n` +
          `🎙️ **Tiempo en Voz:** ${formatVoiceTime(progress.stats.totalVoiceTime)}\n` +
          `🚀 **Nitro Boost:** ${progress.stats.hasBoosted ? 'Sí ✅' : 'No ❌'}`,
        inline: false
      });

      mainEmbed.setFooter({
        text: `${progress.achievements.length} logros disponibles • Sigue participando para desbloquear más!`
      });
      mainEmbed.setTimestamp();

      await interaction.editReply({ embeds: [mainEmbed] });

    } catch (error) {
      logger.error('Error en comando /logros:', error);
      
      const errorMessage = interaction.deferred 
        ? { content: 'Error al obtener los logros. Intenta de nuevo más tarde.' }
        : { content: 'Error al obtener los logros.', ephemeral: true };

      if (interaction.deferred) {
        await interaction.editReply(errorMessage);
      } else {
        await interaction.reply(errorMessage);
      }
    }
  }
};

/**
 * Crea una barra de progreso visual con caracteres Unicode
 */
function createProgressBar(percent, length = 10) {
  const filled = Math.floor((percent / 100) * length);
  const empty = length - filled;
  
  // Usar caracteres más visuales
  const filledChar = '█';
  const emptyChar = '░';
  
  return `${filledChar.repeat(filled)}${emptyChar.repeat(empty)}`;
}

/**
 * Formatea el tiempo de voice en formato legible
 */
function formatVoiceTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m`;
  }
  return `${seconds}s`;
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
    case 'reactions':
    case 'reactions_given':
      return `${value.toLocaleString()} reacciones`;
    case 'messages':
      return `${value.toLocaleString()} mensajes`;
    default:
      return value.toLocaleString();
  }
}