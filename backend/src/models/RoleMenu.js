import mongoose from 'mongoose';

const OptionSchema = new mongoose.Schema({
  emojiId: { 
    type: String, 
    default: null,
    description: 'ID del emoji custom (si aplica)'
  },
  emojiIdentifier: { 
    type: String, 
    required: true,
    description: 'Identificador del emoji: unicode char o "name:id" para custom'
  },
  label: { 
    type: String, 
    default: '',
    maxlength: 100,
    description: 'Descripción opcional del rol'
  },
  roleId: { 
    type: String, 
    required: true,
    description: 'ID del rol de Discord'
  }
}, { _id: false });

const RoleMenuSchema = new mongoose.Schema({
  guildId: {
    type: String,
    required: true,
    description: 'ID del servidor de Discord'
  },
  title: { 
    type: String, 
    required: true,
    maxlength: 100,
    description: 'Título del menú de roles'
  },
  channelId: { 
    type: String, 
    required: true,
    description: 'ID del canal donde se publicará el menú'
  },
  messageId: { 
    type: String, 
    default: null,
    description: 'ID del mensaje publicado (null si no está publicado)'
  },
  exclusive: { 
    type: Boolean, 
    default: false,
    description: 'Si true, solo se puede tener un rol de este menú a la vez'
  },
  published: { 
    type: Boolean, 
    default: false,
    description: 'Indica si el menú ha sido publicado en el canal'
  },
  options: { 
    type: [OptionSchema], 
    default: [],
    validate: {
      validator: function(options) {
        return options.length <= 20; // Límite de Discord
      },
      message: 'Un menú puede tener máximo 20 opciones'
    },
    description: 'Array de opciones (emoji + rol)'
  }
}, { 
  timestamps: true,
  collection: 'rolemenus'
});

// Índice compuesto para búsquedas rápidas
RoleMenuSchema.index({ guildId: 1, published: 1 });
RoleMenuSchema.index({ messageId: 1 }, { unique: true, sparse: true });

// Método para validar que no hay emojis o roles duplicados
RoleMenuSchema.pre('save', function(next) {
  const emojiIds = new Set();
  const roleIds = new Set();
  
  for (const opt of this.options) {
    // Validar emojis duplicados
    const emojiKey = opt.emojiId || opt.emojiIdentifier;
    if (emojiIds.has(emojiKey)) {
      return next(new Error('No puede haber emojis duplicados en un menú'));
    }
    emojiIds.add(emojiKey);
    
    // Validar roles duplicados
    if (roleIds.has(opt.roleId)) {
      return next(new Error('No puede haber roles duplicados en un menú'));
    }
    roleIds.add(opt.roleId);
  }
  
  next();
});

// Método estático para buscar menús activos de un guild
RoleMenuSchema.statics.findActiveByGuild = function(guildId) {
  return this.find({ guildId, published: true }).lean();
};

// Método estático para buscar por mensaje
RoleMenuSchema.statics.findByMessage = function(messageId) {
  return this.findOne({ messageId }).lean();
};

export default mongoose.models.RoleMenu || mongoose.model('RoleMenu', RoleMenuSchema);