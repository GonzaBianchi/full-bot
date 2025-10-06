import fs from 'fs';
import path from 'path';
import { REST, Routes } from 'discord.js';
import logger from '../../utils/logger.js';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default async function registerCommands(clientId, token, guildId = null) {
  const commands = [];
  const commandsPath = path.resolve(__dirname, '../commands');

  logger.info(`Buscando comandos en: ${commandsPath}`);

  // Comandos aprobados para registro
  const allowedFiles = [
    'adminSetLevel.js', 
    'sumarxp.js', 
    'restarxp.js', 
    'leaderboard.js', 
    'rank.js',
    'logros.js',
    'testlogro.js',
    'botinfo.js',
    'serverconfig.js',
    'userhelp.js',      // NUEVO: Help para usuarios
    'adminhelp.js'      // NUEVO: Help para admins
  ];

  for (const file of allowedFiles) {
    try {
      const full = path.join(commandsPath, file);
      if (!fs.existsSync(full)) {
        logger.warn(`Archivo de comando no encontrado: ${file}`);
        continue;
      }

      // Importar con file:// protocol para ES modules
      const cmd = await import(`file://${full}`);
      
      if (cmd && cmd.default && cmd.default.data) {
        const cmdData = cmd.default.data.toJSON();
        commands.push(cmdData);
        logger.info(`✅ Comando cargado: ${cmdData.name}`);
      } else {
        logger.warn(`⚠️ Formato inválido en: ${file}`);
      }
    } catch (e) {
      logger.error(`❌ Error cargando comando ${file}:`, e.message);
      logger.error('Stack:', e.stack);
    }
  }

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

    // Log de comandos registrados
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