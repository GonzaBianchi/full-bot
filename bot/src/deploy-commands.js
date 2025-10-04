import { REST, Routes } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const commands = [];
const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = await import(`./commands/${file}`);
  if (command.default && command.default.data) {
    commands.push(command.default.data.toJSON());
  }
}

const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

try {
  console.log('⏳ Refrescando (registrando) los comandos de aplicación...');
  await rest.put(
    Routes.applicationCommands(process.env.DISCORD_CLIENT_ID),
    { body: commands },
  );
  console.log('✅ Comandos registrados correctamente.');
} catch (error) {
  console.error(error);
}
