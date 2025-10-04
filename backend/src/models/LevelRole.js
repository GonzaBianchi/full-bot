import mongoose from 'mongoose';

const LevelRoleSchema = new mongoose.Schema({
  guildId: { type: String, required: true },
  roleId: { type: String, required: true },
  roleName: { type: String, required: true },
  minLevel: { type: Number, required: false, default: null }
});
LevelRoleSchema.index({ guildId: 1, minLevel: 1 }, { unique: true, partialFilterExpression: { minLevel: { $type: 'number' } } });
export const LevelRole = mongoose.models.LevelRole || mongoose.model('LevelRole', LevelRoleSchema);
