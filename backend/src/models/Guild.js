import mongoose from 'mongoose';

const GuildSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true, index: true },
  
  // XP y niveles
  xpMultiplier: { type: Number, default: 1.0 },
  ignoredChannels: [{ type: String }],
  
  // Notificaciones de level up
  levelUpEnabled: { type: Boolean, default: true },
  levelUpChannelId: { type: String, default: null },
  levelUpMessage: { type: String, default: '🎉 {mention} ha subido al nivel **{level}**!' },
  
  // Roles de nivel
  levelRoles: [{
    level: { type: Number, required: true },
    roleId: { type: String, required: true }
  }],
  
  // ========== NUEVO: Configuración de imágenes ==========
  images: {
    // Banner para la rank card
    rankCard: {
      url: { type: String, default: null }, // URL de la imagen
      blur: { type: Number, default: 8, min: 0, max: 20 }, // Intensidad del blur
      opacity: { type: Number, default: 0.5, min: 0, max: 1 } // Opacidad del overlay
    },
    
    // Imagen para notificaciones de logros
    achievementNotification: {
      url: { type: String, default: null },
      blur: { type: Number, default: 6, min: 0, max: 20 },
      opacity: { type: Number, default: 0.7, min: 0, max: 1 }
    }
  },
  // ======================================================
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

GuildSchema.index({ guildId: 1 });

export default mongoose.models.Guild || mongoose.model('Guild', GuildSchema);