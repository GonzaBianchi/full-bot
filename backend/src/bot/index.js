import { Client, GatewayIntentBits, Partials } from 'discord.js';
import logger from '../utils/logger.js';
import ApiServer from '../api/index.js';
import { connect } from '../database/connection.js';
import dotenv from 'dotenv';
import User from '../models/User.js';
import { xpForLevel } from './utils/levelSystem.js';
import registerCommands from './commands/registerCommands.js';
import RoleMenu from '../models/RoleMenu.js';

dotenv.config();

class BotApp {
  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds, 
        GatewayIntentBits.GuildMessages, 
        GatewayIntentBits.MessageContent, 
        GatewayIntentBits.GuildMessageReactions,
      ],
      partials: [
        Partials.Channel, 
        Partials.Message, 
        Partials.Reaction,
      ]
    });

    this.api = new ApiServer(this.client);
    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.client.once('ready', async () => {
      logger.info(`Bot conectado como ${this.client.user.tag}`);

      // Attach levelSystem helper to client
      this.client.levelSystem = {
        getLeaderboard: async (guildId, limit = 10, page = 1) => {
          const skip = (page - 1) * limit;
          const users = await User.find({ guildId })
            .sort({ totalXp: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

          const total = await User.countDocuments({ guildId });

          const enriched = await Promise.all(users.map(async (u, idx) => {
            const rank = skip + idx + 1;
            let username = u.username || null;
            let discriminator = u.discriminator || null;
            let avatar = u.avatar || null;
            try {
              const dUser = await this.client.users.fetch(u.userId).catch(() => null);
              if (dUser) {
                username = dUser.username;
                discriminator = dUser.discriminator;
                avatar = dUser.displayAvatarURL({ dynamic: true, size: 128 });
              }
            } catch (e) {
              // ignore
            }

            const currentLevelTotal = xpForLevel(u.level);
            const nextLevelTotal = xpForLevel(u.level + 1);
            const xpIntoLevel = Math.max(0, u.totalXp - currentLevelTotal);
            const xpForNext = Math.max(0, nextLevelTotal - currentLevelTotal);

            const progress = {
              xp: xpIntoLevel,
              xpForNextLevel: xpForNext,
              percent: xpForNext > 0 ? Math.floor((xpIntoLevel / xpForNext) * 100) : 100
            };

            return {
              userId: u.userId,
              level: u.level,
              totalXp: u.totalXp,
              messageCount: u.messageCount,
              rank,
              username,
              discriminator,
              avatar,
              progress
            };
          }));

          return {
            users: enriched,
            total,
            pages: Math.max(1, Math.ceil(total / limit))
          };
        }
      };

      // Registrar handlers de events
      try {
        const msgHandler = (await import('./events/messageCreate.js')).default;
        this.client.on('messageCreate', msgHandler);

        const readyHandler = (await import('./events/ready.js')).default;
        if (readyHandler && readyHandler.name) {
          // ready event ya manejado
        }

        const interactionHandler = (await import('./events/interactionCreate.js')).default;
        if (interactionHandler && interactionHandler.name) {
          this.client.on(interactionHandler.name, (...args) => interactionHandler.execute(...args));
          logger.info('✅ Handler de interacciones registrado');
        }
      } catch (e) {
        logger.warn('No se pudieron registrar algunos handlers:', e.message);
        logger.error('Stack:', e.stack);
      }

      // Register slash commands
      try {
        const clientId = process.env.DISCORD_CLIENT_ID;
        const token = process.env.DISCORD_TOKEN;
        const devGuild = process.env.DEV_GUILD_ID || null;
        
        logger.info('Iniciando registro de comandos slash...');
        await registerCommands(clientId, token, devGuild);
        logger.info('✅ Slash commands registrados exitosamente');
      } catch (e) {
        logger.error('❌ Error registrando slash commands:', e.message);
        logger.error('Stack:', e.stack);
      }

      // Configurar partials adicionales
      this.client.options.partials = Array.from(new Set([
        ...(this.client.options.partials || []), 
        'MESSAGE', 
        'CHANNEL', 
        'REACTION'
      ]));

      // Setup reaction handlers
      this.setupReactionHandlers();
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT recibido en bot, cerrando...');
      await this.shutdown();
    });
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM recibido en bot, cerrando...');
      await this.shutdown();
    });
  }

  setupReactionHandlers() {
    // Handler para cuando se agrega una reacción
    this.client.on('messageReactionAdd', async (reaction, user) => {
      try {
        if (user.bot) return;

        if (reaction.partial) {
          try { 
            await reaction.fetch(); 
          } catch (e) { 
            logger.warn('Error fetching partial reaction:', e);
            return; 
          }
        }

        if (reaction.message.partial) {
          try { 
            await reaction.message.fetch(); 
          } catch (e) { 
            logger.warn('Error fetching partial message:', e);
            return; 
          }
        }

        const messageId = reaction.message.id;
        const menu = await RoleMenu.findOne({ messageId }).lean();
        if (!menu) return;

        const guild = reaction.message.guild || await this.client.guilds.fetch(menu.guildId).catch(() => null);
        if (!guild) {
          logger.warn(`Guild ${menu.guildId} no encontrado para role menu`);
          return;
        }

        const member = await guild.members.fetch({ user: user.id, force: true }).catch(() => null);
        if (!member) {
          logger.warn(`Member ${user.id} no encontrado en guild ${guild.id}`);
          return;
        }

        const emoji = reaction.emoji;
        const emojiKey = emoji.id ? `${emoji.name}:${emoji.id}` : emoji.name;

        const option = menu.options.find(o => {
          if (o.emojiIdentifier === emojiKey) return true;
          if (emoji.id && o.emojiId === emoji.id) return true;
          if (!emoji.id && o.emojiIdentifier === emoji.name) return true;
          
          const parts = o.emojiIdentifier.split(':');
          if (parts.length === 2 && parts[1] === emoji.id) return true;
          
          return false;
        });

        if (!option) return;

        if (!guild.members.me.permissions.has('ManageRoles')) {
          logger.warn(`Bot sin permiso ManageRoles en guild ${guild.id}`);
          return;
        }

        const role = guild.roles.cache.get(option.roleId) || await guild.roles.fetch(option.roleId).catch(() => null);
        if (!role) {
          logger.warn(`Rol ${option.roleId} no encontrado en guild ${guild.id}`);
          return;
        }

        const botMember = guild.members.me;
        if (botMember.roles.highest.comparePositionTo(role) <= 0) {
          logger.warn(`Bot no puede gestionar rol ${role.name} (jerarquía) en guild ${guild.id}`);
          return;
        }

        try {
          await member.roles.add(role.id, `Autorole: ${menu.title}`);
          logger.info(`Rol ${role.name} agregado a ${user.tag} en guild ${guild.name}`);
        } catch (e) {
          logger.error(`Error asignando rol ${role.name} a ${user.tag}:`, e);
          return;
        }

        if (menu.exclusive) {
          for (const other of menu.options) {
            if (other.roleId === option.roleId) continue;

            try {
              const otherRole = guild.roles.cache.get(other.roleId) || await guild.roles.fetch(other.roleId).catch(() => null);
              if (otherRole && member.roles.cache.has(otherRole.id)) {
                await member.roles.remove(otherRole.id, `Autorole exclusivo: ${menu.title}`);
                logger.info(`Rol ${otherRole.name} removido de ${user.tag} (modo exclusivo)`);
              }

              const msg = reaction.message;
              const otherReaction = msg.reactions.cache.find(r => {
                if (other.emojiId && r.emoji.id === other.emojiId) return true;
                if (!other.emojiId && r.emoji.name === other.emojiIdentifier) return true;
                
                const otherKey = r.emoji.id ? `${r.emoji.name}:${r.emoji.id}` : r.emoji.name;
                if (otherKey === other.emojiIdentifier) return true;
                
                return false;
              });

              if (otherReaction) {
                await otherReaction.users.remove(user.id).catch(err => {
                  logger.warn(`No se pudo remover reacción de ${user.tag}:`, err.message);
                });
              }
            } catch (e) {
              logger.warn(`Error procesando modo exclusivo para ${user.tag}:`, e);
            }
          }
        }
      } catch (e) {
        logger.error('Error en messageReactionAdd handler:', e);
      }
    });

    // Handler para cuando se remueve una reacción
    this.client.on('messageReactionRemove', async (reaction, user) => {
      try {
        if (user.bot) return;

        if (reaction.partial) {
          try { 
            await reaction.fetch(); 
          } catch (e) { 
            logger.warn('Error fetching partial reaction on remove:', e.message);
            return; 
          }
        }

        if (reaction.message.partial) {
          try { 
            await reaction.message.fetch(); 
          } catch (e) { 
            logger.warn('Error fetching partial message on remove:', e.message);
            return; 
          }
        }

        const messageId = reaction.message.id;
        const menu = await RoleMenu.findOne({ messageId }).lean();
        if (!menu) return;

        const guild = reaction.message.guild || await this.client.guilds.fetch(menu.guildId).catch(() => null);
        if (!guild) {
          logger.warn(`Guild ${menu.guildId} no encontrado para role menu`);
          return;
        }

        const member = await guild.members.fetch({ user: user.id, force: true }).catch(() => null);
        if (!member) {
          logger.warn(`Member ${user.id} no encontrado en guild ${guild.id}`);
          return;
        }

        const emoji = reaction.emoji;
        const emojiKey = emoji.id ? `${emoji.name}:${emoji.id}` : emoji.name;

        const option = menu.options.find(o => {
          if (o.emojiIdentifier === emojiKey) return true;
          if (emoji.id && o.emojiId === emoji.id) return true;
          if (!emoji.id && o.emojiIdentifier === emoji.name) return true;
          
          const parts = o.emojiIdentifier.split(':');
          if (parts.length === 2 && parts[1] === emoji.id) return true;
          
          return false;
        });

        if (!option) return;

        if (!guild.members.me.permissions.has('ManageRoles')) {
          logger.warn(`Bot sin permiso ManageRoles en guild ${guild.id}`);
          return;
        }

        const role = guild.roles.cache.get(option.roleId) || await guild.roles.fetch(option.roleId).catch(() => null);
        if (!role) {
          logger.warn(`Rol ${option.roleId} no encontrado en guild ${guild.id}`);
          return;
        }

        const botMember = guild.members.me;
        if (botMember.roles.highest.comparePositionTo(role) <= 0) {
          logger.warn(`Bot no puede gestionar rol ${role.name} (jerarquía) en guild ${guild.id}`);
          return;
        }

        // Verificar si el usuario tiene el rol ANTES de intentar removerlo
        if (!member.roles.cache.has(role.id)) {
          return;
        }

        try {
          await member.roles.remove(role.id, `Autorole removido: ${menu.title}`);
          logger.info(`✅ Rol ${role.name} removido de ${user.tag} en guild ${guild.name}`);
        } catch (e) {
          logger.error(`❌ Error removiendo rol ${role.name} de ${user.tag}:`, e.message);
        }
      } catch (e) {
        logger.error('Error en messageReactionRemove handler:', e);
      }
    });
  }

  async start() {
    const port = process.env.PORT || 3000;

    try {
      // 1. Conectar a MongoDB PRIMERO
      logger.info('Conectando a MongoDB...');
      await connect(process.env.MONGODB_URI);
      logger.info('✅ Conectado a MongoDB');
    } catch (e) {
      logger.error('❌ Error conectando a MongoDB:', e);
      process.exit(1);
    }

    try {
      // 2. Iniciar API Server ANTES que el bot (para que Render detecte el puerto)
      logger.info(`Iniciando API Server en puerto ${port}...`);
      await this.api.start(port);
      logger.info(`✅ API Server corriendo en puerto ${port}`);
    } catch (e) {
      logger.error('❌ Error iniciando API Server:', e);
      process.exit(1);
    }

    try {
      // 3. Finalmente, conectar el bot de Discord
      logger.info('Conectando bot de Discord...');
      await this.client.login(process.env.DISCORD_TOKEN);
      // El evento 'ready' se disparará automáticamente
    } catch (e) {
      logger.error('❌ Error conectando bot de Discord:', e);
      process.exit(1);
    }
  }

  async shutdown() {
    try {
      logger.info('Iniciando graceful shutdown...');
      
      if (this.client) {
        logger.info('Desconectando bot de Discord...');
        await this.client.destroy();
      }
      
      if (this.api) {
        logger.info('Cerrando API Server...');
        await this.api.shutdown();
      }
      
      logger.info('✅ Shutdown completo');
      process.exit(0);
    } catch (e) {
      logger.error('❌ Error en shutdown:', e);
      process.exit(1);
    }
  }
}

const app = new BotApp();
app.start().catch(err => {
  logger.error('❌ Error fatal al iniciar la aplicación:', err);
  process.exit(1);
});