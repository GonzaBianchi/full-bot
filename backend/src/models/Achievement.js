import mongoose from 'mongoose';

const achievementSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  achievements: {
    birthday: { type: Boolean, default: false },
    booster: { type: Boolean, default: false },
    messages: { type: Number, default: 0 },
    messagesLevel: { type: Number, default: 0 },
    reactions: { type: Number, default: 0 },
    reactionsLevel: { type: Number, default: 0 },
    voiceMinutes: { type: Number, default: 0 },
    voiceLevel: { type: Number, default: 0 }
  }
});

achievementSchema.index({ userId: 1, guildId: 1 }, { unique: true });

export default mongoose.model('Achievement', achievementSchema);
