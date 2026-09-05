// backend/src/services/birthdayChecker.js
import cron from 'node-cron';
import User from '../models/User.js';
import { getGuildConfig } from '../utils/guildConfigCache.js';
import logger from '../utils/logger.js';
import { EmbedBuilder } from 'discord.js';

class BirthdayChecker {
  constructor(client) {
    this.client = client;
    this.cronJob = null;
    this.initialRun = null;
  }

  /**
   * Inicia el cron job que revisa cumpleaños cada hora
   */
  start() {
    // Cron: '0 * * * *' = cada hora a las XX:00
    this.cronJob = cron.schedule('0 * * * *', async () => {
      await this.checkBirthdays();
    });

    logger.info('Birthday checker iniciado (verifica cada hora)');

    // Ejecutar una vez al inicio. Se guarda la referencia para poder
    // cancelarla: antes seguía viva tras el shutdown.
    this.initialRun = setTimeout(() => {
      this.initialRun = null;
      this.checkBirthdays();
    }, 5000);
    this.initialRun.unref();
  }

  /**
   * Detiene el cron job
   */
  stop() {
    if (this.initialRun) {
      clearTimeout(this.initialRun);
      this.initialRun = null;
    }
    if (this.cronJob) {
      this.cronJob.stop();
      this.cronJob = null;
      logger.info('Birthday checker detenido');
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
      const [hour] = timeString.split(':').map(Number);
      
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
  getDateInTimezone(timezone, date = new Date()) {
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      const dateString = formatter.format(date);
      const [month, day, year] = dateString.split('/').map(Number);
      return { day, month, year };
    } catch (error) {
      logger.warn(`Error obteniendo fecha en timezone: ${timezone}`, error);
      return null;
    }
  }

  wasAlreadyCelebratedToday(lastCelebrated, timezone) {
    if (!lastCelebrated) return false;
    const today = this.getDateInTimezone(timezone);
    const last = this.getDateInTimezone(timezone, new Date(lastCelebrated));
    if (!today || !last) return false;
    return today.day === last.day && today.month === last.month && today.year === last.year;
  }

  /**
   * Días candidatos a "hoy" en alguna zona horaria del mundo: el desfase va de
   * UTC-12 a UTC+14, así que basta con mirar ayer, hoy y mañana en UTC.
   * Sirve para consultar por índice en vez de escanear la colección entera.
   */
  candidateDates() {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const seen = new Set();
    const dates = [];

    const add = (day, month) => {
      const key = `${day}-${month}`;
      if (seen.has(key)) return;
      seen.add(key);
      dates.push({ day, month });
    };

    for (const offset of [-DAY_MS, 0, DAY_MS]) {
      const d = new Date(now + offset);
      const month = d.getUTCMonth() + 1;
      const day = d.getUTCDate();
      add(day, month);
      // Los cumpleaños del 29/02 se celebran el 28/02 en años no bisiestos.
      if (month === 2 && day === 28) add(29, 2);
    }

    return dates;
  }

  /**
   * Función principal que verifica cumpleaños
   */
  async checkBirthdays() {
    try {
      logger.info('Verificando cumpleaños...');

      // Solo los cumpleaños que podrían caer hoy en alguna zona horaria, con
      // proyección: antes se cargaba la colección `users` completa cada hora.
      const usersWithBirthdays = await User.find({
        $or: this.candidateDates().map(({ day, month }) => ({
          'birthday.day': day,
          'birthday.month': month
        }))
      }).select('userId guildId birthday').lean();

      if (usersWithBirthdays.length === 0) {
        logger.info('No hay cumpleaños candidatos en esta franja');
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
        if (this.wasAlreadyCelebratedToday(birthday.lastCelebrated, timezone)) {
          logger.info(`Cumpleaños de ${userId} ya fue celebrado hoy`);
          continue;
        }

        logger.info(`🎉 ¡Es el cumpleaños de ${userId}! Timezone: ${timezone}`);

        // Enviar mensaje en cada guild donde esté el usuario y el bot
        let sentSomewhere = false;
        for (const guildId of guilds) {
          try {
            if (await this.sendBirthdayMessage(guildId, userId)) {
              sentSomewhere = true;
              celebratedCount++;
            }
          } catch (error) {
            logger.error(`Error enviando cumpleaños en guild ${guildId}:`, error);
          }
        }

        // Marcar como celebrado solo si el saludo llegó a algún sitio: antes se
        // marcaba igualmente y el cumpleaños se perdía durante un año.
        if (sentSomewhere) {
          await User.updateMany(
            { userId },
            { $set: { 'birthday.lastCelebrated': new Date() } }
          );
        }
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
      const guildConfig = await getGuildConfig(guildId);
      
      if (!guildConfig || !guildConfig.birthdays?.enabled) {
        logger.info(`Cumpleaños deshabilitado en guild ${guildId}`);
        return false;
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

      logger.info(`Mensaje de cumpleaños enviado para ${member.user.tag} en ${guild.name}`);
      return true;

    } catch (error) {
      logger.error(`Error enviando mensaje de cumpleaños en guild ${guildId}:`, error);
      throw error;
    }
  }
}

export default BirthdayChecker;