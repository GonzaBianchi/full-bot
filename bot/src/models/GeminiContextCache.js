import mongoose from 'mongoose';

const GeminiContextCacheSchema = new mongoose.Schema({
  channelId: { type: String, required: true, unique: true },
  contextCacheId: { type: String, required: true },
  updatedAt: { type: Date, default: Date.now }
});

export const GeminiContextCache = mongoose.model('GeminiContextCache', GeminiContextCacheSchema);
