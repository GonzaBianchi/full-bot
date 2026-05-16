// backend/src/bot/commands/rank.js
import { SlashCommandBuilder, AttachmentBuilder } from 'discord.js';
import User from '../../models/User.js';
import Guild from '../../models/Guild.js';
import { xpForLevel } from '../utils/levelSystem.js';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import logger from '../../utils/logger.js';
import { getRankCard, setRankCard } from '../../utils/rankCardCache.js';

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

      logger.info(`Generando rank card para ${target.id} en guild ${guildId}`);

      // Buscar documento del usuario
      const userDoc = await User.findOne({ guildId, userId: target.id }).lean();

      if (!userDoc) {
        return await interaction.editReply({
          content: `❌ No se encontró información de nivel para ${target.username}.\nEl usuario aún no ha ganado XP en este servidor.`
        });
      }

      // Servir desde caché si está disponible
      const cached = getRankCard(guildId, target.id);
      if (cached) {
        const attachment = new AttachmentBuilder(cached, { name: 'rank.png' });
        return await interaction.editReply({ files: [attachment] });
      }

      // Buscar configuración de imagen del guild
      const guildConfig = await Guild.findOne({ guildId }).lean();
      const imageConfig = guildConfig?.images?.rankCard || {
        url: null,
        blur: 8,
        opacity: 0.5
      };

      logger.info(`Config de imagen: URL=${imageConfig.url ? 'custom' : 'default'}, blur=${imageConfig.blur}, opacity=${imageConfig.opacity}`);

      // Asegurar que los valores numéricos sean válidos
      const level = Number(userDoc.level) || 0;
      const totalXp = Number(userDoc.totalXp) || 0;
      const messageCount = Number(userDoc.messageCount) || 0;

      // Calcular progreso
      let currentLevelTotal = 0;
      let nextLevelTotal = 0;
      try {
        currentLevelTotal = xpForLevel(level);
        nextLevelTotal = xpForLevel(level + 1);
      } catch (e) {
        logger.error('Error calculando XP levels:', e);
        currentLevelTotal = 0;
        nextLevelTotal = 100;
      }

      const xpIntoLevel = Math.max(0, totalXp - currentLevelTotal);
      const xpForNext = Math.max(1, nextLevelTotal - currentLevelTotal);
      const percent = Math.min(100, Math.floor((xpIntoLevel / xpForNext) * 100));

      // Calcular rank
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

      // === GENERAR IMAGEN DE RANK CARD ===
      const width = 1400;
      const height = 400;
      const canvas = createCanvas(width, height);
      const ctx = canvas.getContext('2d');

      // --- FONDO CON IMAGEN PERSONALIZADA ---
      let backgroundImage = null;
      
      // Intentar cargar imagen personalizada
      if (imageConfig.url) {
        try {
          logger.info(`Cargando imagen personalizada: ${imageConfig.url}`);
          const response = await fetch(imageConfig.url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const arrayBuffer = await response.arrayBuffer();
          backgroundImage = await loadImage(Buffer.from(arrayBuffer));
          logger.info('✅ Imagen personalizada cargada correctamente');
        } catch (error) {
          logger.warn(`No se pudo cargar imagen personalizada: ${error.message}. Usando fondo por defecto.`);
          backgroundImage = null;
        }
      }

      if (backgroundImage) {
        // Aplicar blur configurado
        ctx.filter = `blur(${imageConfig.blur}px)`;
        
        // Calcular escala para cubrir todo el canvas manteniendo proporción
        const scale = Math.max(width / backgroundImage.width, height / backgroundImage.height);
        const x = (width - backgroundImage.width * scale) * 0.5;
        const y = (height - backgroundImage.height * scale) * 0.5;
        
        ctx.drawImage(backgroundImage, x, y, backgroundImage.width * scale, backgroundImage.height * scale);
        ctx.filter = 'none';
        
        // Overlay con opacidad configurada
        ctx.fillStyle = `rgba(35, 39, 42, ${imageConfig.opacity})`;
        ctx.fillRect(0, 0, width, height);
      } else {
        // Fondo por defecto con degradado
        const gradient = ctx.createLinearGradient(0, 0, 0, height);
        gradient.addColorStop(0, '#23272A');
        gradient.addColorStop(1, '#2C2F33');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      }

      // Card interna con borde redondeado
      ctx.fillStyle = 'rgba(35, 39, 42, 0.5)';
      roundRect(ctx, 25, 25, width - 50, height - 50, 15);
      ctx.fill();

      // --- AVATAR ---
      const avatarSize = 280;
      const avatarX = 50;
      const avatarY = 60;
      const avatarURL = target.displayAvatarURL({ extension: 'png', size: 512 });
      
      try {
        const avatar = await loadImage(avatarURL);
        ctx.save();
        ctx.beginPath();
        ctx.arc(avatarX + avatarSize / 2, avatarY + avatarSize / 2, avatarSize / 2, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);
        ctx.restore();
      } catch (error) {
        logger.warn(`No se pudo cargar avatar de ${target.username}: ${error.message}`);
      }
      
      // Indicador de estado
      let statusColor = '#747F8D'; // offline por defecto
      try {
        const member = await interaction.guild.members.fetch(target.id);
        const presence = member?.presence?.status || 'offline';
        switch (presence) {
          case 'online': statusColor = '#43B581'; break;
          case 'idle': statusColor = '#FAA61A'; break;
          case 'dnd': statusColor = '#F04747'; break;
        }
      } catch (e) {
        logger.warn('No se pudo obtener presencia del miembro');
      }

      const statusSize = 48;
      ctx.beginPath();
      ctx.arc(avatarX + avatarSize - 35, avatarY + avatarSize - 35, statusSize, 0, Math.PI * 2, true);
      ctx.fillStyle = statusColor;
      ctx.fill();
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#23272A';
      ctx.stroke();

      // --- NOMBRE DE USUARIO ---
      ctx.font = 'bold 48px sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'left';
      ctx.fillText(target.username, 360, 280);

      // --- RANGO ---
      ctx.font = 'bold 42px sans-serif';
      ctx.fillStyle = '#B0B0B0';
      ctx.fillText('RANGO', 800, 100);
      ctx.font = 'bold 95px sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.fillText(`#${rank}`, 800, 180);
      
      // --- NIVEL ---
      ctx.font = 'bold 42px sans-serif';
      ctx.fillStyle = '#3CB4E7';
      ctx.fillText('NIVEL', 1100, 100);
      ctx.font = 'bold 95px sans-serif';
      ctx.fillStyle = '#3CB4E7';
      ctx.fillText(`${level}`, 1100, 180);

      // --- BARRA DE PROGRESO ---
      const barX = 360;
      const barY = 300;
      const barWidth = 990;
      const barHeight = 45;
      
      // Fondo de la barra
      ctx.fillStyle = 'rgba(68, 75, 83, 0.5)';
      roundRect(ctx, barX, barY, barWidth, barHeight, barHeight / 2);
      ctx.fill();
      
      // Barra de progreso con gradiente
      const progressWidth = barWidth * (percent / 100);
      if (progressWidth > 0) {
        const gradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
        gradient.addColorStop(0, '#3CB4E7');
        gradient.addColorStop(1, '#73E6FF');
        
        ctx.fillStyle = gradient;
        roundRect(ctx, barX, barY, progressWidth, barHeight, barHeight / 2);
        ctx.fill();
      }

      // Texto de XP
      ctx.font = '32px sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'right';
      const formatXP = (xp) => xp >= 1000 ? (xp / 1000).toFixed(2).replace(/\.00$/, '') + 'K' : xp;
      ctx.fillText(`${formatXP(xpIntoLevel)} / ${formatXP(xpForNext)} XP`, barX + barWidth - 10, barY - 15);

      // Efecto de brillo sutil
      const shimmer = ctx.createLinearGradient(0, 0, width, height);
      shimmer.addColorStop(0, 'rgba(255, 255, 255, 0)');
      shimmer.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
      shimmer.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = shimmer;
      ctx.fillRect(0, 0, width, height);

      // === ENVIAR IMAGEN ===
      const buffer = canvas.toBuffer('image/png');
      setRankCard(guildId, target.id, buffer);
      const attachment = new AttachmentBuilder(buffer, { name: 'rank.png' });

      await interaction.editReply({ files: [attachment] });
      logger.info(`✅ Rank card generada exitosamente para ${target.username}`);

    } catch (error) {
      logger.error('Error en comando /rank:', error);
      logger.error('Stack trace:', error.stack);
      
      try {
        const errorMessage = process.env.NODE_ENV === 'development' 
          ? `❌ Error: ${error.message}` 
          : '❌ Hubo un error al generar tu rank card. Por favor, intenta de nuevo.';

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

// Helper: dibujar rectángulo con bordes redondeados
function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}