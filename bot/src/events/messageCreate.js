// --- INICIO BLOQUE XP Y GEMINI ---
import Achievement from '../models/Achievement.js';
import GuildConfig from '../models/GuildConfig.js';
import { LOGROS, LEVELS } from '../utils/achievements.js';
import { generateAchievementImage } from '../utils/achievementImage.js';
import { addXp } from '../utils/xpSystem.js';
import { updateMemberRoles } from '../utils/roleManager.js';
import { XP_PER_MESSAGE, XP_COOLDOWN } from '../config.js';
import User from '../models/User.js';
import axios from 'axios';
import dotenv from 'dotenv';
import { GeminiToken } from '../models/GeminiToken.js';
import { GeminiContextCache } from '../models/GeminiContextCache.js';
dotenv.config();

const cooldowns = new Map();
const LEVEL_UP_CHANNEL_ID = '1269848036545134654';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key=' + GEMINI_API_KEY;
const GEMINI_CHANNEL_ID = '752883098059800650';

export default {
  name: 'messageCreate',
  async execute(message, client) {
    // Ignorar bots y miembros con rol "Bots"
    if (message.author.bot) return;
    const member = message.guild?.members.cache.get(message.author.id);
    if (!member || member.roles.cache.some(r => r.name === 'Bots')) return;
    if (!message.guild) return;

    // --- Obtener configuración dinámica del servidor ---
    const guildConfig = await GuildConfig.findOne({ guildId: message.guild.id });

    // --- XP automático por mensajes ---
    const userId = message.author.id;
    const guildId = message.guild.id;
    const key = `${userId}-${guildId}`;
    const now = Date.now();
    if (!(cooldowns.has(key) && now < cooldowns.get(key))) {
      const oldUser = await User.findOne({ userId, guildId });
      const oldLevel = oldUser ? oldUser.level : 1;
      const xpGanada = Math.floor(Math.random() * (XP_PER_MESSAGE.max - XP_PER_MESSAGE.min + 1)) + XP_PER_MESSAGE.min;
      const user = await addXp(userId, guildId, xpGanada);
      await updateMemberRoles(message.member, user.level);
      cooldowns.set(key, now + XP_COOLDOWN);
      if (user.level > oldLevel) {
        const mensaje = `<a:love:1375278293921828904> Felicitaciones nakama ${message.author}, has avanzado a una nueva parte del Grand Line y ahora eres un pirata de nivel ${user.level}!<:LuffyWow:1375278276620058696>`;
        // Canal de level up configurable
        const levelUpChannelId = guildConfig?.levelUpChannelId || LEVEL_UP_CHANNEL_ID;
        const levelUpChannel = message.guild.channels.cache.get(levelUpChannelId);
        if (levelUpChannel) {
          await levelUpChannel.send({ content: mensaje });
        } else {
          await message.channel.send({ content: mensaje });
        }
      }
    }

    // --- Logros (como antes) ---
    let achievement = await Achievement.findOneAndUpdate(
      { userId: message.author.id, guildId: message.guild.id },
      { $setOnInsert: { userId: message.author.id, guildId: message.guild.id, achievements: {} } },
      { upsert: true, new: true }
    );
    achievement.achievements.messages = (achievement.achievements.messages || 0) + 1;
    const currentLevel = achievement.achievements.messagesLevel || 0;
    const nextLevel = currentLevel < LEVELS.messages.length ? LEVELS.messages[currentLevel] : null;
    if (nextLevel && achievement.achievements.messages >= nextLevel) {
      achievement.achievements.messagesLevel = currentLevel + 1;
      const logro = LOGROS.messages[currentLevel];
      // Canal de logros configurable
      const logrosChannelId = guildConfig?.levelUpChannelId || LEVEL_UP_CHANNEL_ID;
      const logrosChannel = message.guild.channels.cache.get(logrosChannelId);
      if (logrosChannel) {
        const imgBuffer = await generateAchievementImage({
          type: 'messages',
          level: currentLevel,
          title: logro.title,
          desc: logro.desc
        });
        logrosChannel.send({
          content: `¡Felicidades ${message.author}! Has desbloqueado un logro.\n¡Consulta tu progreso con /logros!`,
          files: [{ attachment: imgBuffer, name: 'logro.png' }]
        });
      }
      // Rol de máximo logro de mensajes configurable
      if (achievement.achievements.messagesLevel === LEVELS.messages.length) {
        const maxMsgRoleId = guildConfig?.maxMsgRoleId || '1387090067738071080';
        const maxMsgRole = message.guild.roles.cache.get(maxMsgRoleId);
        const member = message.guild.members.cache.get(message.author.id);
        if (maxMsgRole && member && !member.roles.cache.has(maxMsgRole.id)) {
          await member.roles.add(maxMsgRole, 'Alcanzó el máximo logro de mensajes');
        }
      }
    }
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
        // Canal de premios configurable
        const prizeChannelId = guildConfig?.prizeChannelId || '752883098059800650';
        const premioChannel = message.guild.channels.cache.get(prizeChannelId);
        if (premioChannel) {
          await premioChannel.send({
            content: `🎉 ¡<@${message.author.id}> es la PRIMERA persona en completar el 100% de TODOS los logros!\nPor favor, ve al canal <#1382508364772151349> para reclamar tu premio. <@&${guildConfig?.allAchievementsRoleId || '1386701159279890584'}>`
          });
        }
        // Rol de todos los logros configurable
        const allAchievementsRoleId = guildConfig?.allAchievementsRoleId || '1386701159279890584';
        const role = message.guild.roles.cache.get(allAchievementsRoleId);
        const member = message.guild.members.cache.get(message.author.id);
        if (role && member && !member.roles.cache.has(role.id)) {
          await member.roles.add(role, 'Completó todos los logros');
        }
      }
    }
    await achievement.save();

    // --- Gemini IA SOLO en el servidor específico ---
    if (message.guild.id === '752883098059800647' && message.channel.id === GEMINI_CHANNEL_ID) {
      const botId = message.client.user.id;
      const isMention = message.mentions.has(botId);
      let isReplyToBot = false;
      if (message.reference) {
        try {
          let refMsg = await message.fetchReference();
          isReplyToBot = refMsg.author?.id === botId;
          let depth = 0;
          while (!isReplyToBot && refMsg.reference && depth < 2) {
            try {
              refMsg = await refMsg.fetchReference();
              isReplyToBot = refMsg.author?.id === botId;
              depth++;
            } catch { break; }
          }
        } catch {}
      }
      if (isMention || isReplyToBot) {
        const onlyMedia =
          (!message.content.trim() && message.attachments.size > 0) ||
          (message.stickers && message.stickers.size > 0) ||
          (/^<a?:\w+:\d+>$/.test(message.content.trim()));
        if (onlyMedia) {
          await message.reply('¿Eh? ¿Qué es eso? ¡No entiendo esa tecnología! Shishishi~');
          return;
        }
        let cleanContent = message.content
          .replace(/<a?:\w+:\d+>/g, '')
          .replace(/[\p{Emoji}\u200d]+/gu, '')
          .replace(/\s+/g, ' ')
          .trim();
        const prompt = `Responde como Monkey D. Luffy de One Piece. Eres alegre, directo, a veces ingenuo, pero siempre valiente y con espíritu de aventura. Responde de manera coherente, pero manteniendo tu estilo único de Luffy. Si te preguntan algo, contesta como lo haría Luffy, usando expresiones y personalidad propias del personaje. Mensaje del usuario: "${cleanContent.replace(`<@${botId}>`, '').trim()}"`;
        let contextCacheDoc = await GeminiContextCache.findOne({ channelId: message.channel.id });
        let contextCacheId = contextCacheDoc?.contextCacheId;
        const TOKEN_LIMIT = 2000000;
        const TOKEN_MARGIN = 5000;
        const nowDate = new Date();
        const monthKey = `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, '0')}`;
        let tokenDoc = await GeminiToken.findOne({ month: monthKey });
        if (!tokenDoc) {
          tokenDoc = await GeminiToken.create({ month: monthKey, used: 0 });
        }
        try {
          const countRes = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:countTokens?key=${GEMINI_API_KEY}`,
            contextCacheId
              ? { contents: [{ parts: [{ text: prompt }] }], contextCacheId }
              : { contents: [{ parts: [{ text: prompt }] }] }
          );
          const tokensUsed = countRes.data.totalTokens || 0;
          if (tokenDoc.used + tokensUsed > TOKEN_LIMIT - TOKEN_MARGIN) {
            console.log('Límite de tokens de Gemini alcanzado, no se responderá.');
            return;
          }
          tokenDoc.used += tokensUsed;
          await tokenDoc.save();
        } catch (err) {
          console.error('Error al contar tokens Gemini:', err);
          return;
        }
        try {
          const reqBody = contextCacheId
            ? { contents: [{ parts: [{ text: prompt }] }], contextCacheId }
            : { contents: [{ parts: [{ text: prompt }] }] };
          const response = await axios.post(GEMINI_URL, reqBody);
          const aiReply = response.data.candidates?.[0]?.content?.parts?.[0]?.text || 'No tengo respuesta.';
          const newContextCacheId = response.data.contextCacheId;
          if (newContextCacheId) {
            if (contextCacheDoc) {
              contextCacheDoc.contextCacheId = newContextCacheId;
              contextCacheDoc.updatedAt = new Date();
              await contextCacheDoc.save();
            } else {
              await GeminiContextCache.create({ channelId: message.channel.id, contextCacheId: newContextCacheId });
            }
          }
          await message.reply(aiReply);
        } catch (error) {
          if (error?.response?.data?.error?.message?.includes('context cache not found')) {
            await GeminiContextCache.deleteOne({ channelId: message.channel.id });
            await message.reply('¡Oops! Se perdió el contexto de la conversación. Intenta de nuevo.');
          } else {
            await message.reply('Lo siento, hubo un error al generar la respuesta.');
          }
          console.error(error);
        }
        return;
      }
    }
  }
};
