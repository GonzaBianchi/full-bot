import { Events, PermissionsBitField } from 'discord.js';
import logger from '../../utils/logger.js';
import { getCommand } from '../commands/index.js';

const EPHEMERAL = 64;

/**
 * `setDefaultMemberPermissions` es solo un valor por defecto: el dueño del
 * servidor puede reabrir el comando a @everyone desde Ajustes → Integraciones.
 * Reaplicamos aquí la misma exigencia en tiempo de ejecución, leyendo lo que
 * el propio comando ya declara.
 */
function lacksRequiredPermissions(interaction, command) {
  const required = command.data?.default_member_permissions;
  if (!required || !interaction.inGuild()) return false;

  const needed = new PermissionsBitField(BigInt(required));
  return !interaction.memberPermissions?.has(needed);
}

async function handleAutocomplete(interaction) {
  const command = getCommand(interaction.commandName);

  if (!command?.autocomplete) {
    return interaction.respond([]).catch(() => {});
  }

  try {
    await command.autocomplete(interaction);
  } catch (error) {
    logger.error(`Error en autocomplete de /${interaction.commandName}:`, error);
    if (!interaction.responded) {
      await interaction.respond([]).catch(() => {});
    }
  }
}

async function replyWithError(interaction, content) {
  try {
    if (interaction.deferred) {
      await interaction.editReply({ content });
    } else if (!interaction.replied) {
      await interaction.reply({ content, flags: EPHEMERAL });
    } else {
      logger.warn('La interacción ya fue respondida, no se puede enviar mensaje de error');
    }
  } catch (replyError) {
    logger.error('No se pudo responder al error:', replyError);
  }
}

export default {
  name: Events.InteractionCreate,
  async execute(interaction) {
    if (interaction.isAutocomplete()) {
      return handleAutocomplete(interaction);
    }

    if (!interaction.isChatInputCommand()) return;

    const commandName = interaction.commandName;
    logger.info(`Comando recibido: /${commandName} de ${interaction.user.tag} en ${interaction.guild?.name || 'DM'}`);

    const command = getCommand(commandName);

    if (!command) {
      logger.warn(`Comando /${commandName} no encontrado`);
      if (!interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: `❌ El comando /${commandName} no está disponible.`,
          flags: EPHEMERAL
        }).catch(() => {});
      }
      return;
    }

    if (lacksRequiredPermissions(interaction, command)) {
      logger.warn(`${interaction.user.tag} intentó /${commandName} sin permisos suficientes en ${interaction.guild?.id}`);
      return interaction.reply({
        content: '❌ No tienes permisos para usar este comando.',
        flags: EPHEMERAL
      }).catch(() => {});
    }

    try {
      await command.execute(interaction);
      logger.info(`Comando /${commandName} ejecutado exitosamente`);
    } catch (error) {
      logger.error(`Error ejecutando comando /${commandName}:`, error);
      logger.error('Stack:', error.stack);

      const errorMessage = process.env.NODE_ENV === 'development'
        ? `❌ Error: ${error.message}`
        : '❌ Hubo un error al ejecutar este comando.';

      await replyWithError(interaction, errorMessage);
    }
  }
};
