import mongoose from 'mongoose';

const OptionSchema = new mongoose.Schema({
  emojiId: { type: String, default: null }, // id for custom emoji
  emojiIdentifier: { type: String, required: true }, // unicode char or "name:id"
  label: { type: String, default: '' },
  roleId: { type: String, required: true }
}, { _id: false });

const RoleMenuSchema = new mongoose.Schema({
  guildId: { type: String, required: true, index: true },
  title: { type: String, required: true },
  channelId: { type: String, required: true },
  messageId: { type: String, default: null },
  exclusive: { type: Boolean, default: false }, // if true, only one role from this menu can be active
  published: { type: Boolean, default: false },
  options: { type: [OptionSchema], default: [] }
}, { timestamps: true });

export default mongoose.model('RoleMenu', RoleMenuSchema);
