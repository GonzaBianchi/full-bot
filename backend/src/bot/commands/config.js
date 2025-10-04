import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import Guild from '../../models/Guild.js';

export default {
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Ver la configuración del sistema de niveles')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
      const guildConfig = await Guild.findOne({ guildId: interaction.guild.id });

      if (!guildConfig) {
        return await interaction.editReply({
          content: '❌ No se encontró configuración para este servidor. Usa el dashboard para configurar.',
        });
      }

      const config = guildConfig.levelingSystem;

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle(`⚙️ Configuración de ${interaction.guild.name}`)
        .setThumbnail(interaction.guild.iconURL())
        .addFields(
          {
            name: '📊 Estado del Sistema',
            value: config.enabled ? '✅ Habilitado' : '❌ Deshabilitado',
            inline: true
          },
          {
            name: '✖️ Multiplicador de XP',
            value: `${config.xpMultiplier}x`,
            inline: true
          },
          {
            name: '⏱️ Cooldown',
            value: `${config.cooldown} segundos`,
            inline: true
          },
          {
            name: '💎 XP por Mensaje',
            value: `${config.xpPerMessage.min} - ${config.xpPerMessage.max} XP`,
            inline: true
          },
          {
            name: '🎭 Apilar Roles',
            value: config.stackRoles ? 'Sí' : 'No',
            inline: true
          },
          {
            name: '📢 Mensaje de Nivel',
            value: config.levelUpMessage.enabled ? 'Habilitado' : 'Deshabilitado',
            inline: true
          }
        )
        .setFooter({
          text: `Usa el dashboard para cambiar la configuración: ${process.env.FRONTEND_URL || 'https://tuapp.com'}`
        })
        .setTimestamp();

      // Canales ignorados
      if (guildConfig.ignoredChannels.length > 0) {
        const channels = guildConfig.ignoredChannels
          .map(id => `<#${id}>`)
          .join(', ');
        embed.addFields({
          name: '🚫 Canales Ignorados',
          value: channels || 'Ninguno',
          inline: false
        });
      }

      // Roles ignorados
      if (guildConfig.ignoredRoles.length > 0) {
        const roles = guildConfig.ignoredRoles
          .map(id => `<@&${id}>`)
          .join(', ');
        embed.addFields({
          name: '🚫 Roles Ignorados',
          value: roles || 'Ninguno',
          inline: false
        });
      }

      await interaction.editReply({ embeds: [embed] });

    } catch (error) {
      console.error('Error en comando config:', error);
      await interaction.editReply({
        content: '❌ Hubo un error al obtener la configuración.',
      });
    }
  }
};