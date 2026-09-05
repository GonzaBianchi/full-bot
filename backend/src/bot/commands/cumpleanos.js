import { SlashCommandBuilder, EmbedBuilder, MessageFlags } from 'discord.js';
import User from '../../models/User.js';
import logger from '../../utils/logger.js';

// Estaba repetido en tres subcomandos.
const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

// Lista de timezones comunes para autocomplete
const COMMON_TIMEZONES = [
  'America/Argentina/Buenos_Aires',
  'America/New_York',
  'America/Los_Angeles',
  'America/Chicago',
  'America/Denver',
  'America/Mexico_City',
  'America/Bogota',
  'America/Santiago',
  'America/Lima',
  'America/Caracas',
  'America/Sao_Paulo',
  'Europe/Madrid',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Australia/Sydney'
];

export default {
  data: new SlashCommandBuilder()
    .setName('cumpleanos')
    .setDescription('Gestiona cumpleaños en el servidor')
    .addSubcommand(subcommand =>
      subcommand
        .setName('set')
        .setDescription('Configura tu fecha de cumpleaños')
        .addIntegerOption(option =>
          option
            .setName('dia')
            .setDescription('Día de tu cumpleaños (1-31)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(31)
        )
        .addIntegerOption(option =>
          option
            .setName('mes')
            .setDescription('Mes de tu cumpleaños (1-12)')
            .setRequired(true)
            .setMinValue(1)
            .setMaxValue(12)
        )
        .addStringOption(option =>
          option
            .setName('timezone')
            .setDescription('Tu zona horaria (ej: America/Argentina/Buenos_Aires)')
            .setRequired(true)
            .setAutocomplete(true)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('ver')
        .setDescription('Ver el cumpleaños de un usuario')
        .addUserOption(option =>
          option
            .setName('usuario')
            .setDescription('Usuario del que quieres ver el cumpleaños')
            .setRequired(false)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('lista')
        .setDescription('Ver próximos cumpleaños del servidor')
        .addIntegerOption(option =>
          option
            .setName('cantidad')
            .setDescription('Cantidad de cumpleaños a mostrar (máx 25)')
            .setRequired(false)
            .setMinValue(1)
            .setMaxValue(25)
        )
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName('borrar')
        .setDescription('Elimina tu fecha de cumpleaños')
    ),

  async autocomplete(interaction) {
    const focusedValue = interaction.options.getFocused().toLowerCase();
    
    const filtered = COMMON_TIMEZONES
      .filter(tz => tz.toLowerCase().includes(focusedValue))
      .slice(0, 25);
    
    await interaction.respond(
      filtered.map(tz => ({ name: tz, value: tz }))
    );
  },

  async execute(interaction) {
    const subcommand = interaction.options.getSubcommand();

    try {
      switch (subcommand) {
        case 'set':
          await handleSet(interaction);
          break;
        case 'ver':
          await handleVer(interaction);
          break;
        case 'lista':
          await handleLista(interaction);
          break;
        case 'borrar':
          await handleBorrar(interaction);
          break;
        default:
          await interaction.reply({
            content: '❌ Subcomando no reconocido',
            flags: MessageFlags.Ephemeral
          });
      }
    } catch (error) {
      logger.error('Error en comando /cumpleanos:', error);
      
      const errorMsg = error.message || 'Hubo un error al procesar el comando';
      
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply({ content: `❌ ${errorMsg}` });
      } else {
        await interaction.reply({ content: `❌ ${errorMsg}`, flags: MessageFlags.Ephemeral });
      }
    }
  }
};

// ========== SUBCOMANDO: SET ==========
async function handleSet(interaction) {
  const day = interaction.options.getInteger('dia');
  const month = interaction.options.getInteger('mes');
  const timezone = interaction.options.getString('timezone');
  const userId = interaction.user.id;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // Validar timezone (básico)
    if (!timezone.includes('/')) {
      throw new Error('Timezone inválida. Usa formato: Continente/Ciudad (ej: America/Argentina/Buenos_Aires)');
    }

    // Setear cumpleaños (actualiza en TODOS los guilds donde esté el usuario)
    const result = await User.setBirthday(userId, day, month, timezone);

    // Si el usuario no tiene ningún documento, no se guardó nada: antes se
    // respondía "guardado exitosamente" igualmente.
    if (result.matchedCount === 0) {
      return await interaction.editReply({
        content: '❌ Todavía no tienes actividad registrada en ningún servidor con este bot. Escribe un mensaje y vuelve a intentarlo.'
      });
    }


    const embed = new EmbedBuilder()
      .setColor('#00FF00')
      .setTitle('🎂 Cumpleaños configurado')
      .setDescription(`Tu cumpleaños ha sido guardado exitosamente`)
      .addFields(
        { name: '📅 Fecha', value: `${day} de ${MONTH_NAMES[month - 1]}`, inline: true },
        { name: '🌍 Zona horaria', value: timezone, inline: true }
      )
      .setFooter({ text: 'El bot te felicitará automáticamente en los servidores configurados' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    
    logger.info(`Usuario ${interaction.user.tag} configuró su cumpleaños: ${day}/${month} (${timezone})`);
  } catch (error) {
    logger.error('Error en /cumpleanos set:', error);
    throw error;
  }
}

// ========== SUBCOMANDO: VER ==========
async function handleVer(interaction) {
  const targetUser = interaction.options.getUser('usuario') || interaction.user;
  const guildId = interaction.guild.id;

  await interaction.deferReply();

  try {
    // Buscar cumpleaños del usuario en este guild
    const userRecord = await User.findOne({ 
      guildId, 
      userId: targetUser.id 
    }).lean();

    if (!userRecord?.birthday?.day || !userRecord?.birthday?.month) {
      return await interaction.editReply({
        content: `❌ ${targetUser.username} no ha configurado su cumpleaños`
      });
    }


    const day = userRecord.birthday.day;
    const month = userRecord.birthday.month;
    const timezone = userRecord.birthday.timezone || 'No especificada';

    // Calcular días hasta el cumpleaños
    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentDay = now.getDate();
    
    let daysUntil;
    let statusText;
    
    if (month === currentMonth && day === currentDay) {
      statusText = '¡Hoy es su cumpleaños! 🎉';
      daysUntil = 0;
    } else if (month === currentMonth && day > currentDay) {
      daysUntil = day - currentDay;
      statusText = `Faltan ${daysUntil} día${daysUntil !== 1 ? 's' : ''}`;
    } else if (month > currentMonth) {
      const thisYear = now.getFullYear();
      const birthday = new Date(thisYear, month - 1, day);
      daysUntil = Math.ceil((birthday - now) / (1000 * 60 * 60 * 24));
      statusText = `Faltan ${daysUntil} día${daysUntil !== 1 ? 's' : ''}`;
    } else {
      const nextYear = now.getFullYear() + 1;
      const birthday = new Date(nextYear, month - 1, day);
      daysUntil = Math.ceil((birthday - now) / (1000 * 60 * 60 * 24));
      statusText = `Faltan ${daysUntil} día${daysUntil !== 1 ? 's' : ''}`;
    }

    const embed = new EmbedBuilder()
      .setColor('#FF69B4')
      .setTitle(`🎂 Cumpleaños de ${targetUser.username}`)
      .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
      .addFields(
        { name: '📅 Fecha', value: `${day} de ${MONTH_NAMES[month - 1]}`, inline: true },
        { name: '⏳ Próximo cumpleaños', value: statusText, inline: true },
        { name: '🌍 Zona horaria', value: timezone, inline: true }
      )
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error en /cumpleanos ver:', error);
    throw error;
  }
}

// ========== SUBCOMANDO: LISTA ==========
async function handleLista(interaction) {
  const guildId = interaction.guild.id;
  const limit = interaction.options.getInteger('cantidad') || 10;

  await interaction.deferReply();

  try {
    const upcomingBirthdays = await User.getUpcomingBirthdays(guildId, limit);

    if (upcomingBirthdays.length === 0) {
      return await interaction.editReply({
        content: '❌ No hay cumpleaños configurados en este servidor'
      });
    }


    const embed = new EmbedBuilder()
      .setColor('#FF69B4')
      .setTitle('🎂 Próximos Cumpleaños')
      .setDescription(`Mostrando los próximos ${Math.min(limit, upcomingBirthdays.length)} cumpleaños`)
      .setTimestamp();

    // Obtener información de Discord de cada usuario
    const birthdayList = await Promise.all(
      upcomingBirthdays.map(async (record, index) => {
        try {
          // El nombre ya está guardado en Mongo; solo se consulta Discord si falta.
          const username = record.username
            || (await interaction.client.users.fetch(record.userId).catch(() => null))?.username
            || `Usuario ${record.userId}`;
          
          const day = record.birthday.day;
          const month = record.birthday.month;
          const daysUntil = record.daysUntil;
          
          let status;
          if (daysUntil === 0) {
            status = '**¡HOY! 🎉**';
          } else if (daysUntil === 1) {
            status = '**¡Mañana!**';
          } else {
            status = `En ${daysUntil} día${daysUntil !== 1 ? 's' : ''}`;
          }
          
          return `${index + 1}. **${username}** - ${day} de ${MONTH_NAMES[month - 1]} (${status})`;
        } catch (e) {
          return null;
        }
      })
    );

    const filteredList = birthdayList.filter(item => item !== null);
    
    if (filteredList.length === 0) {
      return await interaction.editReply({
        content: '❌ No se pudieron cargar los cumpleaños'
      });
    }

    embed.setDescription(filteredList.join('\n'));
    
    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logger.error('Error en /cumpleanos lista:', error);
    throw error;
  }
}

// ========== SUBCOMANDO: BORRAR ==========
async function handleBorrar(interaction) {
  const userId = interaction.user.id;

  await interaction.deferReply({ flags: MessageFlags.Ephemeral });

  try {
    // Borrar cumpleaños de TODOS los guilds
    const result = await User.updateMany(
      { userId },
      { 
        $set: { 
          'birthday.day': null,
          'birthday.month': null,
          'birthday.timezone': 'America/New_York',
          'birthday.lastCelebrated': null
        }
      }
    );

    if (result.modifiedCount === 0) {
      return await interaction.editReply({
        content: '❌ No tenías ningún cumpleaños configurado'
      });
    }

    const embed = new EmbedBuilder()
      .setColor('#FF0000')
      .setTitle('🗑️ Cumpleaños eliminado')
      .setDescription('Tu fecha de cumpleaños ha sido eliminada de todos los servidores')
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
    
    logger.info(`Usuario ${interaction.user.tag} eliminó su cumpleaños`);
  } catch (error) {
    logger.error('Error en /cumpleanos borrar:', error);
    throw error;
  }
}