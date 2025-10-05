import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import User from '../../models/User.js';
import { xpForLevel } from '../utils/levelSystem.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Muestra tu nivel y progreso (o el de otro usuario)')
    .addUserOption(opt => opt.setName('usuario').setDescription('Usuario a consultar').setRequired(false)),

  async execute(interaction) {
    try {
      // Defer reply inmediatamente
      await interaction.deferReply({ ephemeral: false });

      const target = interaction.options.getUser('usuario') || interaction.user;
      const guildId = interaction.guild?.id;

      if (!guildId) {
        return await interaction.editReply({ 
          content: 'Este comando solo puede usarse en servidores.' 
        });
      }

      const userDoc = await User.findOne({ guildId, userId: target.id });

      if (!userDoc) {
        return await interaction.editReply({ 
          content: `No se encontró información de nivel para ${target.username}. El usuario aún no ha ganado XP en este servidor.` 
        });
      }

      // Calcular progreso
      const currentLevelTotal = xpForLevel(userDoc.level);
      const nextLevelTotal = xpForLevel(userDoc.level + 1);
      const xpIntoLevel = Math.max(0, userDoc.totalXp - currentLevelTotal);
      const xpForNext = Math.max(0, nextLevelTotal - currentLevelTotal);
      
      const progress = {
        xp: xpIntoLevel,
        xpForNextLevel: xpForNext,
        percent: xpForNext > 0 ? Math.floor((xpIntoLevel / xpForNext) * 100) : 100
      };

      // Calcular rank
      const higher = await User.countDocuments({
        guildId: userDoc.guildId,
        totalXp: { $gt: userDoc.totalXp }
      });
      const rank = higher + 1;

      const embed = new EmbedBuilder()
        .setTitle(`📊 Nivel de ${target.username}`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
          { name: '🎯 Nivel', value: String(userDoc.level), inline: true },
          { name: '🏆 Ranking', value: `#${rank}`, inline: true },
          { name: '✨ XP Total', value: String(userDoc.totalXp.toLocaleString()), inline: true },
          { name: '💬 Mensajes', value: String(userDoc.messageCount || 0), inline: true },
          { 
            name: '📈 Progreso al siguiente nivel', 
            value: `${progress.xp.toLocaleString()} / ${progress.xpForNextLevel.toLocaleString()} XP (${progress.percent}%)`, 
            inline: false 
          }
        )
        .setColor(0x5865f2)
        .setFooter({ text: `Usa /leaderboard para ver el ranking completo` })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      logger.error('Error en comando /rank:', error);
      
      try {
        // Intentar editar si ya se hizo defer
        if (interaction.deferred) {
          await interaction.editReply({ 
            content: '❌ Hubo un error al obtener tu información de nivel. Por favor, intenta de nuevo.' 
          });
        } else {
          // Si no se hizo defer, responder normalmente
          await interaction.reply({ 
            content: '❌ Hubo un error al obtener tu información de nivel. Por favor, intenta de nuevo.',
            ephemeral: true 
          });
        }
      } catch (replyError) {
        logger.error('Error al responder con mensaje de error:', replyError);
      }
    }
  }
};