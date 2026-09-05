import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { Collection } from 'discord.js';
import logger from '../../utils/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Archivos de esta carpeta que no son comandos.
const NOT_COMMANDS = new Set(['index.js', 'registerCommands.js']);

let commands = null;

/**
 * Carga el directorio de comandos una sola vez y devuelve la colección.
 * Antes cada interacción (y cada pulsación de autocomplete) hacía un
 * readdirSync bloqueante y recorría importando los 14 ficheros.
 */
export async function loadCommands() {
  if (commands) return commands;

  const collection = new Collection();
  const entries = await fs.readdir(__dirname);
  const files = entries.filter(f => f.endsWith('.js') && !NOT_COMMANDS.has(f)).sort();

  for (const file of files) {
    try {
      const mod = await import(pathToFileURL(path.join(__dirname, file)).href);
      const command = mod.default;

      if (!command?.data?.name || typeof command.execute !== 'function') {
        logger.warn(`Formato de comando inválido en ${file}, se omite`);
        continue;
      }

      if (collection.has(command.data.name)) {
        logger.warn(`Comando duplicado /${command.data.name} en ${file}, se omite`);
        continue;
      }

      collection.set(command.data.name, command);
    } catch (e) {
      logger.error(`Error cargando el comando ${file}:`, e?.message || e);
    }
  }

  commands = collection;
  logger.info(`${collection.size} comandos cargados: ${[...collection.keys()].map(n => `/${n}`).join(', ')}`);
  return commands;
}

/** Colección ya cargada (vacía si aún no se llamó a loadCommands). */
export function getCommands() {
  return commands ?? new Collection();
}

export function getCommand(name) {
  return commands?.get(name) ?? null;
}

export default { loadCommands, getCommands, getCommand };
