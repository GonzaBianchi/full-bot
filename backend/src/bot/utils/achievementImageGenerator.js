// backend/src/utils/achievementImageGenerator.js
import { createCanvas, loadImage } from '@napi-rs/canvas';
import axios from 'axios';
import logger from './logger.js';

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
  const width = 800;
  const height = 300;
  const canvas = createCanvas(width, height);
  const ctx = canvas.getContext('2d');

  // --- FONDO ---
  let backgroundImage = null;
  if (imageUrl) {
    try {
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      backgroundImage = await loadImage(Buffer.from(response.data));
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
  const iconSize = 180;
  const iconX = 60;
  const iconY = (height - iconSize) / 2;

  // Círculo con borde de color
  ctx.beginPath();
  ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2 + 5, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(35, 39, 42, 0.9)';
  ctx.fill();
  ctx.strokeStyle = tierColor;
  ctx.lineWidth = 6;
  ctx.stroke();

  // Icono emoji (centrado)
  ctx.font = 'bold 100px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(achievement.icon || '🏆', iconX + iconSize / 2, iconY + iconSize / 2);

  // --- SECCIÓN DERECHA: INFORMACIÓN ---
  const textX = iconX + iconSize + 50;
  const textStartY = 70;

  // Texto "LOGRO DESBLOQUEADO"
  ctx.font = 'bold 28px sans-serif';
  ctx.fillStyle = tierColor;
  ctx.textAlign = 'left';
  ctx.fillText('LOGRO DESBLOQUEADO', textX, textStartY);

  // Nombre del logro
  ctx.font = 'bold 42px sans-serif';
  ctx.fillStyle = '#FFFFFF';
  ctx.fillText(achievement.name, textX, textStartY + 50);

  // Tier desbloqueado
  ctx.font = 'bold 32px sans-serif';
  ctx.fillStyle = tierColor;
  ctx.fillText(`${tier.emoji || '⭐'} ${tier.title}`, textX, textStartY + 100);

  // Descripción del tier
  if (tier.description) {
    ctx.font = '22px sans-serif';
    ctx.fillStyle = '#B9BBBE';
    
    // Limitar longitud
    const maxWidth = width - textX - 40;
    const words = tier.description.split(' ');
    let line = '';
    let y = textStartY + 145;
    
    for (const word of words) {
      const testLine = line + word + ' ';
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && line !== '') {
        ctx.fillText(line, textX, y);
        line = word + ' ';
        y += 28;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, textX, y);
  }

  // --- EFECTO DE BRILLO/SHINE ---
  const shimmerGradient = ctx.createLinearGradient(0, 0, width, height);
  shimmerGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
  shimmerGradient.addColorStop(0.5, `rgba(255, 255, 255, 0.1)`);
  shimmerGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
  ctx.fillStyle = shimmerGradient;
  ctx.fillRect(0, 0, width, height);

  return canvas.toBuffer('image/png');
}

// Helper: rectángulo redondeado
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