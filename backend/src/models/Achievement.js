import mongoose from 'mongoose';

// Esquema para cada tier/nivel de un logro
const AchievementTierSchema = new mongoose.Schema({
  tier: { type: Number, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  target: { type: Number, required: true },
  rewardRoleId: { type: String, default: null },
  emoji: { type: String, default: '🏆' }
});

// Esquema principal de logros configurables
const AchievementSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  
  // Tipo de logro
  type: {
    type: String,
    required: true,
    enum: ['messages', 'reactions', 'reactions_given', 'voice_time', 'boost'],
    index: true
  },
  
  // Información básica
  name: { type: String, required: true },
  description: { type: String, default: '' },
  icon: { type: String, default: '🎯' },
  
  // Niveles/tiers del logro
  tiers: [AchievementTierSchema],
  
  // Estado
  enabled: { type: Boolean, default: true },
  
  // Configuración específica para logro de boost
  boostRoleId: { type: String, default: null },
  
  // ========== NUEVO: Configuración de notificaciones ==========
  notifications: {
    enabled: { type: Boolean, default: true },
    channelId: { type: String, default: null }, // null = mismo canal donde se desbloqueó
    message: { type: String, default: '🎉 {mention} ha desbloqueado: **{achievement}** - {tier}!' }
    // Variables: {mention}, {username}, {achievement}, {tier}, {tierTitle}, {emoji}
  },
  // ============================================================
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Índice compuesto para búsquedas rápidas
AchievementSchema.index({ guildId: 1, type: 1 });
AchievementSchema.index({ guildId: 1, enabled: 1 });

export default mongoose.models.Achievement || mongoose.model('Achievement', AchievementSchema);