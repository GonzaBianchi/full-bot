import mongoose from 'mongoose';

// Esquema para el progreso de un logro específico
const AchievementProgressSchema = new mongoose.Schema({
  achievementId: { type: mongoose.Schema.Types.ObjectId, ref: 'Achievement', required: true },
  currentValue: { type: Number, default: 0 }, // Valor actual (ej: 543 mensajes)
  unlockedTiers: [{ type: Number }], // Tiers desbloqueados [1, 2]
  lastUnlockedAt: { type: Date, default: null }
});

// Esquema principal de progreso del usuario
const UserAchievementSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true },
  
  // Estadísticas generales (para cálculos rápidos)
  stats: {
    totalMessages: { type: Number, default: 0 },
    totalReactions: { type: Number, default: 0 },
    totalReactionsGiven: { type: Number, default: 0 }, // Reacciones recibidas
    totalVoiceTime: { type: Number, default: 0 }, // En segundos
    hasBoosted: { type: Boolean, default: false }
  },
  
  // Progreso individual por logro
  achievements: [AchievementProgressSchema],
  
  // Voice tracking (sesión actual)
  currentVoiceSession: {
    channelId: { type: String, default: null },
    joinedAt: { type: Date, default: null }
  },
  
  updatedAt: { type: Date, default: Date.now }
});

// Índice compuesto
UserAchievementSchema.index({ userId: 1, guildId: 1 }, { unique: true });

// Método helper para obtener progreso de un logro específico
UserAchievementSchema.methods.getAchievementProgress = function(achievementId) {
  return this.achievements.find(a => a.achievementId.toString() === achievementId.toString());
};

// Método helper para actualizar estadísticas
UserAchievementSchema.methods.incrementStat = async function(statType, value = 1) {
  if (this.stats[statType] !== undefined) {
    this.stats[statType] += value;
    this.updatedAt = new Date();
    await this.save();
  }
};

export default mongoose.models.UserAchievement || mongoose.model('UserAchievement', UserAchievementSchema);