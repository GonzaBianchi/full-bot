// backend/src/bot/utils/achievementImageGenerator.js
import { createCanvas, loadImage, GlobalFonts } from '@napi-rs/canvas';
import logger from '../../utils/logger.js';

const TIER_COLORS = [
  '#CD7F32', // Bronce - Tier 1
  '#C0C0C0', // Plata - Tier 2
  '#FFD700', // Oro - Tier 3
  '#00BFFF', // Diamante - Tier 4
  '#9B59B6', // Amatista - Tier 5
  '#E74C3C', // Rubí - Tier 6
  '#2ECC71'  // Esmeralda - Tier 7+
];

/**
 * Formatea el objetivo según el tipo de logro
 */
function formatTarget(type, target) {
  switch (type) {
    case 'messages':
      return `${target.toLocaleString()} mensajes`;
    case 'reactions':
      return `${target.toLocaleString()} reacciones recibidas`;
    case 'reactions_given':
      return `${target.toLocaleString()} reacciones dadas`;
    case 'voice_time':
      const hours = Math.floor(target / 3600);
      const minutes = Math.floor((target % 3600) / 60);
      if (hours > 0) {
        return `${hours}h ${minutes}m en voz`;
      }
      return `${minutes}m en voz`;
    case 'boost':
      return 'Boostear el servidor';
    default:
      return `${target.toLocaleString()}`;
  }
}

/**
 * Convierte emoji a imagen usando una API
 */
async function getEmojiImage(emoji) {
  try {
    // Usar twemoji CDN para obtener imágenes de emojis
    const codePoint = emoji.codePointAt(0).toString(16);
    const url = `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/72x72/${codePoint}.png`;
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Emoji no encontrado');
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return await loadImage(Buffer.from(arrayBuffer));
  } catch (error) {
    logger.warn(`No se pudo cargar emoji ${emoji}:`, error.message);
    return null;
  }
}

/**
 * Genera una imagen de notificación cuando se desbloquea un logro
 */
export async function generateAchievementNotification({
  user,
  achievement,
  tier,
  imageUrl = null,
  blur = 6,
  opacity = 0.7
}) {
  const width = 900;
  const height = 350;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // --- FONDO ---
  let backgroundImage = null;
  if (imageUrl) {
    try {
      const response = await fetch(imageUrl);
      const arrayBuffer = await response.arrayBuffer();
      backgroundImage = await loadImage(Buffer.from(arrayBuffer));
    } catch (error) {
      logger.warn('No se pudo cargar imagen de logro personalizada');
    }
  }

  if (backgroundImage) {
    // Aplicar blur
    ctx.filter = `blur(${blur}px)`;
    
    const scale = Math.max(width / backgroundImage.width, height / backgroundImage.height);
    const x = (width - backgroundImage.width * scale) * 0.5;
    const y = (height - backgroundImage.height * scale) * 0.5;
    
    ctx.drawImage(backgroundImage, x, y, backgroundImage.width * scale, backgroundImage.height * scale);
    ctx.filter = 'none';
    
    // Overlay
    ctx.fillStyle = `rgba(35, 39, 42, ${opacity})`;
    ctx.fillRect(0, 0, width, height);
  } else {
    // Fondo por defecto con degradado
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, '#23272A');
    gradient.addColorStop(1, '#2C2F33');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
  }

  // --- BORDE DE COLOR SEGÚN TIER ---
  const tierColor = TIER_COLORS[Math.min(tier.tier - 1, TIER_COLORS.length - 1)];
  ctx.strokeStyle = tierColor;
  ctx.lineWidth = 8;
  ctx.strokeRect(4, 4, width - 8, height - 8);

  // --- SECCIÓN IZQUIERDA: ICONO DEL LOGRO ---
  const iconSize = 200;
  const iconX = 70;
  const iconY = (height - iconSize) / 2;

  // Círculo con borde de color
  ctx.beginPath();
  ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2 + 5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(35, 39, 42, 0.9)';
  ctx.fill();
  ctx.strokeStyle = tierColor;
  ctx.lineWidth = 6;
  ctx.stroke();

  // Intentar cargar el emoji como imagen
  const emojiImage = await getEmojiImage(achievement.icon || '🏆');
  
  if (emojiImage) {
    // Dibujar emoji como imagen
    const emojiSize = iconSize * 0.75;
    const emojiX = iconX + (iconSize - emojiSize) / 2;
    const emojiY = iconY + (iconSize - emojiSize) / 2;
    ctx.drawImage(emojiImage, emojiX, emojiY, emojiSize, emojiSize);
  } else {
    // Fallback: usar texto con fuente mejorada
    ctx.font = 'bold 110px "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText(achievement.icon || '🏆', iconX + iconSize / 2, iconY + iconSize / 2);
  }

  // --- SECCIÓN DERECHA: INFORMACIÓN ---
  const textX = iconX + iconSize + 60;
  const textStartY = 70;

  // Texto "LOGRO DESBLOQUEADO"
  ctx.font = 'bold 30px sans-serif';
  ctx.fillStyle = tierColor;
  ctx.textAlign = 'left';
  ctx.fillText('LOGRO DESBLOQUEADO', textX, textStartY);

  // Nombre del logro
  ctx.font = 'bold 46px sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(achievement.name, textX, textStartY + 55);

  // Tier desbloqueado con emoji
  const tierEmojiImage = tier.emoji ? await getEmojiImage(tier.emoji) : null;
  
  if (tierEmojiImage) {
    // Dibujar emoji del tier
    ctx.drawImage(tierEmojiImage, textX, textStartY + 105, 36, 36);
    ctx.font = 'bold 34px sans-serif';
    ctx.fillStyle = tierColor;
    ctx.fillText(tier.title, textX + 45, textStartY + 128);
  } else {
    ctx.font = 'bold 34px sans-serif';
    ctx.fillStyle = tierColor;
    ctx.fillText(tier.title, textX, textStartY + 118);
  }

  // Meta alcanzada
  const targetText = formatTarget(achievement.type, tier.target);
  ctx.font = 'bold 26px sans-serif';
  ctx.fillStyle = '#7289DA';
  ctx.fillText(targetText, textX, textStartY + 165);

  // Descripción del tier
  if (tier.description) {
    ctx.font = '24px sans-serif';
    ctx.fillStyle = '#B9BBBE';
    
    // Limitar longitud
    const maxWidth = width - textX - 50;
    const words = tier.description.split(' ');
    let line = '';
    let y = textStartY + 210;
    let lineCount = 0;
    const maxLines = 2;
    
    for (const word of words) {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && line !== '') {
        if (lineCount < maxLines) {
          ctx.fillText(line, textX, y);
          line = word + ' ';
          y += 30;
          lineCount++;
        } else {
          // Truncar si hay más líneas
          ctx.fillText(line.trim() + '...', textX, y);
          break;
        }
      } else {
        line = testLine;
      }
    }
    
    // Dibujar última línea si no se ha dibujado
    if (lineCount < maxLines && line.trim()) {
      ctx.fillText(line, textX, y);
    }
  }

  // --- EFECTO DE BRILLO/SHINE ---
  const shimmerGradient = ctx.createLinearGradient(0, 0, width, height);
  shimmerGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
  shimmerGradient.addColorStop(0.5, `rgba(255, 255, 255, 0.08)`);
  shimmerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = shimmerGradient;
  ctx.fillRect(0, 0, width, height);

  return canvas.toBuffer('image/png');
}