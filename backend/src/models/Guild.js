import mongoose from 'mongoose';

const GuildSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  xpMultiplier: { type: Number, default: 1 },
  ignoredChannels: { type: [String], default: [] },
  levelRoles: [{ level: Number, roleId: String }],
  leaderboardEnabled: { type: Boolean, default: true },
  // Notificaciones de leveo
  levelUpEnabled: { type: Boolean, default: true },
  levelUpChannelId: { type: String, default: null },
  levelUpMessage: { type: String, default: '🎉 {mention} ha subido al nivel {level}!' }
}, { timestamps: true });

export default mongoose.models.Guild || mongoose.model('Guild', GuildSchema);