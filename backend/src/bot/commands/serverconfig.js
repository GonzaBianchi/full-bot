import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import GuildModel from '../../models/Guild.js';
import logger from '../../utils/logger.js';

export default {
  data: new SlashCommandBuilder()
    .setName('serverconfig')
    .setDescription('Muestra la configuración actual del servidor (niveles, roles, multiplicador)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const guildId = interaction.guildId;
      const guild = interaction.guild;

      // Obtener configuración
      let config = await GuildModel.findOne({ guildId });
      if (!config) {
        config = await GuildModel.create({ guildId });
      }

      const embed = new EmbedBuilder()
        .setTitle(`⚙️ Configuración de ${guild.name}`)
        .setColor(0x5865F2)
        .setThumbnail(guild.iconURL({ dynamic: true, size: 128 }));

      // Sistema de XP
      let xpSystemText = `**Multiplicador:** ${config.xpMultiplier}x\n`;
      
      if (config.ignoredChannels && config.ignoredChannels.length > 0) {
        const channels = config.ignoredChannels
          .slice(0, 5)
          .map(id => `<#${id}>`)
          .join(', ');
        xpSystemText += `**Canales ignorados:** ${channels}${config.ignoredChannels.length > 5 ? ` (+${config.ignoredChannels.length - 5} más)` : ''}`;
      } else {
        xpSystemText += `**Canales ignorados:** Ninguno`;
      }

      embed.addFields({
        name: '📊 Sistema de XP',
        value: xpSystemText,
        inline: false
      });

      // Notificaciones de nivel
      let notifText = `**Estado:** ${config.levelUpEnabled ? '✅ Activadas' : '❌ Desactivadas'}\n`;
      
      if (config.levelUpEnabled) {
        if (config.levelUpChannelId) {
          notifText += `**Canal:** <#${config.levelUpChannelId}>\n`;
        } else {
          notifText += `**Canal:** Mismo donde se sube de nivel\n`;
        }
        notifText += `**Mensaje:** \`${config.levelUpMessage}\``;
      }

      embed.addFields({
        name: '🔔 Notificaciones',
        value: notifText,
        inline: false
      });

      // Roles de nivel
      if (config.levelRoles && config.levelRoles.length > 0) {
        const sortedRoles = config.levelRoles
          .sort((a, b) => a.level - b.level)
          .slice(0, 10);
        
        let rolesText = '';
        for (const lr of sortedRoles) {
          const role = guild.roles.cache.get(lr.roleId);
          if (role) {
            rolesText += `**Nivel ${lr.level}:** ${role}\n`;
          }
        }

        if (config.levelRoles.length > 10) {
          rolesText += `\n*...y ${config.levelRoles.length - 10} roles más*`;
        }

        if (rolesText) {
          embed.addFields({
            name: '🎭 Roles de Nivel',
            value: rolesText,
            inline: false
          });
        }
      } else {
        embed.addFields({
          name: '🎭 Roles de Nivel',
          value: 'No hay roles configurados',
          inline: false
        });
      }

      // Panel web
      embed.addFields({
        name: '🌐 Panel Web',
        value: `[Configurar en el panel](${process.env.FRONTEND_URL || 'https://therifthavenfull.vercel.app'}/guild/${guildId})`,
        inline: false
      });

      embed.setFooter({ 
        text: 'Usa /help para ver todos los comandos disponibles' 
      });
      embed.setTimestamp();

      await interaction.editReply({ embeds: [embed] });
      logger.info(`Comando serverconfig ejecutado por ${interaction.user.tag} en ${guild.name}`);
    } catch (error) {
      logger.error('Error en comando serverconfig:', error);
      
      const errorMsg = '❌ Hubo un error al obtener la configuración del servidor.';
      if (interaction.deferred) {
        await interaction.editReply({ content: errorMsg });
      } else {
        await interaction.reply({ content: errorMsg, ephemeral: true });
      }
    }
  }
};