import { Client, GatewayIntentBits, Partials } from 'discord.js';
import logger from '../utils/logger.js';
import ApiServer from '../api/index.js';
import { connect } from '../database/connection.js';
import dotenv from 'dotenv';
import path from 'path';
import User from '../models/User.js';
import { xpForLevel, xpToNextLevel } from './utils/levelSystem.js';
import registerCommands from './commands/registerCommands.js';

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
      } catch (e) {
        logger.warn('No se pudieron registrar algunos handlers:', e.message);
      }

      // Register slash commands
      try {
        const clientId = process.env.DISCORD_CLIENT_ID;
        const token = process.env.DISCORD_TOKEN;
        const devGuild = process.env.DEV_GUILD_ID || null;
        await registerCommands(clientId, token, devGuild);
        logger.info('Slash commands registrados');
      } catch (e) {
        logger.warn('Error registrando slash commands:', e.message);
      }

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
