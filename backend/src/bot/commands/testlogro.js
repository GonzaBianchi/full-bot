import { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder } from 'discord.js';
import Achievement from '../../models/Achievement.js';
import GuildModel from '../../models/Guild.js';
import { generateAchievementNotification } from '../utils/achievementImageGenerator.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('testlogro')
    .setDescription('Testea la visualización de una notificación de logro')
    .addStringOption(option =>
      option
        .setName('logro')
        .setDescription('ID o nombre del logro a testear')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addIntegerOption(option =>
      option
        .setName('tier')
        .setDescription('Tier del logro a mostrar (1-10)')
        .setRequired(false)
        .setMinValue(1)
        .setMaxValue(10)
    )
    .addUserOption(option =>
      option
        .setName('usuario')
        .setDescription('Usuario para el que simular el logro (por defecto: tú)')
        .setRequired(false)
    )
    .addChannelOption(option =>
      option
        .setName('canal')
        .setDescription('Canal donde enviar la notificación (por defecto: este canal)')
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async autocomplete(interaction) {
    try {
      const focusedValue = interaction.options.getFocused().toLowerCase();
      const guildId = interaction.guildId;

      logger.info(`Autocomplete de testlogro: búsqueda="${focusedValue}" en guild ${guildId}`);

      // Buscar logros habilitados en este servidor
      const achievements = await Achievement.find({ 
        guildId, 
        enabled: true 
      }).lean();

      logger.info(`Logros encontrados: ${achievements.length}`);

      // Si no hay búsqueda específica, mostrar todos
      let filtered = achievements;
      
      if (focusedValue) {
        filtered = achievements.filter(ach => {
          const nameMatch = ach.name.toLowerCase().includes(focusedValue);
          const idMatch = ach._id.toString().includes(focusedValue);
          const typeMatch = ach.type.toLowerCase().includes(focusedValue);
          return nameMatch || idMatch || typeMatch;
        });
      }

      // Limitar a 25 resultados
      const choices = filtered
        .slice(0, 25)
        .map(ach => ({
          name: `${ach.icon || '🏆'} ${ach.name} - ${ach.type} (${ach.tiers.length} tiers)`,
          value: ach._id.toString()
        }));

      logger.info(`Opciones de autocomplete: ${choices.length}`);

      await interaction.respond(choices);
    } catch (error) {
      logger.error('Error en autocomplete de testlogro:', error);
      await interaction.respond([]);
    }
  },

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const achievementId = interaction.options.getString('logro');
      const tierNumber = interaction.options.getInteger('tier');
      const targetUser = interaction.options.getUser('usuario') || interaction.user;
      const targetChannel = interaction.options.getChannel('canal') || interaction.channel;

      logger.info(`Ejecutando testlogro: achievement=${achievementId}, tier=${tierNumber}`);

      // Verificar que el canal es de texto
      if (!targetChannel.isTextBased()) {
        return await interaction.editReply({
          content: '❌ El canal seleccionado debe ser un canal de texto.',
          ephemeral: true
        });
      }

      // Buscar el logro
      const achievement = await Achievement.findOne({
        _id: achievementId,
        guildId: interaction.guildId
      });

      if (!achievement) {
        logger.warn(`Logro no encontrado: ${achievementId}`);
        return await interaction.editReply({
          content: '❌ No se encontró el logro especificado o no pertenece a este servidor.',
          ephemeral: true
        });
      }

      logger.info(`Logro encontrado: ${achievement.name} (${achievement.tiers.length} tiers)`);

      // Determinar el tier a mostrar
      let tier;
      if (tierNumber) {
        tier = achievement.tiers.find(t => t.tier === tierNumber);
        if (!tier) {
          return await interaction.editReply({
            content: `❌ El logro "${achievement.name}" no tiene un tier ${tierNumber}. Tiers disponibles: ${achievement.tiers.map(t => t.tier).join(', ')}`,
            ephemeral: true
          });
        }
      } else {
        // Si no se especifica tier, usar el primero
        tier = achievement.tiers.sort((a, b) => a.tier - b.tier)[0];
      }

      logger.info(`Tier seleccionado: ${tier.tier} - ${tier.title} (Meta: ${tier.target})`);

      // Obtener configuración de imagen
      const guildConfig = await GuildModel.findOne({ guildId: interaction.guildId }).lean();
      const imageConfig = guildConfig?.images?.achievementNotification || {};

      // Generar la imagen de notificación
      logger.info('Generando imagen de logro...');
      const imageBuffer = await generateAchievementNotification({
        user: targetUser,
        achievement: {
          name: achievement.name,
          description: achievement.description,
          icon: achievement.icon,
          type: achievement.type
        },
        tier: {
          tier: tier.tier,
          title: tier.title,
          description: tier.description,
          emoji: tier.emoji,
          target: tier.target
        },
        imageUrl: imageConfig.url || null,
        blur: imageConfig.blur || 6,
        opacity: imageConfig.opacity || 0.7
      });

      const attachment = new AttachmentBuilder(imageBuffer, { name: 'achievement-test.png' });

      // Preparar el mensaje usando la configuración de notificaciones del logro
      let message = achievement.notifications?.message || '🎉 {mention} ha desbloqueado: **{achievement}** - {tier}!';
      
      message = message
        .replace(/{mention}/g, `<@${targetUser.id}>`)
        .replace(/{username}/g, targetUser.username)
        .replace(/{achievement}/g, achievement.name)
        .replace(/{tier}/g, `${tier.emoji || ''} ${tier.title}`)
        .replace(/{tierTitle}/g, tier.title)
        .replace(/{emoji}/g, tier.emoji || '')
        .replace(/{icon}/g, achievement.icon || '');

      // Enviar la notificación de prueba
      await targetChannel.send({
        content: `${message}\n\n*⚠️ Esto es una prueba. El usuario no ha desbloqueado realmente este logro.*`,
        files: [attachment],
        allowedMentions: { users: [targetUser.id] }
      });

      // Formato de la meta para el mensaje de confirmación
      let targetFormatted = '';
      switch (achievement.type) {
        case 'messages':
          targetFormatted = `${tier.target.toLocaleString()} mensajes`;
          break;
        case 'reactions':
          targetFormatted = `${tier.target.toLocaleString()} reacciones recibidas`;
          break;
        case 'reactions_given':
          targetFormatted = `${tier.target.toLocaleString()} reacciones dadas`;
          break;
        case 'voice_time':
          const hours = Math.floor(tier.target / 3600);
          const minutes = Math.floor((tier.target % 3600) / 60);
          if (hours > 0) {
            targetFormatted = `${hours}h ${minutes}m en voz`;
          } else {
            targetFormatted = `${minutes}m en voz`;
          }
          break;
        case 'boost':
          targetFormatted = 'Boostear el servidor';
          break;
        default:
          targetFormatted = `${tier.target.toLocaleString()}`;
      }

      // Confirmar al usuario que ejecutó el comando
      await interaction.editReply({
        content: `✅ Notificación de prueba enviada en ${targetChannel}!\n\n` +
                 `**Logro:** ${achievement.icon} ${achievement.name}\n` +
                 `**Tipo:** ${achievement.type}\n` +
                 `**Tier:** ${tier.emoji || '🏆'} ${tier.title} (${tier.tier}/${achievement.tiers.length})\n` +
                 `**Meta:** ${targetFormatted}\n` +
                 `**Usuario:** ${targetUser.tag}\n` +
                 `**Imagen personalizada:** ${imageConfig.url ? '✅ Sí' : '❌ No (usando predeterminada)'}`,
        ephemeral: true
      });

      logger.info(`Test de logro ejecutado exitosamente por ${interaction.user.tag}: ${achievement.name} - ${tier.title}`);
    } catch (error) {
      logger.error('Error ejecutando comando testlogro:', error);
      logger.error('Stack:', error.stack);
      
      const errorMessage = '❌ Hubo un error al generar la notificación de prueba. Verifica que:\n' +
                          '• El logro exista y esté habilitado\n' +
                          '• La imagen de fondo (si existe) sea válida\n' +
                          '• El bot tenga permisos para enviar mensajes en el canal';
      
      if (interaction.deferred) {
        await interaction.editReply({ content: errorMessage, ephemeral: true });
      } else {
        await interaction.reply({ content: errorMessage, ephemeral: true });
      }
    }
  }
};