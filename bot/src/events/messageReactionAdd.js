import Achievement from '../models/Achievement.js';
import { LOGROS, LEVELS } from '../utils/achievements.js';
import { generateAchievementImage } from '../utils/achievementImage.js';

const userReactedMessages = new Map(); // userId: Set(messageId)

export default {
  name: 'messageReactionAdd',
  async execute(reaction, user) {
    if (user.bot) return;
    const member = reaction.message.guild?.members.cache.get(user.id);
    if (!member || member.roles.cache.some(r => r.name === 'Bots')) return;
    if (!reaction.message.guild) return;

    // Solo contar una reacción por mensaje por usuario
    const key = `${user.id}:${reaction.message.id}`;
    if (userReactedMessages.has(key)) return;
    userReactedMessages.set(key, true);

    let achievement = await Achievement.findOneAndUpdate(
      { userId: user.id, guildId: reaction.message.guild.id },
      { $setOnInsert: { userId: user.id, guildId: reaction.message.guild.id, achievements: {} } },
      { upsert: true, new: true }
    );
    achievement.achievements.reactions = (achievement.achievements.reactions || 0) + 1;

    // Revisar si sube de nivel
    const currentLevel = achievement.achievements.reactionsLevel || 0;
    const nextLevel = currentLevel < LEVELS.reactions.length ? LEVELS.reactions[currentLevel] : null;
    if (nextLevel && achievement.achievements.reactions >= nextLevel) {
      achievement.achievements.reactionsLevel = currentLevel + 1;
      // Anunciar logro
      const logro = LOGROS.reactions[currentLevel];
      const logrosChannel = reaction.message.guild.channels.cache.get('1269848036545134654');
      if (logrosChannel) {
        const imgBuffer = await generateAchievementImage({
          type: 'reactions',
          level: currentLevel,
          title: logro.title,
          desc: logro.desc
        });
        logrosChannel.send({
          content: `¡Felicidades <@${user.id}>! Has desbloqueado un logro.\n¡Consulta tu progreso con /logros!`,
          files: [{ attachment: imgBuffer, name: 'logro.png' }]
        });
      }
      // --- Rol por máximo nivel de reacciones ---
      if (achievement.achievements.reactionsLevel === LEVELS.reactions.length) {
        const maxReactRole = reaction.message.guild.roles.cache.get('1387090466335358996');
        const member = reaction.message.guild.members.cache.get(user.id);
        if (maxReactRole && member && !member.roles.cache.has(maxReactRole.id)) {
          await member.roles.add(maxReactRole, 'Alcanzó el máximo logro de reacciones');
        }
      }
    }
    // --- FELICITACIÓN POR 100% DE LOGROS ---
    const achData = achievement.achievements;
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
        const premioChannel = reaction.message.guild.channels.cache.get('752883098059800650');
        if (premioChannel) {
          await premioChannel.send({
            content: `🎉 ¡<@${user.id}> es la PRIMERA persona en completar el 100% de TODOS los logros!\nPor favor, ve al canal <#1382508364772151349> para reclamar tu premio. <@&1386701159279890584>`
          });
        }
        // Dar rol especial
        const role = reaction.message.guild.roles.cache.get('1386701159279890584');
        const member = reaction.message.guild.members.cache.get(user.id);
        if (role && member && !member.roles.cache.has(role.id)) {
          await member.roles.add(role, 'Completó todos los logros');
        }
      }
    }
    await achievement.save();
  }
};
