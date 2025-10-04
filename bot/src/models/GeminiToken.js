import mongoose from 'mongoose';

const GeminiTokenSchema = new mongoose.Schema({
  month: { type: String, required: true, unique: true }, // formato: AAAA-MM
  used: { type: Number, required: true, default: 0 }
});

export const GeminiToken = mongoose.models.GeminiToken || mongoose.model('GeminiToken', GeminiTokenSchema);
