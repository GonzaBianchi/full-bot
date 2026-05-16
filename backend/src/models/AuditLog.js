import mongoose from 'mongoose';

const auditLogSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  action: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed, default: {} },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 * 30 } // auto-delete after 30 days
});

auditLogSchema.index({ guildId: 1, createdAt: -1 });

export default mongoose.model('AuditLog', auditLogSchema);
