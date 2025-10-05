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
      // Defer reply inmediatamente para evitar timeout
      await interaction.deferReply({ ephemeral: false }).catch(err => {
        logger.error('Error en deferReply:', err);
        throw err;
      });

      const target = interaction.options.getUser('usuario') || interaction.user;
      const guildId = interaction.guild?.id;

      if (!guildId) {
        return await interaction.editReply({ 
          content: 'Este comando solo puede usarse en servidores.' 
        });
      }

      logger.info(`Buscando info de ${target.id} en guild ${guildId}`);

      // Buscar documento del usuario
      const userDoc = await User.findOne({ guildId, userId: target.id }).lean();

      if (!userDoc) {
        return await interaction.editReply({ 
          content: `❌ No se encontró información de nivel para ${target.username}.\nEl usuario aún no ha ganado XP en este servidor.` 
        });
      }

      logger.info(`Usuario encontrado: Level ${userDoc.level}, XP ${userDoc.totalXp}`);

      // Asegurar que los valores numéricos sean válidos
      const level = Number(userDoc.level) || 0;
      const totalXp = Number(userDoc.totalXp) || 0;
      const messageCount = Number(userDoc.messageCount) || 0;

      // Calcular progreso de manera segura
      let currentLevelTotal = 0;
      let nextLevelTotal = 0;
      try {
        currentLevelTotal = xpForLevel(level);
        nextLevelTotal = xpForLevel(level + 1);
      } catch (e) {
        logger.error('Error calculando XP levels:', e);
        currentLevelTotal = 0;
        nextLevelTotal = 100; // fallback
      }

      const xpIntoLevel = Math.max(0, totalXp - currentLevelTotal);
      const xpForNext = Math.max(1, nextLevelTotal - currentLevelTotal); // evitar división por 0
      
      const progress = {
        xp: xpIntoLevel,
        xpForNextLevel: xpForNext,
        percent: Math.min(100, Math.floor((xpIntoLevel / xpForNext) * 100))
      };

      logger.info(`Progreso calculado: ${progress.xp}/${progress.xpForNextLevel} (${progress.percent}%)`);

      // Calcular rank de manera segura
      let rank = 1;
      try {
        const higher = await User.countDocuments({
          guildId: guildId,
          totalXp: { $gt: totalXp }
        });
        rank = higher + 1;
      } catch (e) {
        logger.error('Error calculando rank:', e);
      }

      logger.info(`Rank calculado: #${rank}`);

      // Crear embed
      const embed = new EmbedBuilder()
        .setTitle(`📊 Nivel de ${target.username}`)
        .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 128 }))
        .addFields(
          { name: '🎯 Nivel', value: String(level), inline: true },
          { name: '🏆 Ranking', value: `#${rank}`, inline: true },
          { name: '✨ XP Total', value: totalXp.toLocaleString(), inline: true },
          { name: '💬 Mensajes', value: messageCount.toLocaleString(), inline: true },
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
      logger.info(`Comando /rank ejecutado exitosamente para ${target.username}`);

    } catch (error) {
      logger.error('Error en comando /rank:', error);
      logger.error('Stack trace:', error.stack);
      
      try {
        // Intentar responder con el error
        const errorMessage = process.env.NODE_ENV === 'development' 
          ? `❌ Error: ${error.message}` 
          : '❌ Hubo un error al obtener tu información de nivel. Por favor, intenta de nuevo.';

        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ content: errorMessage });
        } else {
          await interaction.reply({ content: errorMessage, ephemeral: true });
        }
      } catch (replyError) {
        logger.error('Error al responder con mensaje de error:', replyError);
      }
    }
  }
};