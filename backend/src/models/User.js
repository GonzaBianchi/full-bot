import mongoose from 'mongoose';
import { xpForLevel, levelFromXp } from '../bot/utils/levelSystem.js';

const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true },
  xp: { type: Number, default: 0 }, // xp acumulada en el nivel actual (opcional)
  level: { type: Number, default: 0 },
  totalXp: { type: Number, default: 0 },
  messageCount: { type: Number, default: 0 },
  lastMessageAt: { type: Date, default: null }
}, { timestamps: true });

UserSchema.methods.getXpProgress = function() {
  const currentLevelTotal = xpForLevel(this.level);
  const nextLevelTotal = xpForLevel(this.level + 1);
  const xpIntoLevel = this.totalXp - currentLevelTotal;
  const xpForNext = Math.max(0, nextLevelTotal - currentLevelTotal);
  return {
    xp: Math.max(0, xpIntoLevel),
    xpForNextLevel: xpForNext,
    percent: xpForNext > 0 ? Math.floor((xpIntoLevel / xpForNext) * 100) : 100
  };
};

UserSchema.methods.getRank = async function() {
  // Rank by totalXp descending
  const higher = await mongoose.model('User').countDocuments({
    guildId: this.guildId,
    totalXp: { $gt: this.totalXp }
  });
  return higher + 1;
};

UserSchema.statics.addXp = async function(guildId, userId, amount) {
  const User = this;
  let user = await User.findOne({ guildId, userId });
  if (!user) {
    user = new User({ guildId, userId });
  }

  user.totalXp += amount;
  user.messageCount = (user.messageCount || 0) + 1;
  user.lastMessageAt = new Date();

  const oldLevel = user.level;
  const newLevel = levelFromXp(user.totalXp);
  if (newLevel !== oldLevel) {
    user.level = newLevel;
  }

  await user.save();

  return { user, leveledUp: newLevel > oldLevel, oldLevel, newLevel };
};

export default mongoose.models.User || mongoose.model('User', UserSchema);