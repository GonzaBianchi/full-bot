import fs from 'fs';
import path from 'path';
import { REST, Routes } from 'discord.js';
import logger from '../../utils/logger.js';

export default async function registerCommands(clientId, token, guildId = null) {
  const commands = [];
  const commandsPath = path.resolve('./src/bot/commands');

  // Only register the approved commands
  const allowedFiles = ['adminSetLevel.js', 'sumarxp.js', 'restarxp.js', 'leaderboard.js', 'rank.js'];

  for (const file of allowedFiles) {
    try {
      const full = path.join(commandsPath, file);
      if (!fs.existsSync(full)) continue;
      const cmd = await import(full);
      if (cmd && cmd.default && cmd.default.data) {
        commands.push(cmd.default.data.toJSON());
      }
    } catch (e) {
      logger.warn('Error cargando comando', file, e?.message || e);
    }
  }

  const rest = new REST({ version: '10' }).setToken(token);

  try {
    if (guildId) {
      await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
    } else {
      await rest.put(Routes.applicationCommands(clientId), { body: commands });
    }
  } catch (e) {
    logger.error('Error registrando comandos:', e?.message || e);
  }
}