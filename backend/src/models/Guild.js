import mongoose from 'mongoose';

const GuildSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  xpMultiplier: { type: Number, default: 1 },
  ignoredChannels: { type: [String], default: [] },
  levelRoles: [{ level: Number, roleId: String }],
  
  // Modo de roles: true = apilar roles (mantener todos), false = solo el más alto
  stackRoles: { type: Boolean, default: false },
  
  leaderboardEnabled: { type: Boolean, default: true },
  
  // Notificaciones de leveo
  levelUpEnabled: { type: Boolean, default: true },
  levelUpChannelId: { type: String, default: null },
  levelUpMessage: { type: String, default: '🎉 {mention} ha subido al nivel {level}!' },
  
  // Auto-roles para nuevos miembros
  autoRoles: {
    enabled: { type: Boolean, default: false },
    roles: { type: [String], default: [] }, // IDs de roles por defecto
    restoreLevelRoles: { type: Boolean, default: true }, // Restaurar roles de nivel si ya tenía XP
    welcomeChannelId: { type: String, default: null }, // Canal para mensaje de bienvenida (opcional)
    welcomeMessage: { type: String, default: '👋 ¡Bienvenido {mention} al servidor!' }
  }
}, { timestamps: true });

export default mongoose.models.Guild || mongoose.model('Guild', GuildSchema);