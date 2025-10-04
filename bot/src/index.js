
import { Client, Collection, GatewayIntentBits, Partials } from 'discord.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import './keepalive.js';
import { connectDB } from './utils/db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction]
});

client.commands = new Collection();

// Cargar comandos (incluyendo subcarpetas como admin)
function getAllCommandFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir, { withFileTypes: true });
  for (const file of list) {
    const filePath = path.join(dir, file.name);
    if (file.isDirectory()) {
      results = results.concat(getAllCommandFiles(filePath));
    } else if (file.isFile() && file.name.endsWith('.js')) {
      results.push(filePath);
    }
  }
  return results;
}

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = getAllCommandFiles(commandsPath);
for (const filePath of commandFiles) {
  // Obtener ruta relativa para import dinámico
  const relPath = './' + path.relative(__dirname, filePath).replace(/\\/g, '/');
  const command = await import(relPath);
  if (command.data && command.execute) {
    client.commands.set(command.data.name, command);
  } else if (command.default && command.default.data && command.default.execute) {
    client.commands.set(command.default.data.name, command.default);
  }
}

// Cargar eventos
const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
  const eventModule = await import(`./events/${file}`);
  const event = eventModule.default || eventModule;
  if (typeof event === 'function') {
    event(client);
  } else if (event.name && event.execute) {
    if (event.once) {
      client.once(event.name, (...args) => event.execute(...args, client));
    } else {
      client.on(event.name, (...args) => event.execute(...args, client));
    }
  }
}

// Handler para slash commands
client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  const command = client.commands.get(interaction.commandName);
  if (!command) return;
  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(error);
    await interaction.reply({ content: 'Ocurrió un error al ejecutar el comando.', ephemeral: true });
  }
});

// Conectar a la base de datos y loguear el bot
connectDB().then(() => {
  client.login(process.env.DISCORD_TOKEN);
});
