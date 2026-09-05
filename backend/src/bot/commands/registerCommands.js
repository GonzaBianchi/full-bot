import { REST, Routes } from 'discord.js';
import logger from '../../utils/logger.js';
import { loadCommands } from './index.js';

/**
 * Registra en Discord los comandos que el bot realmente puede ejecutar.
 * Antes había una allowlist hardcodeada aquí y un escaneo del directorio en
 * interactionCreate: las dos listas podían divergir (y divergían).
 */
export default async function registerCommands(clientId, token, guildId = null) {
  const collection = await loadCommands();
  const commands = [...collection.values()].map(cmd => cmd.data.toJSON());

  logger.info(`Total de comandos a registrar: ${commands.length}`);

  if (commands.length === 0) {
    logger.error('❌ No hay comandos para registrar');
    return;
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    logger.info('Registrando comandos en Discord...');

    if (guildId) {
      logger.info(`Registrando comandos en guild específico: ${guildId}`);
      const result = await rest.put(
        Routes.applicationGuildCommands(clientId, guildId),
        { body: commands }
      );
      logger.info(`✅ ${result.length} comandos registrados en guild ${guildId}`);
    } else {
      logger.info('Registrando comandos globalmente (puede tomar hasta 1 hora)');
      const result = await rest.put(
        Routes.applicationCommands(clientId),
        { body: commands }
      );
      logger.info(`✅ ${result.length} comandos registrados globalmente`);
    }

    commands.forEach(cmd => {
      logger.info(`  - /${cmd.name}: ${cmd.description}`);
    });
  } catch (e) {
    logger.error('❌ Error registrando comandos en Discord API:', e.message);
    if (e.code) logger.error('Error code:', e.code);
    if (e.status) logger.error('HTTP status:', e.status);
    logger.error('Stack:', e.stack);
    throw e;
  }
}
