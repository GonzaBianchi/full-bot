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

      const progress = await achievementService.getUserProgress(targetUser.id, guildId);

      if (!progress || progress.achievements.length === 0) {
        return interaction.editReply({
          content: `${targetUser.username} aún no tiene logros configurados en este servidor.`
        });
      }

      // ========== DISEÑO ELEGANTE CON GRADIENTE ==========
      const mainEmbed = new EmbedBuilder()
        .setColor('#FFD700') // Dorado elegante
        .setAuthor({
          name: `✨ Logros de ${targetUser.username}`,
          iconURL: targetUser.displayAvatarURL({ dynamic: true })
        })
        .setThumbnail(targetUser.displayAvatarURL({ dynamic: true, size: 256 }))
        .setDescription(
          `╭─────────────────────────╮\n` +
          `    **🏆 PROGRESO GLOBAL**    \n` +
          `╰─────────────────────────╯\n\n` +
          `${createModernProgressBar(progress.summary.totalProgress, 20)} **${progress.summary.totalProgress}%**\n\n` +
          `┌─ 📊 **Resumen**\n` +
          `├─ ✅ Logros: **${progress.summary.completedAchievements}**/${progress.summary.totalAchievements}\n` +
          `└─ 🎯 Tiers: **${progress.summary.completedTiers}**/${progress.summary.totalTiers}`
        );

      const completed = progress.achievements.filter(a => a.completed);
      const inProgress = progress.achievements.filter(a => !a.completed);

      // Logros en progreso - MOSTRAR TODOS
      if (inProgress.length > 0) {
        let progressText = '';
        
        for (const ach of inProgress) {
          const icon = ach.achievement.icon || '🏆';
          const progressBar = createModernProgressBar(ach.progress, 12);
          
          progressText += `\n**${icon} ${ach.achievement.name}**\n`;
          progressText += `${progressBar} \`${ach.progress}%\`\n`;
          
          if (ach.nextTier) {
            const remaining = ach.nextTier.target - ach.currentValue;
            progressText += `└─ Siguiente: **${ach.nextTier.title}** ${ach.nextTier.emoji || ''}\n`;
            progressText += `   Faltan: \`${formatValue(remaining, ach.achievement.type)}\`\n`;
          }
        }

        mainEmbed.addFields({
          name: `⏳ En Progreso (${inProgress.length})`,
          value: progressText || 'Ninguno',
          inline: false
        });
      }

      // Logros completados - MOSTRAR TODOS
      if (completed.length > 0) {
        let completedText = '';
        
        for (const ach of completed) {
          const icon = ach.achievement.icon || '🏆';
          const maxTier = ach.currentTier;
          
          completedText += `${icon} **${ach.achievement.name}** ${maxTier?.emoji || '✨'} \`${maxTier?.title || 'MAX'}\`\n`;
        }

        mainEmbed.addFields({
          name: `✅ Completados (${completed.length})`,
          value: completedText || 'Ninguno',
          inline: false
        });
      }

      // Estadísticas con iconos mejorados
      const statsEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('📈 Estadísticas Detalladas')
        .setDescription(
          `\`\`\`ansi\n` +
          `\u001b[36m📝 Mensajes.............. ${progress.stats.totalMessages.toLocaleString()}\u001b[0m\n` +
          `\u001b[35m⭐ Reacciones Recibidas.. ${progress.stats.totalReactions.toLocaleString()}\u001b[0m\n` +
          `\u001b[33m👍 Reacciones Dadas...... ${progress.stats.totalReactionsGiven.toLocaleString()}\u001b[0m\n` +
          `\u001b[32m🎙️ Tiempo en Voz......... ${formatVoiceTime(progress.stats.totalVoiceTime)}\u001b[0m\n` +
          `\u001b[31m🚀 Nitro Boost........... ${progress.stats.hasBoosted ? 'Activo ✅' : 'Inactivo ❌'}\u001b[0m\n` +
          `\`\`\``
        )
        .setFooter({
          text: `${progress.achievements.length} logros disponibles | Sigue participando!`,
          iconURL: interaction.guild.iconURL({ dynamic: true })
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [mainEmbed, statsEmbed] });

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
 * Barra de progreso moderna con degradado visual
 */
function createModernProgressBar(percent, length = 12) {
  const filled = Math.floor((percent / 100) * length);
  const empty = length - filled;
  
  // Usar caracteres más modernos
  const start = '▰';
  const end = '▱';
  
  return `${start.repeat(filled)}${end.repeat(empty)}`;
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