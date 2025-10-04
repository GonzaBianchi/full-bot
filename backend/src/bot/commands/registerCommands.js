import fs from 'fs';
import path from 'path';
import { REST, Routes } from 'discord.js';

export default async function registerCommands(clientId, token, guildId = null) {
  const commands = [];
  const commandsPath = path.resolve('./src/bot/commands');
  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

  for (const file of files) {
    const cmd = await import(path.join(commandsPath, file));
    if (cmd && cmd.default && cmd.default.data) {
      commands.push(cmd.default.data.toJSON());
    }
  }

  const rest = new REST({ version: '10' }).setToken(token);

  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
  }
}