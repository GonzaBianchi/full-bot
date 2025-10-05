import mongoose from 'mongoose';

// Esquema para cada tier/nivel de un logro
const AchievementTierSchema = new mongoose.Schema({
  tier: { type: Number, required: true }, // 1, 2, 3, etc.
  title: { type: String, required: true }, // "Novato", "Experto", etc.
  description: { type: String, default: '' },
  target: { type: Number, required: true }, // Meta: 100, 1000, 10000, etc.
  rewardRoleId: { type: String, default: null }, // Rol que se otorga al completar
  emoji: { type: String, default: '🏆' } // Emoji visual
});

// Esquema principal de logros configurables
const AchievementSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  
  // Tipo de logro
  type: {
    type: String,
    required: true,
    enum: ['messages', 'reactions', 'voice_time', 'boost'],
    index: true
  },
  
  // Información básica
  name: { type: String, required: true }, // "Mensajero", "Reaccionador", etc.
  description: { type: String, default: '' },
  icon: { type: String, default: '🎯' }, // Emoji o URL de imagen
  
  // Niveles/tiers del logro
  tiers: [AchievementTierSchema],
  
  // Estado
  enabled: { type: Boolean, default: true },
  
  // Configuración específica para logro de boost
  boostRoleId: { type: String, default: null }, // ID del rol de booster
  
  // Metadata
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Índice compuesto para búsquedas rápidas
AchievementSchema.index({ guildId: 1, type: 1 });
AchievementSchema.index({ guildId: 1, enabled: 1 });

export default mongoose.models.Achievement || mongoose.model('Achievement', AchievementSchema);