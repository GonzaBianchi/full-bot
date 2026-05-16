import mongoose from 'mongoose';
import { xpForLevel, levelFromXp } from '../bot/utils/levelSystem.js';

const UserSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  guildId: { type: String, required: true, index: true },
  xp: { type: Number, default: 0 },
  level: { type: Number, default: 0 },
  totalXp: { type: Number, default: 0 },
  messageCount: { type: Number, default: 0 },
  lastMessageAt: { type: Date, default: null },
  username: { type: String, default: null },
  discriminator: { type: String, default: null },
  avatar: { type: String, default: null },
  
  // ========== NUEVO: Cumpleaños ==========
  birthday: {
    day: { type: Number, min: 1, max: 31, default: null },
    month: { type: Number, min: 1, max: 12, default: null },
    timezone: { type: String, default: 'America/New_York' }, // IANA timezone
    lastCelebrated: { type: Date, default: null } // Última vez que se celebró (evita duplicados)
  }
  // ========================================
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

// ========== NUEVO: Método para setear cumpleaños ==========
UserSchema.statics.setBirthday = async function(userId, day, month, timezone) {
  const User = this;
  
  if (day < 1 || day > 31 || month < 1 || month > 12) {
    throw new Error('Fecha de cumpleaños inválida');
  }

  // Validar días por mes usando un año bisiesto de referencia para permitir el 29/02
  const daysInMonth = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  if (day > daysInMonth[month - 1]) {
    throw new Error(`El mes ${month} no tiene ${day} días`);
  }

  // Validar timezone IANA
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
  } catch {
    throw new Error(`Timezone inválida: ${timezone}`);
  }

  const result = await User.updateMany(
    { userId },
    {
      $set: {
        'birthday.day': day,
        'birthday.month': month,
        'birthday.timezone': timezone
      }
    }
  );
  
  return result;
};

// ========== NUEVO: Método para obtener próximos cumpleaños ==========
UserSchema.statics.getUpcomingBirthdays = async function(guildId, limit = 10) {
  const User = this;
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentDay = now.getDate();
  
  // Obtener usuarios con cumpleaños configurado en este guild
  const users = await User.find({ 
    guildId,
    'birthday.day': { $ne: null },
    'birthday.month': { $ne: null }
  }).lean();
  
  // Calcular días hasta el cumpleaños
  const usersWithDays = users.map(user => {
    const birthdayMonth = user.birthday.month;
    const birthdayDay = user.birthday.day;
    
    let daysUntil;
    if (birthdayMonth === currentMonth && birthdayDay === currentDay) {
      daysUntil = 0; // Hoy es su cumpleaños
    } else if (birthdayMonth === currentMonth && birthdayDay > currentDay) {
      daysUntil = birthdayDay - currentDay;
    } else if (birthdayMonth > currentMonth) {
      // Cumpleaños este año
      const thisYear = now.getFullYear();
      const birthday = new Date(thisYear, birthdayMonth - 1, birthdayDay);
      daysUntil = Math.ceil((birthday - now) / (1000 * 60 * 60 * 24));
    } else {
      // Cumpleaños el próximo año
      const nextYear = now.getFullYear() + 1;
      const birthday = new Date(nextYear, birthdayMonth - 1, birthdayDay);
      daysUntil = Math.ceil((birthday - now) / (1000 * 60 * 60 * 24));
    }
    
    return { ...user, daysUntil };
  });
  
  // Ordenar por días hasta cumpleaños
  usersWithDays.sort((a, b) => a.daysUntil - b.daysUntil);
  
  return usersWithDays.slice(0, limit);
};
// ===========================================================

UserSchema.statics.updateDiscordInfo = async function(guildId, userId, discordUser) {
  await this.updateOne(
    { guildId, userId },
    { $set: {
      username: discordUser.username,
      discriminator: discordUser.discriminator,
      avatar: discordUser.displayAvatarURL({ dynamic: true, size: 128 })
    }}
  );
};

UserSchema.index({ guildId: 1, userId: 1 }, { unique: true });
UserSchema.index({ guildId: 1, totalXp: -1 });
UserSchema.index({ userId: 1 }); // Para buscar cumpleaños globalmente
UserSchema.index({ 'birthday.day': 1, 'birthday.month': 1 }); // Para búsqueda de cumpleaños

export default mongoose.models.User || mongoose.model('User', UserSchema);