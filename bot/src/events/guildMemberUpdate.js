import Achievement from '../models/Achievement.js';
import { LOGROS } from '../utils/achievements.js';
import { generateAchievementImage } from '../utils/achievementImage.js';

export default {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember) {
    // Solo usuarios reales
    if (newMember.user.bot || newMember.roles.cache.some(r => r.name === 'Bots')) return;
    // Si el usuario ya tenía el logro, no hacer nada
    let achievement = await Achievement.findOne({ userId: newMember.id, guildId: newMember.guild.id });
    if (achievement && achievement.achievements.booster) return;
    // Si el usuario ahora es booster
    if (!oldMember.premiumSince && newMember.premiumSince) {
      achievement = await Achievement.findOneAndUpdate(
        { userId: newMember.id, guildId: newMember.guild.id },
        { $setOnInsert: { userId: newMember.id, guildId: newMember.guild.id, achievements: { booster: true } } },
        { upsert: true, new: true }
      );
      achievement.achievements.booster = true;
      await achievement.save();
      // Anunciar logro
      const logrosChannel = newMember.guild.channels.cache.get('1269848036545134654');
      if (logrosChannel) {
        const imgBuffer = await generateAchievementImage({
          type: 'booster',
          level: 0,
          title: LOGROS.booster.title,
          desc: LOGROS.booster.description
        });
        logrosChannel.send({
          content: `¡Felicidades ${newMember}! Has desbloqueado un logro.\n¡Consulta tu progreso con /logros!`,
          files: [{ attachment: imgBuffer, name: 'logro.png' }]
        });
      }
      // --- FELICITACIÓN POR 100% DE LOGROS ---
      const achData = achievement.achievements;
      const LEVELS = (await import('../utils/achievements.js')).LEVELS;
      const allCompleted = achData.birthday && achData.booster &&
        (achData.messagesLevel >= LEVELS.messages.length) &&
        (achData.reactionsLevel >= LEVELS.reactions.length) &&
        (achData.voiceLevel >= LEVELS.voice.length);
      if (allCompleted) {
        const already = await Achievement.countDocuments({
          'achievements.birthday': true,
          'achievements.booster': true,
          'achievements.messagesLevel': { $gte: LEVELS.messages.length },
          'achievements.reactionsLevel': { $gte: LEVELS.reactions.length },
          'achievements.voiceLevel': { $gte: LEVELS.voice.length }
        });
        if (already === 1) {
          const premioChannel = newMember.guild.channels.cache.get('752883098059800650');
          if (premioChannel) {
            await premioChannel.send({
              content: `🎉 ¡<@${newMember.id}> es la PRIMERA persona en completar el 100% de TODOS los logros!\nPor favor, ve al canal <#1382508364772151349> para reclamar tu premio. <@&1386701159279890584>`
            });
          }
          // Dar rol especial
          const role = newMember.guild.roles.cache.get('1386701159279890584');
          if (role && !newMember.roles.cache.has(role.id)) {
            await newMember.roles.add(role, 'Completó todos los logros');
          }
        }
      }
    }
  }
};
