// backend/src/services/birthdayChecker.js
import cron from 'node-cron';
import User from '../models/User.js';
import Guild from '../models/Guild.js';
import logger from '../utils/logger.js';
import { EmbedBuilder } from 'discord.js';

class BirthdayChecker {
  constructor(client) {
    this.client = client;
    this.cronJob = null;
  }

  /**
   * Inicia el cron job que revisa cumpleaños cada hora
   */
  start() {
    // Ejecutar cada hora en el minuto 0
    // Cron: '0 * * * *' = cada hora a las XX:00
    this.cronJob = cron.schedule('0 * * * *', async () => {
      await this.checkBirthdays();
    });

    logger.info('✅ Birthday checker iniciado (verifica cada hora)');
    
    // Ejecutar una vez al inicio
    setTimeout(() => {
      this.checkBirthdays();
    }, 5000);
  }

  /**
   * Detiene el cron job
   */
  stop() {
    if (this.cronJob) {
      this.cronJob.stop();
      logger.info('🛑 Birthday checker detenido');
    }
  }

  /**
   * Verifica si es medianoche en la timezone del usuario
   */
  isMidnightInTimezone(timezone) {
    try {
      const now = new Date();
      const options = {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      };
      
      const formatter = new Intl.DateTimeFormat('en-US', options);
      const timeString = formatter.format(now);
      const [hour, minute] = timeString.split(':').map(Number);
      
      // Es medianoche si es la hora 00:XX (entre 00:00 y 00:59)
      return hour === 0;
    } catch (error) {
      logger.warn(`Timezone inválida: ${timezone}`, error);
      return false;
    }
  }

  /**
   * Obtiene la fecha actual en una timezone específica
   */
  getDateInTimezone(timezone) {
    try {
      const now = new Date();
      const options = {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      };
      
      const formatter = new Intl.DateTimeFormat('en-US', options);
      const dateString = formatter.format(now);
      const [month, day, year] = dateString.split('/').map(Number);
      
      return { day, month, year };
    } catch (error) {
      logger.warn(`Error obteniendo fecha en timezone: ${timezone}`, error);
      return null;
    }
  }

  /**
   * Verifica si ya se celebró el cumpleaños hoy
   */
  wasAlreadyCelebratedToday(lastCelebrated) {
    if (!lastCelebrated) return false;
    
    const now = new Date();
    const lastCelebratedDate = new Date(lastCelebrated);
    
    return (
      lastCelebratedDate.getDate() === now.getDate() &&
      lastCelebratedDate.getMonth() === now.getMonth() &&
      lastCelebratedDate.getFullYear() === now.getFullYear()
    );
  }

  /**
   * Función principal que verifica cumpleaños
   */
  async checkBirthdays() {
    try {
      logger.info('🎂 Verificando cumpleaños...');

      // Obtener TODOS los usuarios con cumpleaños configurado
      const usersWithBirthdays = await User.find({
        'birthday.day': { $ne: null },
        'birthday.month': { $ne: null }
      }).lean();

      if (usersWithBirthdays.length === 0) {
        logger.info('No hay usuarios con cumpleaños configurado');
        return;
      }

      logger.info(`Encontrados ${usersWithBirthdays.length} usuarios con cumpleaños configurado`);

      // Agrupar usuarios por userId (pueden estar en múltiples guilds)
      const userMap = new Map();
      
      for (const userRecord of usersWithBirthdays) {
        if (!userMap.has(userRecord.userId)) {
          userMap.set(userRecord.userId, {
            userId: userRecord.userId,
            birthday: userRecord.birthday,
            guilds: []
          });
        }
        userMap.get(userRecord.userId).guilds.push(userRecord.guildId);
      }

      let celebratedCount = 0;

      // Verificar cada usuario único
      for (const [userId, userData] of userMap) {
        const { birthday, guilds } = userData;
        const timezone = birthday.timezone || 'America/New_York';

        // Verificar si es medianoche en su timezone
        if (!this.isMidnightInTimezone(timezone)) {
          continue;
        }

        // Obtener fecha actual en su timezone
        const dateInTimezone = this.getDateInTimezone(timezone);
        if (!dateInTimezone) continue;

        // Verificar si hoy es su cumpleaños
        const isLeapYear = y => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
        const isFeb29Birthday = birthday.month === 2 && birthday.day === 29;
        const celebrateOnFeb28 = isFeb29Birthday && !isLeapYear(dateInTimezone.year)
          && dateInTimezone.month === 2 && dateInTimezone.day === 28;

        const isToday = (dateInTimezone.day === birthday.day && dateInTimezone.month === birthday.month)
          || celebrateOnFeb28;

        if (!isToday) continue;

        // Verificar si ya se celebró hoy (evitar duplicados)
        if (this.wasAlreadyCelebratedToday(birthday.lastCelebrated)) {
          logger.info(`Cumpleaños de ${userId} ya fue celebrado hoy`);
          continue;
        }

        logger.info(`🎉 ¡Es el cumpleaños de ${userId}! Timezone: ${timezone}`);

        // Enviar mensaje en cada guild donde esté el usuario y el bot
        for (const guildId of guilds) {
          try {
            await this.sendBirthdayMessage(guildId, userId);
            celebratedCount++;
          } catch (error) {
            logger.error(`Error enviando cumpleaños en guild ${guildId}:`, error);
          }
        }

        // Marcar como celebrado
        await User.updateMany(
          { userId },
          { $set: { 'birthday.lastCelebrated': new Date() } }
        );
      }

      if (celebratedCount > 0) {
        logger.info(`✅ Se celebraron ${celebratedCount} cumpleaños`);
      } else {
        logger.info('No hay cumpleaños que celebrar en este momento');
      }

    } catch (error) {
      logger.error('Error en birthday checker:', error);
    }
  }

  /**
   * Envía mensaje de cumpleaños en un guild específico
   */
  async sendBirthdayMessage(guildId, userId) {
    try {
      // Obtener configuración del guild
      const guildConfig = await Guild.findOne({ guildId }).lean();
      
      if (!guildConfig || !guildConfig.birthdays?.enabled) {
        logger.info(`Cumpleaños deshabilitado en guild ${guildId}`);
        return;
      }

      const { birthdays } = guildConfig;

      if (!birthdays.channelId) {
        logger.warn(`Guild ${guildId} no tiene canal de cumpleaños configurado`);
        return;
      }

      // Obtener guild de Discord
      const guild = await this.client.guilds.fetch(guildId).catch(() => null);
      if (!guild) {
        logger.warn(`Bot no está en guild ${guildId}`);
        return;
      }

      // Verificar que el usuario esté en el guild
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) {
        logger.info(`Usuario ${userId} no está en guild ${guildId}`);
        return;
      }

      // Obtener canal
      const channel = await guild.channels.fetch(birthdays.channelId).catch(() => null);
      if (!channel || !channel.isTextBased()) {
        logger.warn(`Canal de cumpleaños no válido en guild ${guildId}`);
        return;
      }

      // Verificar permisos
      const permissions = channel.permissionsFor(guild.members.me);
      if (!permissions.has(['SendMessages', 'EmbedLinks'])) {
        logger.warn(`Bot sin permisos en canal de cumpleaños de guild ${guildId}`);
        return;
      }

      // Preparar contenido del mensaje
      let messageContent = '';
      
      // Agregar mención de rol si está configurado
      if (birthdays.mentionRole) {
        if (birthdays.mentionRole === '@everyone') {
          messageContent = '@everyone ';
        } else if (birthdays.mentionRole === '@here') {
          messageContent = '@here ';
        } else {
          messageContent = `<@&${birthdays.mentionRole}> `;
        }
      }

      // Reemplazar placeholders en el mensaje
      const customMessage = (birthdays.message || '🎂 ¡Feliz cumpleaños {mention}! 🎉')
        .replace(/\{mention\}/g, `<@${userId}>`)
        .replace(/\{username\}/g, member.user.username)
        .replace(/\{server\}/g, guild.name);

      if (birthdays.embedEnabled) {
        // Enviar con embed
        const embed = new EmbedBuilder()
          .setColor(birthdays.embedColor || '#FF69B4')
          .setTitle('🎂 ¡Feliz Cumpleaños! 🎉')
          .setDescription(customMessage)
          .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
          .setImage('https://media.giphy.com/media/g5R9dok94mrIvplmZd/giphy.gif') // GIF de cumpleaños
          .setFooter({ text: `¡Que tengas un día increíble, ${member.user.username}!` })
          .setTimestamp();

        await channel.send({ 
          content: messageContent || undefined,
          embeds: [embed] 
        });
      } else {
        // Enviar mensaje simple
        await channel.send({ 
          content: messageContent + customMessage 
        });
      }

      logger.info(`🎂 Mensaje de cumpleaños enviado para ${member.user.tag} en ${guild.name}`);

    } catch (error) {
      logger.error(`Error enviando mensaje de cumpleaños en guild ${guildId}:`, error);
      throw error;
    }
  }
}

export default BirthdayChecker;