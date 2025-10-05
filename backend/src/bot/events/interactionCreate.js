import { Events } from 'discord.js';
import logger from '../../utils/logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (!interaction.isChatInputCommand()) return;

    const commandName = interaction.commandName;
    logger.info(`Comando recibido: /${commandName} de ${interaction.user.tag} en ${interaction.guild?.name || 'DM'}`);

    try {
      // Cargar el comando dinámicamente
      const commandsPath = path.resolve(__dirname, '../commands');
      const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
      
      let commandModule = null;
      for (const file of commandFiles) {
        const filePath = path.join(commandsPath, file);
        const cmd = await import(`file://${filePath}`);
        if (cmd.default && cmd.default.data && cmd.default.data.name === commandName) {
          commandModule = cmd.default;
          break;
        }
      }

      if (!commandModule) {
        logger.warn(`Comando /${commandName} no encontrado`);
        return await interaction.reply({
          content: `❌ El comando /${commandName} no está disponible.`,
          ephemeral: true
        });
      }

      // Ejecutar el comando
      await commandModule.execute(interaction);
      logger.info(`Comando /${commandName} ejecutado exitosamente`);

    } catch (error) {
      logger.error(`Error ejecutando comando /${commandName}:`, error);
      logger.error('Stack:', error.stack);

      const errorMessage = process.env.NODE_ENV === 'development'
        ? `❌ Error: ${error.message}`
        : '❌ Hubo un error al ejecutar este comando.';

      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ content: errorMessage });
        } else {
          await interaction.reply({ content: errorMessage, ephemeral: true });
        }
      } catch (replyError) {
        logger.error('No se pudo responder al error:', replyError);
      }
    }
  }
};