import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { assignColorRoles } from '../../utils/roleManager.js';

export const data = new SlashCommandBuilder()
    .setName('sincronizarolesmiembros')
    .setDescription('Asigna todos los roles decorativos a cada usuario actual del servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export async function execute(interaction) {
    await interaction.deferReply();    try {
        const guild = interaction.guild;
        const members = await guild.members.fetch();
        let totalRolesAdded = 0;
        let membersUpdated = 0;
        let errorCount = 0;
        let skippedBots = 0;

        await interaction.editReply('Comenzando sincronización de roles decorativos...');

        for (const [, member] of members) {
            try {
                if (member.user.bot && member.roles.cache.some(role => role.name === 'Bots')) {
                    skippedBots++;
                    continue;
                }

                const rolesAdded = await assignColorRoles(member);
                if (rolesAdded > 0) {
                    totalRolesAdded += rolesAdded;
                    membersUpdated++;
                }
            } catch (error) {
                console.error(`Error asignando roles a ${member.user.tag}:`, error);
                errorCount++;
            }
        }        // Mensaje final usando followUp para evitar error de token inválido
        await interaction.followUp(
            `Sincronización completada:\n` +
            `✅ ${membersUpdated} miembros actualizados\n` +
            `📊 ${totalRolesAdded} roles agregados en total\n` +
            `🤖 ${skippedBots} bots ignorados\n` +
            `${errorCount > 0 ? `❌ ${errorCount} errores encontrados\n` : ''}`
        );
    } catch (error) {
        console.error('Error en comando sincronizaroles:', error);
        await interaction.followUp('❌ Ocurrió un error durante la sincronización de roles.');
    }
}
