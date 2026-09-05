// backend/src/bot/events/mediaFilterHandler.js
import logger from '../../utils/logger.js';
import { EmbedBuilder } from 'discord.js';

/**
 * Verifica si un mensaje contiene multimedia
 */
function hasMediaContent(message, config) {
  const { types, includeEmbeds } = config;
  
  // Verificar archivos adjuntos
  if (message.attachments.size > 0) {
    for (const attachment of message.attachments.values()) {
      const url = attachment.url.toLowerCase();
      
      // Imágenes
      if (types.images && /\.(jpg|jpeg|png|gif|webp|bmp|svg)(\?|$)/.test(url)) {
        return { type: 'image', attachment };
      }
      
      // Videos
      if (types.videos && /\.(mp4|mov|avi|mkv|webm|flv|wmv)(\?|$)/.test(url)) {
        return { type: 'video', attachment };
      }
      
      // GIFs (algunos pueden venir como attachments)
      if (types.gifs && url.includes('.gif')) {
        return { type: 'gif', attachment };
      }
    }
  }
  
  // Verificar embeds (links de YouTube, Tenor, etc.)
  if (includeEmbeds && message.embeds.length > 0) {
    for (const embed of message.embeds) {
      // GIFs de Tenor
      if (types.gifs && embed.url && embed.url.includes('tenor.com')) {
        return { type: 'gif', embed };
      }
      
      // Videos de YouTube, Vimeo, etc.
      if (types.videos && embed.video) {
        return { type: 'video', embed };
      }
      
      // Imágenes en embeds
      if (types.images && (embed.image || embed.thumbnail)) {
        return { type: 'image', embed };
      }
    }
  }
  
  return null;
}

/**
 * Reenvía la multimedia de un mensaje al canal configurado.
 * La configuración llega ya resuelta desde el pipeline de messageCreate: antes
 * este handler registraba su propio listener y releía la config por su cuenta.
 */
export async function handleMediaFilter(message, guildConfig) {
    try {
      if (!guildConfig?.mediaFilter?.enabled) return;

      const guildId = message.guild.id;
      const { mediaFilter } = guildConfig;
      
      // Verificar si el mensaje viene de un canal fuente
      if (!mediaFilter.sourceChannels.includes(message.channel.id)) return;
      
      // Verificar si el mensaje tiene multimedia
      const mediaContent = hasMediaContent(message, mediaFilter);
      if (!mediaContent) return;
      
      // Obtener el canal destino
      const targetChannel = await message.guild.channels.fetch(mediaFilter.targetChannelId).catch(() => null);
      if (!targetChannel || !targetChannel.isTextBased()) {
        logger.warn(`Canal destino ${mediaFilter.targetChannelId} no encontrado o no es de texto`);
        return;
      }
      
      // Verificar permisos del bot
      const permissions = targetChannel.permissionsFor(message.guild.members.me);
      if (!permissions.has(['SendMessages', 'EmbedLinks'])) {
        logger.warn(`Bot sin permisos para enviar mensajes en ${targetChannel.name}`);
        return;
      }
      
      // Preparar mensaje personalizado
      const customMsg = (mediaFilter.customMessage || '{author} compartió multimedia en #{channel}')
        .replace(/\{author\}/g, message.author?.username ?? 'Alguien')
        .replace(/\{mention\}/g, message.author ? `<@${message.author.id}>` : 'Alguien')
        .replace(/\{channel\}/g, message.channel.name);
      
      // Crear embed
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({ 
          name: message.author.username, 
          iconURL: message.author.displayAvatarURL({ dynamic: true }) 
        })
        .setDescription(customMsg)
        .setTimestamp(message.createdAt)
        .setFooter({ text: `Desde #${message.channel.name}` });
      
      // Agregar link al mensaje original
      const messageLink = `https://discord.com/channels/${guildId}/${message.channel.id}/${message.id}`;
      embed.addFields({ name: '🔗 Mensaje Original', value: `[Ver mensaje](${messageLink})`, inline: false });
      
      // Si hay contenido de texto en el mensaje original, agregarlo
      if (message.content && message.content.length > 0) {
        const content = message.content.length > 1024 
          ? message.content.substring(0, 1021) + '...' 
          : message.content;
        embed.addFields({ name: '💬 Contenido', value: content, inline: false });
      }
      
      // Agregar la multimedia al embed
      if (mediaContent.attachment) {
        if (mediaContent.type === 'image' || mediaContent.type === 'gif') {
          embed.setImage(mediaContent.attachment.url);
        } else if (mediaContent.type === 'video') {
          // Para videos, agregamos el link
          embed.addFields({ 
            name: '🎥 Video', 
            value: `[${mediaContent.attachment.name}](${mediaContent.attachment.url})`, 
            inline: false 
          });
        }
      } else if (mediaContent.embed) {
        // Si es un embed externo (YouTube, Tenor, etc.)
        if (mediaContent.embed.url) {
          embed.addFields({ 
            name: `${getEmojiForType(mediaContent.type)} Link`, 
            value: mediaContent.embed.url, 
            inline: false 
          });
        }
        
        if (mediaContent.embed.image) {
          embed.setImage(mediaContent.embed.image.url);
        } else if (mediaContent.embed.thumbnail) {
          embed.setImage(mediaContent.embed.thumbnail.url);
        }
      }
      
      // Enviar al canal destino
      await targetChannel.send({ embeds: [embed] });
      
      logger.info(`📎 Multimedia reenviada: ${mediaContent.type} de ${message.author.tag} en ${message.guild.name}`);
      
    } catch (error) {
      logger.error('Error en media filter handler:', error);
    }
}

/**
 * Obtener emoji según el tipo de multimedia
 */
function getEmojiForType(type) {
  const emojis = {
    image: '🖼️',
    video: '🎥',
    gif: '🎞️'
  };
  return emojis[type] || '📎';
}

export default handleMediaFilter;