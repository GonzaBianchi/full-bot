import mongoose from 'mongoose';

const GuildConfigSchema = new mongoose.Schema({
  guildId: { type: String, required: true, unique: true },
  welcomeChannelId: { type: String, default: null },
  welcomeMessage: { type: String, default: null },
  xpCommandsChannelId: { type: String, default: null }, // Canal para comandos de XP
  achievementsChannelId: { type: String, default: null }, // Canal para logros
  logsChannelId: { type: String, default: null }, // Canal de logs generales
  levelRoles: [
    {
      roleId: String,
      minLevel: Number
    }
  ],
  xpMultiplier: { type: Number, default: 1 },
  // Puedes agregar más campos de configuración por servidor aquí
});

export default mongoose.model('GuildConfig', GuildConfigSchema);
