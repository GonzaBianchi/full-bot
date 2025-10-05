import { Client, GatewayIntentBits, Partials } from 'discord.js';
import logger from '../utils/logger.js';
import ApiServer from '../api/index.js';
import { connect } from '../database/connection.js';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User.js';
import { xpForLevel, xpToNextLevel } from './utils/levelSystem.js';
import registerCommands from './commands/registerCommands.js';
import RoleMenu from '../models/RoleMenu.js';

dotenv.config();

class BotApp {
  constructor() {
    this.client = new Client({
      intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
      partials: [Partials.Channel, Partials.Message]
    });

    // attach simple levelSystem helper to client later in ready
    this.api = new ApiServer(this.client);

    this.setupEventHandlers();
  }

  setupEventHandlers() {
    this.client.once('ready', async () => {
      logger.info(`Bot conectado como ${this.client.user.tag}`);
      const port = process.env.PORT || 3000;
      try {
        await connect(process.env.MONGODB_URI);
      } catch (e) {
        logger.error('Error conectando a MongoDB:', e);
      }

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

          // enrich minimal data and compute rank and progress
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

            // compute xp progress based on totalXp and level
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

      // Registrar handlers de events en carpeta events
      try {
        // dynamic import para mantener modularidad
        const msgHandler = (await import('./events/messageCreate.js')).default;
        this.client.on('messageCreate', msgHandler);

        const readyHandler = (await import('./events/ready.js')).default;
        if (readyHandler && readyHandler.name) {
          // ready event ya es manejado por listener once, pero mantenemos import por si tiene lógica adicional
          // no volveremos a registrar readyHandler.execute para evitar duplicados
        }

        // IMPORTANTE: Registrar handler de interacciones (comandos slash)
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

      // Ensure partials include MESSAGE, CHANNEL, REACTION
      this.client.options.partials = Array.from(new Set([...(this.client.options.partials || []), 'MESSAGE', 'CHANNEL', 'REACTION']));

      this.client.on('messageReactionAdd', async (reaction, user) => {
        try {
          if (user.bot) return;
          // Fetch partials
          if (reaction.partial) {
            try { await reaction.fetch(); } catch (e) { return; }
          }

          const messageId = reaction.message.id;
          const menu = await RoleMenu.findOne({ messageId }).lean();
          if (!menu) return;

          const guild = reaction.message.guild || await this.client.guilds.fetch(menu.guildId).catch(() => null);
          if (!guild) return;

          const member = await guild.members.fetch(user.id).catch(() => null);
          if (!member) return;

          // Determine emoji key
          const emoji = reaction.emoji;
          const emojiKey = emoji.id ? `${emoji.name}:${emoji.id}` : emoji.name;

          const option = menu.options.find(o => o.emojiIdentifier === emojiKey || o.emojiIdentifier === emoji.name || o.emojiId === emoji.id);
          if (!option) return;

          // Add role
          try {
            const role = guild.roles.cache.get(option.roleId) || await guild.roles.fetch(option.roleId).catch(() => null);
            if (!role) return;
            if (!guild.me.permissions.has('MANAGE_ROLES')) return;
            // Check role hierarchy
            const botMember = guild.me;
            if (botMember.roles.highest.comparePositionTo(role) <= 0) return;

            await member.roles.add(role.id, `Autorole reaction: ${emojiKey}`);
          } catch (e) {
            logger.warn('Error asignando rol por reaction autorole:', e);
          }

          // If exclusive, remove other roles from this menu and remove their reactions for this user
          if (menu.exclusive) {
            for (const other of menu.options) {
              if (other.roleId === option.roleId) continue;
              try {
                const otherRole = guild.roles.cache.get(other.roleId) || await guild.roles.fetch(other.roleId).catch(() => null);
                if (!otherRole) continue;
                if (member.roles.cache.has(otherRole.id)) {
                  await member.roles.remove(otherRole.id, `Autorole exclusive: removing other roles`);
                }
                // Remove user's reaction for the other emoji
                const msg = reaction.message;
                const otherEmojiKey = other.emojiIdentifier.includes(':') ? other.emojiIdentifier.split(':')[1] : other.emojiIdentifier;
                const reacted = msg.reactions.cache.find(r => (r.emoji.id ? r.emoji.id === other.emojiId : r.emoji.name === other.emojiIdentifier || r.emoji.name === other.emojiIdentifier.split(':')[0]));
                if (reacted) {
                  await reacted.users.remove(user.id).catch(() => null);
                }
              } catch (e) {
                logger.warn('Error removiendo roles/ reacciones en autorole exclusive:', e);
              }
            }
          }
        } catch (e) {
          logger.error('Error en messageReactionAdd autorole handler:', e);
        }
      });

      this.client.on('messageReactionRemove', async (reaction, user) => {
        try {
          if (user.bot) return;
          if (reaction.partial) {
            try { await reaction.fetch(); } catch (e) { return; }
          }

          const messageId = reaction.message.id;
          const menu = await RoleMenu.findOne({ messageId }).lean();
          if (!menu) return;

          const guild = reaction.message.guild || await this.client.guilds.fetch(menu.guildId).catch(() => null);
          if (!guild) return;

          const member = await guild.members.fetch(user.id).catch(() => null);
          if (!member) return;

          const emoji = reaction.emoji;
          const emojiKey = emoji.id ? `${emoji.name}:${emoji.id}` : emoji.name;

          const option = menu.options.find(o => o.emojiIdentifier === emojiKey || o.emojiIdentifier === emoji.name || o.emojiId === emoji.id);
          if (!option) return;

          // If user removed their reaction, remove the role (if it's not exclusive with other constraints)
          try {
            const role = guild.roles.cache.get(option.roleId) || await guild.roles.fetch(option.roleId).catch(() => null);
            if (!role) return;
            if (!guild.me.permissions.has('MANAGE_ROLES')) return;
            const botMember = guild.me;
            if (botMember.roles.highest.comparePositionTo(role) <= 0) return;

            await member.roles.remove(role.id, `Autorole reaction removed: ${emojiKey}`);
          } catch (e) {
            logger.warn('Error removiendo rol por reaction remove en autorole:', e);
          }
        } catch (e) {
          logger.error('Error en messageReactionRemove autorole handler:', e);
        }
      });

      await this.api.start(port);
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

  async start() {
    await this.client.login(process.env.DISCORD_TOKEN);
  }

  async shutdown() {
    try {
      if (this.client) await this.client.destroy();
      if (this.api) await this.api.shutdown();
      if (connect && connect.close) await connect.close();
      logger.info('Shutdown completo');
      process.exit(0);
    } catch (e) {
      logger.error('Error en shutdown del bot:', e);
      process.exit(1);
    }
  }
}

const app = new BotApp();
app.start();