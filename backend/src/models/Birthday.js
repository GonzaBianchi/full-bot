import mongoose from 'mongoose';

const birthdaySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  guildId: { type: String, required: true },
  birthday: { type: String, required: true } // formato DD-MM
});

birthdaySchema.index({ userId: 1, guildId: 1 }, { unique: true });

export default mongoose.model('Birthday', birthdaySchema);
