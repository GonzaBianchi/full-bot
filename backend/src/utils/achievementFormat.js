/**
 * Formatea el objetivo de un tier según el tipo de logro.
 * Estaba duplicado entre el generador de imágenes y /testlogro.
 */
export function formatTarget(type, target) {
  switch (type) {
    case 'messages':
      return `${target.toLocaleString()} mensajes`;
    case 'reactions':
      return `${target.toLocaleString()} reacciones recibidas`;
    case 'reactions_given':
      return `${target.toLocaleString()} reacciones dadas`;
    case 'voice_time': {
      const hours = Math.floor(target / 3600);
      const minutes = Math.floor((target % 3600) / 60);
      return hours > 0 ? `${hours}h ${minutes}m en voz` : `${minutes}m en voz`;
    }
    case 'boost':
      return 'Boostear el servidor';
    default:
      return `${target.toLocaleString()}`;
  }
}
