// Evento que se dispara cuando un nuevo miembro se une al servidor
import { assignColorRoles } from '../utils/roleManager.js';

export default async function(member) {
    try {
        // Intentar asignar los roles de colores y el de Bandidos al nuevo miembro
        await assignColorRoles(member);
    } catch (error) {
        console.error(`Error asignando roles a nuevo miembro ${member.user.tag}:`, error);
    }
}
