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
    // Manejar autocomplete
    if (interaction.isAutocomplete()) {
      const commandName = interaction.commandName;
      
      try {
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

        if (commandModule && commandModule.autocomplete) {
          await commandModule.autocomplete(interaction);
        } else {
          logger.warn(`Comando ${commandName} no tiene función autocomplete`);
          await interaction.respond([]);
        }
      } catch (error) {
        logger.error(`Error en autocomplete de /${commandName}:`, error);
        // No responder de nuevo si ya se respondió
        if (!interaction.responded) {
          try {
            await interaction.respond([]);
          } catch (e) {
            // Ignorar error si ya fue respondido
          }
        }
      }
      return; // IMPORTANTE: Salir aquí para no continuar con el manejo de comandos
    }

    // Manejar comandos slash
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
        // No responder si ya fue respondido
        if (!interaction.replied && !interaction.deferred) {
          return await interaction.reply({
            content: `❌ El comando /${commandName} no está disponible.`,
            flags: 64 // ephemeral
          });
        }
        return;
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
        // Verificar si ya fue respondido
        if (interaction.deferred) {
          await interaction.editReply({ content: errorMessage });
        } else if (!interaction.replied) {
          await interaction.reply({ 
            content: errorMessage, 
            flags: 64 // ephemeral
          });
        } else {
          logger.warn('La interacción ya fue respondida, no se puede enviar mensaje de error');
        }
      } catch (replyError) {
        logger.error('No se pudo responder al error:', replyError);
      }
    }
  }
};