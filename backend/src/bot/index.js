import { Client, GatewayIntentBits, Partials } from 'discord.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

import logger from '../utils/logger.js';
import ApiServer from '../api/index.js';
import { connect } from '../database/connection.js';
import { loadRoleMenuIndex } from '../utils/roleMenuIndex.js';
import BirthdayChecker from '../services/birthdayChecker.js';

import { loadCommands } from './commands/index.js';
import registerCommands from './commands/registerCommands.js';

import onMessageCreate from './events/messageCreate.js';
import readyEvent, { stopPresenceRotation } from './events/ready.js';
import interactionCreateEvent from './events/interactionCreate.js';
import guildMemberAddEvent from './events/guildMemberAdd.js';
import guildCreateEvent from './events/guildCreate.js';
import { setupAchievementTracking } from './events/achievementTracking.js';
import { registerRoleMenuReactions } from './events/roleMenuReactions.js';

dotenv.config();

class BotApp {
  constructor() {
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildPresences
      ],
      partials: [
        Partials.Channel,
        Partials.Message,
        Partials.Reaction,
        Partials.GuildMember
      ]
    });

    this.api = new ApiServer(this.client);
    this.birthdayChecker = null;
    this.shuttingDown = false;

    this.registerProcessHandlers();
    this.registerClientEvents();
  }

  /**
   * Único punto donde se atienden señales y fallos no capturados.
   * Antes SIGINT/SIGTERM estaban registrados aquí Y en ApiServer, así que el
   * apagado se ejecutaba dos veces en paralelo.
   */
  registerProcessHandlers() {
    process.on('SIGINT', () => this.shutdown('SIGINT'));
    process.on('SIGTERM', () => this.shutdown('SIGTERM'));

    process.on('unhandledRejection', (reason) => {
      logger.error('Promesa rechazada sin manejar:', reason?.stack || reason);
    });

    process.on('uncaughtException', (err) => {
      logger.error('Excepción no capturada:', err?.stack || err);
      this.shutdown('uncaughtException', 1);
    });

    mongoose.connection.on('error', (err) => logger.error('Error de conexión con MongoDB:', err?.message || err));
    mongoose.connection.on('disconnected', () => logger.warn('MongoDB desconectado'));
    mongoose.connection.on('reconnected', () => logger.info('MongoDB reconectado'));
  }

  /**
   * Tabla de eventos en un solo sitio, en vez de nueve bloques
   * `await import()` + try/catch prácticamente idénticos dentro de `ready`.
   */
  registerClientEvents() {
    const events = [
      { name: 'error', handler: (err) => logger.error('Error del cliente de Discord:', err?.message || err) },
      { name: 'shardError', handler: (err) => logger.error('Error de shard:', err?.message || err) },
      { name: 'invalidated', handler: () => {
        logger.error('Sesión de Discord invalidada, cerrando');
        this.shutdown('invalidated', 1);
      } },
      { name: readyEvent.name, once: true, handler: (client) => this.onReady(client) },
      { name: 'messageCreate', handler: onMessageCreate },
      { name: interactionCreateEvent.name, handler: (...args) => interactionCreateEvent.execute(...args) },
      { name: guildMemberAddEvent.name, handler: (member) => guildMemberAddEvent.execute(member) },
      { name: guildCreateEvent.name, handler: (guild) => guildCreateEvent.execute(guild, this.client) },
    ];

    for (const { name, once, handler } of events) {
      if (once) this.client.once(name, handler);
      else this.client.on(name, handler);
    }

    setupAchievementTracking(this.client);
    registerRoleMenuReactions(this.client);

    logger.info(`${events.length} listeners de Discord registrados`);
  }

  async onReady(client) {
    await readyEvent.execute(client);

    try {
      this.birthdayChecker = new BirthdayChecker(client);
      this.birthdayChecker.start();
    } catch (e) {
      logger.error('Error iniciando birthday checker:', e);
    }

    try {
      await registerCommands(process.env.DISCORD_CLIENT_ID, process.env.DISCORD_TOKEN, process.env.DEV_GUILD_ID || null);
    } catch (e) {
      logger.error('Error registrando slash commands:', e.message);
    }
  }

  async start() {
    const port = process.env.PORT || 3000;

    try {
      logger.info('Conectando a MongoDB...');
      await connect(process.env.MONGODB_URI);
    } catch (e) {
      logger.error('Error conectando a MongoDB:', e);
      process.exit(1);
    }

    // Los comandos se cargan una sola vez, antes de aceptar interacciones.
    await loadCommands();
    await loadRoleMenuIndex();

    try {
      logger.info(`Iniciando API Server en puerto ${port}...`);
      await this.api.start(port);
    } catch (e) {
      logger.error('Error iniciando API Server:', e);
      process.exit(1);
    }

    try {
      logger.info('Conectando bot de Discord...');
      await this.client.login(process.env.DISCORD_TOKEN);
    } catch (e) {
      logger.error('Error conectando bot de Discord:', e);
      process.exit(1);
    }
  }

  /**
   * Cierre ordenado: cron → Discord → HTTP → Mongoose. Antes el cliente se
   * destruía dos veces y un `process.exit` forzado a los 500 ms competía con
   * el del propio shutdown, dejando la conexión a Mongo sin cerrar.
   */
  async shutdown(signal = 'shutdown', code = 0) {
    if (this.shuttingDown) return;
    this.shuttingDown = true;

    logger.info(`${signal} recibido, cerrando...`);

    try {
      stopPresenceRotation();

      if (this.birthdayChecker) {
        this.birthdayChecker.stop();
      }

      if (this.client) {
        await this.client.destroy();
        logger.info('Cliente de Discord desconectado');
      }

      await this.api.shutdown();

      await mongoose.connection.close();
      logger.info('Conexión con MongoDB cerrada');

      logger.info('Shutdown completo');
    } catch (e) {
      logger.error('Error en shutdown:', e);
      code = code || 1;
    }

    process.exit(code);
  }
}

const app = new BotApp();
app.start().catch(err => {
  logger.error('Error fatal al iniciar la aplicación:', err);
  process.exit(1);
});
