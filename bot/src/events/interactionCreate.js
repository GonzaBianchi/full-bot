import { InteractionType } from 'discord.js';

export default {
  name: 'interactionCreate',
  async execute(interaction, client) {
    try {
      if (interaction.type !== InteractionType.ApplicationCommand) return;

      const command = client.commands.get(interaction.commandName);
      if (!command) {
        return interaction.reply({ content: 'Comando no encontrado.', ephemeral: true });
      }

      // Log para debug
      console.log(`[INTERACTION] Ejecutando comando: ${interaction.commandName} por ${interaction.user.tag}`);

      await command.execute(interaction, client);
    } catch (error) {
      console.error('Error en interactionCreate:', error);
      // Intenta responder solo si no se respondió antes
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({ content: 'Ocurrió un error al ejecutar el comando.', ephemeral: true });
      } else {
        await interaction.reply({ content: 'Ocurrió un error al ejecutar el comando.', ephemeral: true });
      }
    }
  }
};
