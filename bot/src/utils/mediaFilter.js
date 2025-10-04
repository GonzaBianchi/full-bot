// Devuelve true si el mensaje contiene multimedia (links, imágenes, videos, gifs, etc.)
export default function filterMedia(message) {
  const urlRegex = /(https?:\/\/\S+)/gi;
  const hasUrl = urlRegex.test(message.content);
  const hasAttachment = message.attachments && message.attachments.size > 0;
  return hasUrl || hasAttachment;
}
